import { Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { stripe } from '../utils/stripe';
import { PaymentService } from '../services/payment.service';

const prisma = new PrismaClient();

/**
 * Helper: Retrieve or create a Stripe Customer for the customer user.
 */
async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const customer = await prisma.customer.findUnique({
    where: { userId }
  });

  if (!customer) {
    throw new Error('Customer profile not found');
  }

  if (customer.stripeCustomerId) {
    return customer.stripeCustomerId;
  }

  // Create Customer in Stripe
  const stripeCustomer = await stripe.customers.create({
    email,
    metadata: { userId, customerId: customer.id }
  });

  // Save to DB
  await prisma.customer.update({
    where: { id: customer.id },
    data: { stripeCustomerId: stripeCustomer.id }
  });

  return stripeCustomer.id;
}

/**
 * POST /api/customer/payment-methods/setup
 */
export async function createSetupIntent(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  try {
    const stripeCustomerId = await getOrCreateStripeCustomer(req.user.id, req.user.email);
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId
    });

    return res.status(200).json({
      success: true,
      data: {
        clientSecret: setupIntent.client_secret
      }
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to create setup intent' }
    });
  }
}

/**
 * POST /api/customer/payment-methods
 */
export async function attachPaymentMethod(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  const { paymentMethodId } = req.body;
  if (!paymentMethodId) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'paymentMethodId is required' }
    });
  }

  try {
    const stripeCustomerId = await getOrCreateStripeCustomer(req.user.id, req.user.email);

    // Attach to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomerId
    });

    // Optionally set as default payment method
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Payment method attached successfully'
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to attach payment method' }
    });
  }
}

/**
 * GET /api/customer/payment-methods
 */
export async function listPaymentMethods(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  try {
    const customer = await prisma.customer.findUnique({
      where: { userId: req.user.id }
    });

    if (!customer || !customer.stripeCustomerId) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.stripeCustomerId,
      type: 'card'
    });

    const formatted = paymentMethods.data.map((pm: any) => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4
    }));

    return res.status(200).json({
      success: true,
      data: formatted
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to list payment methods' }
    });
  }
}

/**
 * DELETE /api/customer/payment-methods/:id
 */
export async function deletePaymentMethod(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  const { id } = req.params;

  try {
    const customer = await prisma.customer.findUnique({
      where: { userId: req.user.id }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'CUSTOMER_PROFILE_NOT_FOUND', message: 'Customer profile not found' }
      });
    }

    // Detach from Stripe
    await stripe.paymentMethods.detach(id);

    return res.status(200).json({
      success: true,
      message: 'Payment method detached successfully'
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to detach payment method' }
    });
  }
}

/**
 * GET /api/customer/payments
 */
export async function getPaymentHistory(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  try {
    const customer = await prisma.customer.findUnique({
      where: { userId: req.user.id }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'CUSTOMER_PROFILE_NOT_FOUND', message: 'Customer profile not found' }
      });
    }

    const payments = await prisma.payment.findMany({
      where: {
        ride: { customerId: customer.id }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      success: true,
      data: payments
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to retrieve payment history' }
    });
  }
}

/**
 * POST /api/payments/create-order
 */
export async function createPaymentOrder(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  if (req.user.role !== UserRole.CUSTOMER) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Only customers can initiate payment orders' }
    });
  }

  const { rideId, paymentMethodId } = req.body;
  if (!rideId || !paymentMethodId) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'rideId and paymentMethodId are required' }
    });
  }

  try {
    const data = await PaymentService.createOrder(req.user.id, rideId, paymentMethodId);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error: any) {
    if (error.message === 'RIDE_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found' }
      });
    }
    if (error.message === 'UNAUTHORIZED_RIDE_OWNER') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not own this ride request' }
      });
    }
    if (error.message === 'PAYMENT_ALREADY_EXISTS') {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'An active payment already exists for this ride' }
      });
    }
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to create payment order' }
    });
  }
}

/**
 * POST /api/payments/verify
 */
export async function verifyPayment(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  const { paymentId } = req.body;
  if (!paymentId) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'paymentId is required' }
    });
  }

  try {
    const data = await PaymentService.verifyPayment(req.user.id, paymentId);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error: any) {
    if (error.message === 'PAYMENT_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' }
      });
    }
    if (error.message === 'UNAUTHORIZED_PAYMENT_ACCESS') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied to this payment information' }
      });
    }
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to verify payment status' }
    });
  }
}

/**
 * GET /api/payments/:paymentId
 */
export async function getPaymentDetails(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  const { paymentId } = req.params;

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { ride: { include: { customer: true } } }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' }
      });
    }

    // Role checks: Admin can view all payments. Customers can view only their own payments.
    if (req.user.role !== UserRole.ADMIN && payment.ride.customer.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied to this payment information' }
      });
    }

    // Prepare safe representation to return to client (strip any gateway credentials if added later)
    const safePayload = {
      id: payment.id,
      rideId: payment.rideId,
      amount: payment.amount,
      status: payment.status,
      provider: payment.provider,
      transactionId: payment.transactionId,
      orderId: payment.orderId,
      paymentId: payment.paymentId,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt
    };

    return res.status(200).json({
      success: true,
      data: safePayload
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch payment details' }
    });
  }
}

/**
 * POST /api/payments/razorpay/create-order
 */
export async function createRazorpayOrderHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  const { rideId } = req.body;
  if (!rideId) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'rideId is required' }
    });
  }

  try {
    const orderData = await PaymentService.createRazorpayOrder(req.user.id, rideId);
    return res.status(200).json({
      success: true,
      data: orderData
    });
  } catch (error: any) {
    if (error.message === 'RIDE_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found' }
      });
    }
    if (error.message === 'UNAUTHORIZED_RIDE_OWNER') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied: You do not own this ride request' }
      });
    }
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to create Razorpay order' }
    });
  }
}

/**
 * POST /api/payments/razorpay/verify
 */
export async function verifyRazorpayPaymentHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  const { rideId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!rideId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'rideId, razorpay_order_id, razorpay_payment_id, and razorpay_signature are required'
      }
    });
  }

  try {
    const result = await PaymentService.verifyRazorpayPayment(
      req.user.id,
      rideId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    if (error.message === 'INVALID_RAZORPAY_SIGNATURE') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_SIGNATURE', message: 'Payment verification failed: Invalid Razorpay signature' }
      });
    }
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to verify payment' }
    });
  }
}

/**
 * GET /api/payments/razorpay/config
 */
export async function getRazorpayConfigHandler(req: AuthenticatedRequest, res: Response) {
  return res.status(200).json({
    success: true,
    data: {
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_TWT8hToPWs3eLy'
    }
  });
}
