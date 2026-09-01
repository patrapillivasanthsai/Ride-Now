import { Request, Response } from 'express';
import { PrismaClient, PaymentStatus, RideStatus } from '@prisma/client';
import { stripe } from '../utils/stripe';
import { emitToRide } from '../socket';
import { PaymentService } from '../services/payment.service';
import { DispatchService } from '../services/dispatch.service';

const prisma = new PrismaClient();
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock';
if (process.env.NODE_ENV === 'production' && endpointSecret === 'whsec_mock') {
  throw new Error('Production deployment requires a secure, non-fallback STRIPE_WEBHOOK_SECRET environment variable.');
}

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).json({ success: false, error: 'Stripe signature header missing' });
  }

  let event: any;

  try {
    // Construct event verifies signature
    event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ success: false, error: `Webhook Signature verification failed: ${err.message}` });
  }

  const intent = event.data.object;
  const paymentIntentId = intent.id;

  try {
    switch (event.type) {
      case 'payment_intent.amount_capturable_updated': {
        // Hold is authorized and capturable
        const payment = await prisma.payment.findUnique({
          where: { transactionId: paymentIntentId },
          include: { ride: true }
        });

        if (payment && payment.status !== PaymentStatus.AUTHORIZED) {
          await prisma.$transaction(async (tx) => {
            // First transition payment status using PaymentService which validates transition
            await PaymentService.updatePaymentStatus(payment.id, PaymentStatus.AUTHORIZED);

            // Transition ride to SEARCHING_DRIVER to enable driver matching
            if (payment.ride.status === RideStatus.REQUESTED) {
              const updatedRide = await tx.ride.update({
                where: { id: payment.rideId },
                data: { status: RideStatus.SEARCHING_DRIVER }
              });

              await tx.rideStatusHistory.create({
                data: {
                  rideId: payment.rideId,
                  status: RideStatus.SEARCHING_DRIVER
                }
              });

              emitToRide(payment.rideId, 'ride_status_changed', { ride: updatedRide });

              // Trigger automated driver matching and dispatch
              DispatchService.dispatchRide(payment.rideId).catch(err => {
                console.error('Webhook auto-dispatch failed:', err);
              });
            }
          });
        }
        break;
      }

      case 'payment_intent.succeeded': {
        // Funds captured successfully
        const payment = await prisma.payment.findUnique({
          where: { transactionId: paymentIntentId }
        });

        if (payment && payment.status !== PaymentStatus.COMPLETED) {
          await PaymentService.updatePaymentStatus(payment.id, PaymentStatus.COMPLETED);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        // Declined / error
        const payment = await prisma.payment.findUnique({
          where: { transactionId: paymentIntentId }
        });

        if (payment && payment.status !== PaymentStatus.FAILED) {
          await prisma.$transaction(async (tx) => {
            await PaymentService.updatePaymentStatus(payment.id, PaymentStatus.FAILED);

            // Transition ride to CANCELLED since payment failed
            if (payment.rideId) {
              const updatedRide = await tx.ride.update({
                where: { id: payment.rideId },
                data: { status: RideStatus.CANCELLED }
              });

              await tx.rideStatusHistory.create({
                data: {
                  rideId: payment.rideId,
                  status: RideStatus.CANCELLED
                }
              });

              emitToRide(payment.rideId, 'ride_status_changed', { ride: updatedRide });
            }
          });
        }
        break;
      }

      case 'payment_intent.canceled': {
        // Released / refunded
        const payment = await prisma.payment.findUnique({
          where: { transactionId: paymentIntentId }
        });

        if (payment && payment.status !== PaymentStatus.REFUNDED) {
          await PaymentService.updatePaymentStatus(payment.id, PaymentStatus.REFUNDED);
        }
        break;
      }
    }

    return res.status(200).json({ received: true });

  } catch (error: any) {
    console.error('Error handling webhook event:', error);
    return res.status(500).json({ success: false, error: 'Internal webhook handler error' });
  }
}
