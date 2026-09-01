import Razorpay from 'razorpay';
import crypto from 'crypto';

const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_TWT8hToPWs3eLy';
const keySecret = process.env.RAZORPAY_KEY_SECRET || 'zHIlAPvPKqy2MEtcs14SP89V';

export const razorpayInstance = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

/**
 * Creates an authoritative Razorpay Order in INR (amount in paise = rupees * 100)
 */
export async function createRazorpayOrder(amountInRupees: number, receiptId: string, notes: Record<string, string> = {}) {
  const amountInPaise = Math.round(amountInRupees * 100);

  const orderOptions = {
    amount: amountInPaise,
    currency: 'INR',
    receipt: receiptId.slice(0, 40), // Razorpay max receipt length 40 chars
    notes,
  };

  const order = await razorpayInstance.orders.create(orderOptions);
  return order;
}

/**
 * Verifies Razorpay Payment Signature using HMAC-SHA256
 */
export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!orderId || !paymentId || !signature) {
    return false;
  }

  const generatedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return generatedSignature === signature;
}

export function getRazorpayKeyId(): string {
  return keyId;
}
