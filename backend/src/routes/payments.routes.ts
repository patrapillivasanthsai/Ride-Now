import { Router } from 'express';
import {
  createPaymentOrder,
  verifyPayment,
  getPaymentDetails,
  createRazorpayOrderHandler,
  verifyRazorpayPaymentHandler,
  getRazorpayConfigHandler
} from '../controllers/payment.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/create-order', createPaymentOrder);
router.post('/verify', verifyPayment);

// Razorpay Dedicated Endpoints
router.get('/razorpay/config', getRazorpayConfigHandler);
router.post('/razorpay/create-order', createRazorpayOrderHandler);
router.post('/razorpay/verify', verifyRazorpayPaymentHandler);

router.get('/:paymentId', getPaymentDetails);

export default router;
