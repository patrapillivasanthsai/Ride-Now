import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CreditCard, Smartphone, Banknote, Trash2, ShieldCheck, PlusCircle, AlertCircle, CheckCircle } from 'lucide-react';

interface PaymentMethodCard {
  id: string;
  brand: string;
  last4: string;
  expMonth?: number;
  expYear?: number;
}

export function PaymentMethods() {
  const { refreshUser } = useAuth();
  
  const [cards, setCards] = useState<PaymentMethodCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [defaultMethod, setDefaultMethod] = useState('CARD');
  const [upiId, setUpiId] = useState('');

  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const [activeTab, setActiveTab] = useState<'card' | 'upi' | 'cash'>('card');

  const fetchProfileAndCards = async () => {
    try {
      setLoading(true); setError(null);
      
      const profileData = await api.getProfile();
      setDefaultMethod(profileData.defaultPaymentMethod || 'CARD');
      setUpiId(profileData.defaultUpiId || '');
      
      if (profileData.defaultPaymentMethod) {
        setActiveTab(profileData.defaultPaymentMethod.toLowerCase() as any);
      }

      const token = localStorage.getItem('token');
      const cardRes = await fetch('http://localhost:3000/api/customer/payment-methods', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const cardData = await cardRes.json();
      if (cardData.success) {
        setCards(cardData.data);
      } else {
        setError(cardData.error?.message || 'Failed to fetch cards');
      }
    } catch (err) {
      setError('Connection error sync data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndCards();
  }, []);

  const handleSelectDefaultMethod = async (method: 'CARD' | 'UPI' | 'CASH') => {
    setError(null); setSuccess(null); setSubmitting(true);
    try {
      const payload: any = { defaultPaymentMethod: method };
      if (method === 'UPI') {
        if (!upiId.trim() || !upiId.includes('@')) {
          setError('Invalid UPI ID format. Must include @ (e.g. name@bank).');
          setSubmitting(false);
          return;
        }
        payload.defaultUpiId = upiId.trim();
      }
      await api.updateProfile(payload);
      setDefaultMethod(method);
      setSuccess(`Your preferred payment method is now set to ${method}.`);
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to update payment preferences.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveUpiId = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (!upiId.trim() || !upiId.includes('@')) {
      setError('Please provide a valid UPI ID (e.g. username@upi).');
      return;
    }
    setSubmitting(true);
    try {
      await api.updateProfile({ defaultUpiId: upiId.trim(), defaultPaymentMethod: 'UPI' });
      setDefaultMethod('UPI');
      setSuccess('UPI details saved and set as your preferred payment method!');
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to update UPI settings.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (!cardNumber || !cardName || !expiry || !cvv) {
      setError('Please fill in all credit card parameters.');
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const setupRes = await fetch('http://localhost:3000/api/customer/payment-methods/setup', {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
      });
      const setupData = await setupRes.json();
      if (!setupData.success) throw new Error(setupData.error?.message || 'Card verification token generation failed.');

      const mockPmId = `pm_mock_${cardNumber.slice(-4)}`;
      const attachRes = await fetch('http://localhost:3000/api/customer/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ paymentMethodId: mockPmId })
      });
      const attachData = await attachRes.json();
      if (attachData.success) {
        setSuccess('Credit Card attached successfully!');
        setCardNumber(''); setCardName(''); setExpiry(''); setCvv('');
        await handleSelectDefaultMethod('CARD');
        fetchProfileAndCards();
      } else {
        setError(attachData.error?.message || 'Failed to attach card details.');
      }
    } catch (err: any) {
      setError(err.message || 'Connection failure attaching card.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCard = async (pmId: string) => {
    if (!window.confirm('Are you sure you want to remove this card?')) return;
    setError(null); setSuccess(null); setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/customer/payment-methods/${pmId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Card removed.');
        fetchProfileAndCards();
      } else {
        setError(data.error?.message || 'Failed to remove card.');
      }
    } catch (err) {
      setError('Connection failure removing card.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-green border-t-transparent"></div>
        <p className="mt-4 text-slate-500 font-semibold">Syncing payment options...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Payment Methods</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your cards, UPI IDs, and default payment configurations.</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 text-sm font-semibold border border-red-100 dark:border-red-900/50 flex items-center gap-3">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-950/30 text-brand-green p-4 rounded-xl mb-6 text-sm font-semibold border border-green-100 dark:border-green-900/50 flex items-center gap-3">
          <CheckCircle className="w-5 h-5" /> {success}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 p-6 md:p-8 mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Active Preference</span>
          <div className="flex items-center gap-3 text-lg font-bold text-slate-900 dark:text-white">
            {defaultMethod === 'CARD' ? <CreditCard className="w-6 h-6 text-brand-green" /> : 
             defaultMethod === 'UPI' ? <Smartphone className="w-6 h-6 text-brand-green" /> : 
             <Banknote className="w-6 h-6 text-brand-green" />}
            {defaultMethod === 'CARD' ? 'Credit/Debit Card' : defaultMethod === 'UPI' ? `UPI (${upiId || 'Not Set'})` : 'Cash (Pay Captain Direct)'}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={() => handleSelectDefaultMethod('CARD')} disabled={submitting}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition ${defaultMethod === 'CARD' ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
            <CreditCard className="w-4 h-4" /> Card
          </button>
          <button onClick={() => handleSelectDefaultMethod('UPI')} disabled={submitting}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition ${defaultMethod === 'UPI' ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
            <Smartphone className="w-4 h-4" /> UPI
          </button>
          <button onClick={() => handleSelectDefaultMethod('CASH')} disabled={submitting}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition ${defaultMethod === 'CASH' ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
            <Banknote className="w-4 h-4" /> Cash
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto hide-scrollbar">
        {[
          { id: 'card', label: 'Credit / Debit Card' },
          { id: 'upi', label: 'UPI (Unified Payments Interface)' },
          { id: 'cash', label: 'Cash Payment' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${activeTab === tab.id ? 'border-brand-green text-brand-green' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'card' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 md:p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Saved Cards</h3>
            {cards.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center flex flex-col items-center">
                <CreditCard className="w-12 h-12 text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium text-sm">No saved cards found. Add one to get started.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {cards.map(pm => (
                  <div key={pm.id} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between bg-slate-50 hover:border-brand-green/30 transition">
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                        <CreditCard className="w-6 h-6 text-slate-700" />
                      </div>
                      <div>
                        <strong className="text-sm font-bold text-slate-900 capitalize">{pm.brand} card</strong>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">•••• •••• •••• {pm.last4}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteCard(pm.id)} disabled={submitting}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition disabled:opacity-50">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 md:p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-brand-green" /> Add Credit/Debit Card
            </h3>
            <form onSubmit={handleAddCard} className="flex flex-col gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Cardholder Name</label>
                <input type="text" placeholder="John Doe" value={cardName} onChange={e => setCardName(e.target.value)} required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-brand-green focus:border-brand-green block p-3 transition" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Card Number</label>
                <input type="text" maxLength={16} placeholder="4242 4242 4242 4242" value={cardNumber} onChange={e => setCardNumber(e.target.value.replace(/\D/g, ''))} required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-brand-green focus:border-brand-green block p-3 transition font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Expiry (MM/YY)</label>
                  <input type="text" maxLength={5} placeholder="MM/YY" value={expiry} onChange={e => setExpiry(e.target.value)} required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-brand-green focus:border-brand-green block p-3 transition font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">CVV</label>
                  <input type="password" maxLength={3} placeholder="•••" value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, ''))} required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-brand-green focus:border-brand-green block p-3 transition font-mono" />
                </div>
              </div>
              <button type="submit" disabled={submitting}
                className="mt-2 w-full text-white bg-brand-green hover:bg-green-600 focus:ring-4 focus:outline-none focus:ring-green-300 font-bold rounded-xl text-sm px-5 py-3.5 text-center transition shadow-lg shadow-brand-green/30 disabled:opacity-70 flex justify-center items-center gap-2">
                {submitting ? 'Verifying...' : <><ShieldCheck className="w-5 h-5" /> Add Secure Card</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'upi' && (
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
            <div className="bg-brand-green/10 p-3 rounded-xl"><Smartphone className="w-8 h-8 text-brand-green" /></div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">UPI Payments (INR)</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">Pay securely from any standard Indian UPI app</p>
            </div>
          </div>

          <form onSubmit={handleSaveUpiId} className="flex flex-col gap-6 mb-8">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Register UPI ID / VPA</label>
              <input type="text" placeholder="example@upi (or @paytm, @okaxis, etc.)" value={upiId} onChange={e => setUpiId(e.target.value)} required
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-brand-green focus:border-brand-green block p-4 transition" />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full text-white bg-brand-green hover:bg-green-600 focus:ring-4 font-bold rounded-xl text-sm px-5 py-4 text-center transition shadow-lg shadow-brand-green/30 disabled:opacity-70">
              {submitting ? 'Saving...' : 'Link & Set Default UPI'}
            </button>
          </form>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4" /> Development Sandbox
            </h4>
            <p className="text-xs text-blue-600 font-medium leading-relaxed">
              The application simulates the UPI request confirmation cycle. No real money movements or transactional bank requests will be processed in this sandbox instance.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'cash' && (
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-10 text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Banknote className="w-10 h-10 text-brand-green" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">Pay with Cash</h3>
          <p className="text-slate-500 font-medium mb-8">
            Pay your captain/driver directly after the ride. Safe, reliable, and requires no online payment registrations.
          </p>

          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 text-left mb-8 space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-brand-green shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-slate-700">Final fare is calculated and displayed in the app upon reaching your drop destination.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-brand-green shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-slate-700">Indian ₹ INR currency values only. Please make sure to collect any balance change.</p>
            </div>
          </div>

          <button onClick={() => handleSelectDefaultMethod('CASH')} disabled={submitting || defaultMethod === 'CASH'}
            className={`w-full font-bold rounded-xl text-sm px-5 py-4 transition shadow-lg ${defaultMethod === 'CASH' ? 'bg-slate-100 text-slate-500 shadow-none cursor-not-allowed' : 'bg-brand-green hover:bg-green-600 text-white shadow-brand-green/30'}`}>
            {defaultMethod === 'CASH' ? '✔ Currently Selected' : 'Set Cash as Preferred Method'}
          </button>
        </div>
      )}
    </div>
  );
}
