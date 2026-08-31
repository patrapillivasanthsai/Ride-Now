import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;
const useRealStripe = typeof secretKey === 'string' && secretKey.startsWith('sk_');

let realStripeInstance: Stripe | null = null;
if (useRealStripe) {
  try {
    realStripeInstance = new Stripe(secretKey as string, {
      apiVersion: '2023-10-16' as any
    });
    console.log('Stripe SDK initialized successfully in Production/Sandbox mode.');
  } catch (error) {
    console.error('Failed to initialize real Stripe client:', error);
  }
} else {
  console.warn('STRIPE_SECRET_KEY is missing or mock. Stripe service will run in Mock Mode.');
}

// Mock implementation mirror matching expected Stripe SDK shapes
const stripeMock = {
  customers: {
    create: async (params: { email: string }) => {
      console.log(`[Stripe Mock] Create Customer for ${params.email}`);
      return { id: `cus_${Math.random().toString(36).substr(2, 9)}`, email: params.email };
    },
    update: async (id: string, params: any) => {
      console.log(`[Stripe Mock] Update Customer ${id}`);
      return { id };
    }
  },
  setupIntents: {
    create: async (params: { customer: string }) => {
      console.log(`[Stripe Mock] Create SetupIntent for Customer ${params.customer}`);
      return {
        id: `seti_${Math.random().toString(36).substr(2, 9)}`,
        client_secret: `seti_secret_${Math.random().toString(36).substr(2, 15)}`
      };
    }
  },
  paymentMethods: {
    attach: async (id: string, params: { customer: string }) => {
      console.log(`[Stripe Mock] Attach PaymentMethod ${id} to Customer ${params.customer}`);
      return { id, customer: params.customer, card: { brand: 'visa', last4: '4242' } };
    },
    detach: async (id: string) => {
      console.log(`[Stripe Mock] Detach PaymentMethod ${id}`);
      return { id };
    },
    list: async (params: { customer: string; type: string }) => {
      console.log(`[Stripe Mock] List PaymentMethods for Customer ${params.customer}`);
      return {
        data: [
          { id: 'pm_mock_visa', brand: 'visa', last4: '4242', card: { brand: 'visa', last4: '4242' } }
        ]
      };
    }
  },
  paymentIntents: {
    create: async (params: { amount: number; currency: string; customer: string; payment_method: string; capture_method: string; confirm: boolean; return_url?: string }) => {
      console.log(`[Stripe Mock] Create PaymentIntent: amount=${params.amount}, method=${params.payment_method}, capture=${params.capture_method}`);
      const intentId = `pi_${Math.random().toString(36).substr(2, 9)}`;
      
      // Simulate SCA request for specific card token
      if (params.payment_method === 'pm_requires_action') {
        return {
          id: intentId,
          status: 'requires_action',
          client_secret: `${intentId}_secret_${Math.random().toString(36).substr(2, 15)}`,
          next_action: { type: 'use_stripe_sdk' }
        };
      }

      return {
        id: intentId,
        status: params.capture_method === 'manual' ? 'requires_capture' : 'succeeded',
        amount: params.amount
      };
    },
    retrieve: async (id: string) => {
      console.log(`[Stripe Mock] Retrieve PaymentIntent ${id}`);
      return {
        id,
        status: 'requires_capture',
        amount: 10000
      };
    },
    capture: async (id: string, options?: any) => {
      console.log(`[Stripe Mock] Capture PaymentIntent ${id}`);
      return { id, status: 'succeeded' };
    },
    cancel: async (id: string) => {
      console.log(`[Stripe Mock] Cancel PaymentIntent ${id}`);
      return { id, status: 'canceled' };
    }
  },
  webhooks: {
    constructEvent: (body: any, signature: string, secret: string) => {
      console.log('[Stripe Mock] Parse webhook signature constructEvent');
      if (signature === 'invalid_sig') {
        throw new Error('Webhook signature verification failed');
      }
      if (typeof body === 'object' && !Buffer.isBuffer(body)) {
        return body;
      }
      return JSON.parse(typeof body === 'string' ? body : body.toString());
    }
  }
};

export const stripe = useRealStripe && realStripeInstance ? realStripeInstance : (stripeMock as unknown as Stripe);
export { useRealStripe };
