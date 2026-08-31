import { PrismaClient, PaymentStatus, RideStatus } from '@prisma/client';
import { stripe } from '../utils/stripe';

const prisma = new PrismaClient();

export class PaymentService {
  /**
   * Enforces valid state transitions for Payments.
   */
  static isValidTransition(current: PaymentStatus, target: PaymentStatus): boolean {
    const transitions: Record<PaymentStatus, PaymentStatus[]> = {
      [PaymentStatus.PENDING]: [PaymentStatus.AUTHORIZED, PaymentStatus.COMPLETED, PaymentStatus.FAILED],
      [PaymentStatus.AUTHORIZED]: [PaymentStatus.COMPLETED, PaymentStatus.FAILED, PaymentStatus.REFUNDED],
      [PaymentStatus.COMPLETED]: [PaymentStatus.REFUNDED],
      [PaymentStatus.FAILED]: [],
      [PaymentStatus.REFUNDED]: []
    };
    return current === target || (transitions[current] || []).includes(target);
  }

  /**
   * Create or update payment status checking transition safety.
   */
  static async updatePaymentStatus(paymentId: string, targetStatus: PaymentStatus, transactionId?: string) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId }
      });

      if (!payment) {
        throw new Error('PAYMENT_NOT_FOUND');
      }

      if (!this.isValidTransition(payment.status, targetStatus)) {
        throw new Error(`INVALID_PAYMENT_TRANSITION: Cannot transition from ${payment.status} to ${targetStatus}`);
      }

      const updateData: any = { status: targetStatus };
      if (transactionId) {
        updateData.transactionId = transactionId;
      }

      return tx.payment.update({
        where: { id: paymentId },
        data: updateData
      });
    });
  }

  /**
   * Create a pre-authorization hold PaymentIntent for a ride.
   */
  static async createOrder(userId: string, rideId: string, paymentMethodId: string) {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { customer: true }
    });

    if (!ride) {
      throw new Error('RIDE_NOT_FOUND');
    }

    if (ride.customer.userId !== userId) {
      throw new Error('UNAUTHORIZED_RIDE_OWNER');
    }

    // Prevent duplicate active payments
    const existingPayment = await prisma.payment.findFirst({
      where: {
        rideId,
        status: { in: [PaymentStatus.AUTHORIZED, PaymentStatus.COMPLETED] }
      }
    });

    if (existingPayment) {
      throw new Error('PAYMENT_ALREADY_EXISTS');
    }

    // Retrieve or create Stripe customer
    let stripeCustomerId = ride.customer.stripeCustomerId;
    if (!stripeCustomerId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const stripeCustomer = await stripe.customers.create({
        email: user?.email || '',
        metadata: { userId, customerId: ride.customer.id }
      });
      stripeCustomerId = stripeCustomer.id;
      await prisma.customer.update({
        where: { id: ride.customer.id },
        data: { stripeCustomerId }
      });
    }

    // Authoritative amount from the backend (converted to paise integer minor unit)
    const amountInPaise = Math.round(ride.fare * 100);

    // Create Stripe PaymentIntent with capture_method: manual
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPaise,
      currency: 'inr',
      customer: stripeCustomerId,
      payment_method: paymentMethodId,
      capture_method: 'manual',
      confirm: true,
      off_session: false,
      return_url: 'http://localhost:3000/api/customer/payments/confirm'
    });

    const isAuthorized = paymentIntent.status === 'requires_capture';
    const initialPayStatus = isAuthorized ? PaymentStatus.AUTHORIZED : PaymentStatus.PENDING;

    const payment = await prisma.$transaction(async (tx) => {
      // Clean up previous unsuccessful payments
      await tx.payment.deleteMany({
        where: {
          rideId,
          status: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] }
        }
      });

      const newPayment = await tx.payment.create({
        data: {
          rideId,
          amount: ride.fare,
          provider: 'STRIPE',
          transactionId: paymentIntent.id,
          status: initialPayStatus
        }
      });

      if (isAuthorized && ride.status === RideStatus.REQUESTED) {
        await tx.ride.update({
          where: { id: rideId },
          data: { status: RideStatus.SEARCHING_DRIVER }
        });

        await tx.rideStatusHistory.create({
          data: {
            rideId,
            status: RideStatus.SEARCHING_DRIVER
          }
        });
      }

      return newPayment;
    });

    return {
      paymentId: payment.id,
      amount: payment.amount,
      status: payment.status,
      transactionId: payment.transactionId,
      clientSecret: paymentIntent.status === 'requires_action' ? paymentIntent.client_secret : null,
      requiresAction: paymentIntent.status === 'requires_action'
    };
  }

  /**
   * Verify the status of a payment against Stripe and local DB.
   */
  static async verifyPayment(userId: string, paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { ride: { include: { customer: true } } }
    });

    if (!payment) {
      throw new Error('PAYMENT_NOT_FOUND');
    }

    if (payment.ride.customer.userId !== userId) {
      throw new Error('UNAUTHORIZED_PAYMENT_ACCESS');
    }

    if (!payment.transactionId) {
      return payment;
    }

    // Retrieve state from Stripe
    const intent = await stripe.paymentIntents.retrieve(payment.transactionId);

    let targetStatus = payment.status;
    if (intent.status === 'requires_capture') {
      targetStatus = PaymentStatus.AUTHORIZED;
    } else if (intent.status === 'succeeded') {
      targetStatus = PaymentStatus.COMPLETED;
    } else if (intent.status === 'canceled') {
      targetStatus = PaymentStatus.FAILED;
    }

    if (targetStatus !== payment.status) {
      return this.updatePaymentStatus(paymentId, targetStatus);
    }

    return payment;
  }

  /**
   * Capture a pre-authorized payment hold on ride completion.
   */
  static async capturePayment(rideId: string) {
    const payment = await prisma.payment.findFirst({
      where: { rideId, status: { in: [PaymentStatus.AUTHORIZED, PaymentStatus.PENDING] } }
    });

    if (!payment) {
      return null;
    }

    if (payment.provider === 'STRIPE') {
      if (payment.status !== PaymentStatus.AUTHORIZED || !payment.transactionId) {
        return null;
      }
      try {
        const amountInPaise = Math.round(payment.amount * 100);
        await stripe.paymentIntents.capture(payment.transactionId, {
          amount_to_capture: amountInPaise
        }, {
          idempotencyKey: `capture-${rideId}`
        });

        return this.updatePaymentStatus(payment.id, PaymentStatus.COMPLETED);
      } catch (err: any) {
        console.error('Failed to capture Stripe hold:', err.message);
        await this.updatePaymentStatus(payment.id, PaymentStatus.FAILED).catch(() => {});
        throw err;
      }
    } else if (payment.provider === 'CASH' || payment.provider === 'UPI') {
      return this.updatePaymentStatus(payment.id, PaymentStatus.COMPLETED);
    }

    return null;
  }

  /**
   * Revert / Cancel an authorized hold on cancellation or timeout.
   */
  static async cancelPayment(rideId: string) {
    const payment = await prisma.payment.findFirst({
      where: { rideId, status: { in: [PaymentStatus.PENDING, PaymentStatus.AUTHORIZED] } }
    });

    if (!payment) {
      return null;
    }

    if (payment.provider === 'STRIPE') {
      if (!payment.transactionId) {
        return null;
      }
      try {
        await stripe.paymentIntents.cancel(payment.transactionId, undefined, {
          idempotencyKey: `cancel-${rideId}`
        });

        return this.updatePaymentStatus(payment.id, PaymentStatus.REFUNDED);
      } catch (err: any) {
        console.error('Failed to cancel Stripe hold:', err.message);
        throw err;
      }
    } else if (payment.provider === 'CASH' || payment.provider === 'UPI') {
      return this.updatePaymentStatus(payment.id, PaymentStatus.REFUNDED);
    }

    return null;
  }
}
