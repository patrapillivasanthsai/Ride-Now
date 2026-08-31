import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

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

  // Preference fields
  const [defaultMethod, setDefaultMethod] = useState('CARD'); // 'CARD' | 'UPI' | 'CASH'
  const [upiId, setUpiId] = useState('');

  // Add Card fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  // Active section view state: 'card' | 'upi' | 'cash'
  const [activeTab, setActiveTab] = useState<'card' | 'upi' | 'cash'>('card');

  const fetchProfileAndCards = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get profile default payment preferences
      const profileData = await api.getProfile();
      setDefaultMethod(profileData.defaultPaymentMethod || 'CARD');
      setUpiId(profileData.defaultUpiId || '');
      
      // In profile data default, determine tab view
      if (profileData.defaultPaymentMethod) {
        setActiveTab(profileData.defaultPaymentMethod.toLowerCase() as any);
      }

      // Fetch saved credit cards
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

  // Save default payment method choice
  const handleSelectDefaultMethod = async (method: 'CARD' | 'UPI' | 'CASH') => {
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    
    try {
      const payload: any = { defaultPaymentMethod: method };
      // Check if UPI ID is valid before setting default to UPI
      if (method === 'UPI') {
        if (!upiId.trim()) {
          setError('Please provide a UPI ID before setting UPI as your default method.');
          setSubmitting(false);
          return;
        }
        if (!upiId.includes('@')) {
          setError('Invalid UPI ID format. Must include @ (e.g. name@bank).');
          setSubmitting(false);
          return;
        }
        payload.defaultUpiId = upiId.trim();
      }

      await api.updateProfile(payload);
      setDefaultMethod(method);
      setSuccess(`Your preferred payment method is now set to ${method === 'CARD' ? 'Credit/Debit Card' : method === 'UPI' ? 'UPI' : 'Cash'}.`);
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to update payment preferences.');
    } finally {
      setSubmitting(false);
    }
  };

  // Save UPI ID preference
  const handleSaveUpiId = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!upiId.trim()) {
      setError('UPI ID cannot be blank.');
      return;
    }

    if (!upiId.includes('@')) {
      setError('Please provide a valid UPI ID (e.g. username@upi).');
      return;
    }

    setSubmitting(true);
    try {
      await api.updateProfile({ 
        defaultUpiId: upiId.trim(),
        defaultPaymentMethod: 'UPI' // set as default as well
      });
      setDefaultMethod('UPI');
      setSuccess('UPI details saved and set as your preferred payment method!');
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to update UPI settings.');
    } finally {
      setSubmitting(false);
    }
  };

  // Add card confirmation
  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!cardNumber || !cardName || !expiry || !cvv) {
      setError('Please fill in all credit card parameters.');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      
      // Initiate Stripe Card setup
      const setupRes = await fetch('http://localhost:3000/api/customer/payment-methods/setup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const setupData = await setupRes.json();
      if (!setupData.success) {
        throw new Error(setupData.error?.message || 'Card verification token generation failed.');
      }

      const mockPmId = `pm_mock_${cardNumber.slice(-4)}`;
      const attachRes = await fetch('http://localhost:3000/api/customer/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ paymentMethodId: mockPmId })
      });

      const attachData = await attachRes.json();
      if (attachData.success) {
        setSuccess('Credit Card attached successfully!');
        setCardNumber('');
        setCardName('');
        setExpiry('');
        setCvv('');
        
        // Auto set as default CARD method
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

  // Delete Card handler
  const handleDeleteCard = async (pmId: string) => {
    if (!window.confirm('Are you sure you want to remove this card?')) return;

    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/customer/payment-methods/${pmId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
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
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ padding: '60px 20px', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e3e6f0' }}>
          <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #00b562', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 20px auto' }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <h3 style={{ color: '#555' }}>Syncing payment options...</h3>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '950px', margin: '30px auto', padding: '0 20px', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontWeight: 'bold', fontSize: '28px', color: '#1a202c', margin: '0 0 6px 0' }}>
          Payment Methods
        </h1>
        <p style={{ color: '#718096', margin: 0, fontSize: '15px' }}>
          Manage your cards, UPI IDs, and default payment configurations.
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fff5f5', color: '#e53e3e', borderLeft: '4px solid #e53e3e', padding: '15px 20px', borderRadius: '8px', marginBottom: '25px', fontSize: '14px', fontWeight: '500' }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{ backgroundColor: '#f0fff4', color: '#38a169', borderLeft: '4px solid #38a169', padding: '15px 20px', borderRadius: '8px', marginBottom: '25px', fontSize: '14px', fontWeight: '500' }}>
          ✅ {success}
        </div>
      )}

      {/* Modern Payment Method Preference Bar */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '24px 30px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
        marginBottom: '35px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        <div>
          <span style={{ fontSize: '12px', color: '#a0aec0', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Active Preference</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>
              {defaultMethod === 'CARD' ? '💳' : defaultMethod === 'UPI' ? '📱' : '💵'}
            </span>
            <strong style={{ fontSize: '18px', color: '#2d3748' }}>
              {defaultMethod === 'CARD' ? 'Credit/Debit Card' : defaultMethod === 'UPI' ? `UPI (${upiId || 'Not Set'})` : 'Cash (Pay Captain Direct)'}
            </strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            disabled={submitting} 
            onClick={() => handleSelectDefaultMethod('CARD')}
            style={defaultMethod === 'CARD' ? activePrefBtn : inactivePrefBtn}
          >
            💳 Use Card
          </button>
          <button 
            disabled={submitting} 
            onClick={() => handleSelectDefaultMethod('UPI')}
            style={defaultMethod === 'UPI' ? activePrefBtn : inactivePrefBtn}
          >
            📱 Use UPI
          </button>
          <button 
            disabled={submitting} 
            onClick={() => handleSelectDefaultMethod('CASH')}
            style={defaultMethod === 'CASH' ? activePrefBtn : inactivePrefBtn}
          >
            💵 Use Cash
          </button>
        </div>
      </div>

      {/* Tabs Layout */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '30px', gap: '20px' }}>
        <button 
          onClick={() => setActiveTab('card')}
          style={activeTab === 'card' ? activeTabStyle : inactiveTabStyle}
        >
          Credit / Debit Card
        </button>
        <button 
          onClick={() => setActiveTab('upi')}
          style={activeTab === 'upi' ? activeTabStyle : inactiveTabStyle}
        >
          UPI (Unified Payments Interface)
        </button>
        <button 
          onClick={() => setActiveTab('cash')}
          style={activeTab === 'cash' ? activeTabStyle : inactiveTabStyle}
        >
          Cash Payment
        </button>
      </div>

      {/* TAB CONTENT: CARD */}
      {activeTab === 'card' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
          
          {/* Card List */}
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 'bold', color: '#2d3748' }}>Saved Cards</h3>
            
            {cards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', border: '2px dashed #edf2f7', borderRadius: '12px' }}>
                <span style={{ fontSize: '32px' }}>💳</span>
                <p style={{ margin: '10px 0 0 0', color: '#a0aec0', fontSize: '14px' }}>No saved cards found. Add one to get started.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {cards.map((pm) => (
                  <div 
                    key={pm.id} 
                    style={{
                      padding: '18px',
                      borderRadius: '12px',
                      border: '1.5px solid #edf2f7',
                      backgroundColor: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.01)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ fontSize: '24px', backgroundColor: '#f7fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        {pm.brand === 'visa' ? '🇺🇸' : '💳'}
                      </div>
                      <div>
                        <strong style={{ textTransform: 'capitalize', color: '#2d3748', fontSize: '15px' }}>
                          {pm.brand} card
                        </strong>
                        <p style={{ margin: '3px 0 0 0', color: '#718096', fontSize: '13px', fontFamily: 'monospace' }}>
                          •••• •••• •••• {pm.last4}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleDeleteCard(pm.id)}
                      disabled={submitting}
                      style={{
                        backgroundColor: 'transparent',
                        color: '#e53e3e',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        padding: '6px 12px',
                        borderRadius: '6px'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Card Form */}
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 'bold', color: '#2d3748' }}>Add Credit/Debit Card</h3>
            <form onSubmit={handleAddCard} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold', color: '#4a5568' }}>Cardholder Name</label>
                <input 
                  type="text" 
                  placeholder="Enter name"
                  value={cardName} 
                  onChange={(e) => setCardName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold', color: '#4a5568' }}>Card Number</label>
                <input 
                  type="text" 
                  maxLength={16}
                  placeholder="4242 4242 4242 4242"
                  value={cardNumber} 
                  onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold', color: '#4a5568' }}>Expiry (MM/YY)</label>
                  <input 
                    type="text" 
                    placeholder="MM/YY"
                    maxLength={5}
                    value={expiry} 
                    onChange={(e) => setExpiry(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold', color: '#4a5568' }}>CVV</label>
                  <input 
                    type="password" 
                    placeholder="•••"
                    maxLength={3}
                    value={cvv} 
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                    style={inputStyle}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  backgroundColor: '#00b562',
                  color: '#fff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  marginTop: '10px',
                  boxShadow: '0 4px 12px rgba(0, 181, 98, 0.15)'
                }}
              >
                {submitting ? 'Verifying Card...' : 'Add Secure Card'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB CONTENT: UPI */}
      {activeTab === 'upi' && (
        <div style={{ backgroundColor: '#fff', padding: '35px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.01)', maxWidth: '600px', margin: '0 auto' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <span style={{ fontSize: '32px' }}>📱</span>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 'bold', color: '#2d3748' }}>UPI Payments (INR)</h3>
              <span style={{ fontSize: '13px', color: '#718096' }}>Pay securely from any standard Indian UPI application</span>
            </div>
          </div>

          <form onSubmit={handleSaveUpiId} style={{ display: 'flex', flexDirection: 'column', gap: '20px', margin: '20px 0' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold', color: '#4a5568' }}>Register UPI ID / VPA</label>
              <input 
                type="text" 
                placeholder="example@upi (or @paytm, @okaxis, etc.)"
                value={upiId} 
                onChange={(e) => setUpiId(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                backgroundColor: '#00b562',
                color: '#fff',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(0, 181, 98, 0.15)'
              }}
            >
              {submitting ? 'Saving...' : 'Link & Set Default UPI'}
            </button>
          </form>

          {/* Supported Apps Badges */}
          <div style={{ borderTop: '1px solid #edf2f7', paddingTop: '25px', marginTop: '20px' }}>
            <span style={{ display: 'block', fontSize: '12px', color: '#a0aec0', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '15px' }}>Compatible UPI Applications</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {['Google Pay', 'PhonePe', 'Paytm', 'BHIM UPI'].map((app) => (
                <div key={app} style={{
                  padding: '8px 16px',
                  borderRadius: '30px',
                  backgroundColor: '#f7fafc',
                  border: '1.5px solid #edf2f7',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#4a5568',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ fontSize: '6px', color: '#00b562' }}>●</span>
                  {app}
                </div>
              ))}
            </div>
          </div>

          {/* Sandbox Architecture Note */}
          <div style={{ backgroundColor: '#ebf8ff', padding: '15px 20px', borderRadius: '10px', marginTop: '30px', borderLeft: '4px solid #3182ce' }}>
            <strong style={{ display: 'block', fontSize: '13px', color: '#2b6cb0', marginBottom: '4px' }}>💡 Development Sandbox Notice</strong>
            <p style={{ margin: 0, fontSize: '12px', color: '#2b6cb0', lineHeight: 1.5 }}>
              The application simulates the UPI request confirmation cycle. No real money movements or transactional bank requests will be processed in this sandbox instance.
            </p>
          </div>
        </div>
      )}

      {/* TAB CONTENT: CASH */}
      {activeTab === 'cash' && (
        <div style={{ backgroundColor: '#fff', padding: '35px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.01)', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '15px' }}>💵</span>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: 'bold', color: '#2d3748' }}>Pay with Cash</h3>
          <p style={{ color: '#718096', fontSize: '14px', lineHeight: '1.6', maxWidth: '400px', margin: '0 auto 25px auto' }}>
            Pay your captain/driver directly after the ride. Safe, reliable, and requires no online payment registrations.
          </p>

          <div style={{
            display: 'inline-flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: '#f7fafc',
            border: '1.5px solid #edf2f7',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'left',
            width: '100%',
            boxSizing: 'border-box',
            marginBottom: '30px'
          }}>
            <div style={{ display: 'flex', gap: '10px', fontSize: '13px', color: '#4a5568' }}>
              <span>✔</span>
              <span>Final fare is calculated and displayed in the app upon reaching your drop destination.</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', fontSize: '13px', color: '#4a5568' }}>
              <span>✔</span>
              <span>Indian ₹ INR currency values only. Please make sure to collect any balance change.</span>
            </div>
          </div>

          <button
            onClick={() => handleSelectDefaultMethod('CASH')}
            disabled={submitting}
            style={{
              backgroundColor: defaultMethod === 'CASH' ? '#cbd5e1' : '#00b562',
              color: defaultMethod === 'CASH' ? '#475569' : '#fff',
              border: 'none',
              padding: '14px 28px',
              borderRadius: '30px',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: submitting || defaultMethod === 'CASH' ? 'not-allowed' : 'pointer',
              boxShadow: defaultMethod === 'CASH' ? 'none' : '0 4px 12px rgba(0, 181, 98, 0.2)'
            }}
          >
            {defaultMethod === 'CASH' ? '✔ Currently Selected' : 'Set Cash as Preferred Method'}
          </button>
        </div>
      )}
    </div>
  );
}

// Styling definitions
const activePrefBtn = {
  backgroundColor: '#00b562',
  color: '#fff',
  border: 'none',
  padding: '8px 16px',
  borderRadius: '20px',
  fontSize: '13px',
  fontWeight: 'bold' as const,
  cursor: 'pointer'
};

const inactivePrefBtn = {
  backgroundColor: '#f1f5f9',
  color: '#475569',
  border: '1px solid #e2e8f0',
  padding: '8px 16px',
  borderRadius: '20px',
  fontSize: '13px',
  fontWeight: 'bold' as const,
  cursor: 'pointer'
};

const activeTabStyle = {
  backgroundColor: 'transparent',
  color: '#00b562',
  border: 'none',
  borderBottom: '3px solid #00b562',
  padding: '12px 20px',
  fontWeight: 'bold' as const,
  fontSize: '15px',
  cursor: 'pointer',
  transition: 'all 0.2s'
};

const inactiveTabStyle = {
  backgroundColor: 'transparent',
  color: '#718096',
  border: 'none',
  padding: '12px 20px',
  fontSize: '15px',
  cursor: 'pointer',
  transition: 'all 0.2s'
};

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  border: '1px solid #cbd5e0',
  borderRadius: '8px',
  boxSizing: 'border-box' as const,
  fontSize: '14px',
  outline: 'none',
  backgroundColor: '#fff',
  fontFamily: 'sans-serif'
};
