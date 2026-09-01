import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

export const Offers: React.FC = () => {
  const { theme } = useTheme();
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    discountValue: '20',
    couponCode: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadOffers = () => {
    setLoading(true);
    setError(null);
    api.getOffers()
      .then(d => setOffers(Array.isArray(d) ? d : []))
      .catch(e => setError(e.message || 'Failed to load offers'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadOffers(); }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleOpenCreate = () => {
    setEditingOffer(null);
    setForm({
      title: '',
      description: '',
      discountValue: '20',
      couponCode: 'RIDENOW20',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      isActive: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (offer: any) => {
    setEditingOffer(offer);
    setForm({
      title: offer.title,
      description: offer.description,
      discountValue: String(offer.discountValue),
      couponCode: offer.couponCode || '',
      startDate: new Date(offer.startDate).toISOString().slice(0, 10),
      endDate: new Date(offer.endDate).toISOString().slice(0, 10),
      isActive: offer.isActive !== false,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingOffer) {
        await api.updateOffer(editingOffer.id, form);
        showToast('Offer updated successfully!');
      } else {
        await api.createOffer(form);
        showToast('Offer created & broadcasted to customers!');
      }
      setShowModal(false);
      loadOffers();
    } catch (e: any) {
      alert(e.message || 'Failed to save offer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotional offer?')) return;
    try {
      await api.deleteOffer(id);
      showToast('Offer deleted.');
      loadOffers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: `1.5px solid ${theme.border}`,
    borderRadius: '8px',
    fontSize: '13.5px',
    boxSizing: 'border-box',
    backgroundColor: theme.inputBg,
    color: theme.text,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '12px',
    fontWeight: '700',
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  };

  return (
    <div>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          zIndex: 9999,
          backgroundColor: '#00b562',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '10px',
          fontWeight: '700',
          fontSize: '13.5px',
          boxShadow: '0 8px 24px rgba(0,181,98,0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>✅</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: theme.text }}>Promotional Offers & Promo Codes</h1>
          <p style={{ margin: '4px 0 0', color: theme.textMuted, fontSize: '13.5px' }}>
            Create discount promo codes and push campaigns automatically to active customers.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          style={{
            padding: '10px 20px',
            backgroundColor: '#00b562',
            color: '#fff',
            border: 'none',
            borderRadius: '9px',
            fontWeight: '800',
            fontSize: '13.5px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,181,98,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>🎁</span> + Create Promo Offer
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', borderLeft: '4px solid #ef4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Offer Create / Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '16px', padding: '28px', width: '480px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `1px solid ${theme.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: theme.text }}>
                {editingOffer ? '✏️ Edit Promotional Offer' : '🎁 Create New Promo Offer'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: theme.textMuted, cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Offer Title</label>
                <input
                  style={inputStyle}
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Monsoon 20% Off"
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Promo / Coupon Code</label>
                <input
                  style={inputStyle}
                  value={form.couponCode}
                  onChange={e => setForm({ ...form, couponCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. MONSOON20"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Discount (₹ / %)</label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={form.discountValue}
                    onChange={e => setForm({ ...form, discountValue: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select
                    style={inputStyle}
                    value={form.isActive ? 'true' : 'false'}
                    onChange={e => setForm({ ...form, isActive: e.target.value === 'true' })}
                  >
                    <option value="true">✅ Active</option>
                    <option value="false">⏸️ Inactive</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Start Date</label>
                  <input
                    type="date"
                    style={inputStyle}
                    value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>End Date</label>
                  <input
                    type="date"
                    style={inputStyle}
                    value={form.endDate}
                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Description & Terms</label>
                <textarea
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Get flat 20% off on all bike and auto rides..."
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ flex: 1, padding: '12px', backgroundColor: '#00b562', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '13.5px', cursor: submitting ? 'not-allowed' : 'pointer' }}
                >
                  {submitting ? 'Saving Offer...' : 'Save & Publish Offer'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '12px', backgroundColor: theme.cardBgSecondary, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Offers Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: theme.textMuted }}>Loading promo offers...</div>
      ) : offers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: theme.textMuted, backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}` }}>
          🎁 No promotional campaigns active. Click "+ Create Promo Offer" to create your first discount campaign.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {offers.map(offer => (
            <div
              key={offer.id}
              style={{
                backgroundColor: theme.cardBg,
                borderRadius: '16px',
                border: `1px solid ${theme.border}`,
                padding: '24px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: theme.text }}>{offer.title}</h3>
                    <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '2px' }}>{offer.description}</div>
                  </div>
                  {offer.isActive ? (
                    <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', color: '#059669', backgroundColor: 'rgba(5,150,105,0.1)' }}>
                      Active
                    </span>
                  ) : (
                    <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', color: theme.textMuted, backgroundColor: theme.badgeBg }}>
                      Inactive
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0', padding: '12px', backgroundColor: theme.cardBgSecondary, borderRadius: '10px' }}>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#00b562', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                    {offer.couponCode || 'PROMO'}
                  </div>
                  <div style={{ fontSize: '12px', color: theme.textMuted }}>
                    · Discount: <strong style={{ color: theme.text }}>{offer.discountValue}%</strong>
                  </div>
                </div>

                <div style={{ fontSize: '11.5px', color: theme.textMuted }}>
                  Validity: {new Date(offer.startDate).toLocaleDateString()} — {new Date(offer.endDate).toLocaleDateString()}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '20px', paddingTop: '14px', borderTop: `1px solid ${theme.borderLight}` }}>
                <button
                  onClick={() => handleOpenEdit(offer)}
                  style={{ flex: 1, padding: '8px', backgroundColor: theme.cardBgSecondary, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '7px', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer' }}
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(offer.id)}
                  style={{ padding: '8px 14px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: '7px', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Offers;
