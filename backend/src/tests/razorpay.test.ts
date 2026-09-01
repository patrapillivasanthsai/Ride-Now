import { verifyRazorpaySignature, getRazorpayKeyId } from '../utils/razorpay';
import crypto from 'crypto';

describe('Razorpay Payment Gateway Integration', () => {
  const testKeySecret = process.env.RAZORPAY_KEY_SECRET || 'zHIlAPvPKqy2MEtcs14SP89V';

  it('should expose the correct configured Razorpay Key ID', () => {
    const keyId = getRazorpayKeyId();
    expect(keyId).toBe('rzp_test_TWT8hToPWs3eLy');
  });

  it('should successfully verify a valid Razorpay HMAC SHA256 signature', () => {
    const orderId = 'order_test_123456';
    const paymentId = 'pay_test_987654';

    const validSignature = crypto
      .createHmac('sha256', testKeySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isValid = verifyRazorpaySignature(orderId, paymentId, validSignature);
    expect(isValid).toBe(true);
  });

  it('should reject a tampered or invalid Razorpay signature', () => {
    const orderId = 'order_test_123456';
    const paymentId = 'pay_test_987654';
    const fakeSignature = 'fake_signature_hex_code_1234567890';

    const isValid = verifyRazorpaySignature(orderId, paymentId, fakeSignature);
    expect(isValid).toBe(false);
  });

  it('should reject empty or missing signature parameters', () => {
    expect(verifyRazorpaySignature('', 'pay_123', 'sig_123')).toBe(false);
    expect(verifyRazorpaySignature('order_123', '', 'sig_123')).toBe(false);
    expect(verifyRazorpaySignature('order_123', 'pay_123', '')).toBe(false);
  });
});
