import { Router } from 'express';
import {
  createSetupIntent,
  attachPaymentMethod,
  listPaymentMethods,
  deletePaymentMethod,
  getPaymentHistory
} from '../controllers/payment.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.use(requireRole(UserRole.CUSTOMER));

router.post('/payment-methods/setup', createSetupIntent);
router.post('/payment-methods', attachPaymentMethod);
router.get('/payment-methods', listPaymentMethods);
router.delete('/payment-methods/:id', deletePaymentMethod);
router.get('/payments', getPaymentHistory);

export default router;
