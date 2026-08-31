import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', backgroundColor: '#fff', color: '#0f172a' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' };

const emptyForm = { title: '', description: '', discountValue: '', couponCode: '', startDate: '', endDate: '', isActive: true };

export const Offers: React.FC = () => {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const load = () => {
    setLoading(true); setError(null);
    api.getOffers()
      .then(d => setOffers(Array.isArray(d) ? d : []))
      .catch(e => setError(e.message || 'Failed to load offers'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ ...emptyForm }); setEditId(null); setShowForm(true); setFormError(null); setFormSuccess(null); };
  const openEdit = (o: any) => {
    setForm({ title: o.title, description: o.description, discountValue: String(o.discountValue || ''), couponCode: o.couponCode || '', startDate: o.startDate?.slice(0, 10) || '', endDate: o.endDate?.slice(0, 10) || '', isActive: o.isActive });
    setEditId(o.id); setShowForm(true); setFormError(null); setFormSuccess(null);
  };
  const closeForm = () => { setShowForm(false); setEditId(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.startDate || !form.endDate) { setFormError('Title, description, start and end dates are required.'); return; }
    setSubmitting(true); setFormError(null); setFormSuccess(null);
    try {
      const payload = { ...form, discountValue: parseFloat(form.discountValue) || 0 };
      if (editId) { await api.updateOffer(editId, payload); setFormSuccess('Offer updated!'); }
      else { await api.createOffer(payload); setFormSuccess('Offer created and customers notified!'); }
      load(); closeForm();
    } catch (e: any) {
      setFormError(e.message || 'Failed to save offer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete offer "${title}"? This cannot be undone.`)) return;
    try { await api.deleteOffer(id); load(); }
    catch (e: any) { alert(e.message); }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try { await api.updateOffer(id, { isActive: !current }); load(); }
    catch (e: any) { alert(e.message); }
  };

  const isExpired = (endDate: string) => new Date(endDate) < new Date();
  const isActive = (o: any) => o.isActive && !isExpired(o.endDate);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>Offers & Promotions</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>Create and manage promotional offers for customers.</p>
        </div>
        <button onClick={openCreate} style={{ padding: '10px 20px', backgroundColor: '#00b562', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
          + Create Offer
        </button>
      </div>

      {error && <div style={{ backgroundColor: '#fff5f5', color: '#e53e3e', borderLeft: '4px solid #ef4444', padding: '14px 18px', borderRadius: '8px', marginBottom: '16px' }}>⚠️ {error}</div>}
      {formError && <div style={{ backgroundColor: '#fff5f5', color: '#e53e3e', borderLeft: '4px solid #ef4444', padding: '14px 18px', borderRadius: '8px', marginBottom: '16px' }}>⚠️ {formError}</div>}
      {formSuccess && <div style={{ backgroundColor: '#f0fdf4', color: '#15803d', borderLeft: '4px solid #00b562', padding: '14px 18px', borderRadius: '8px', marginBottom: '16px' }}>✅ {formSuccess}</div>}

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '28px', width: '500px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>{editId ? '✏️ Edit Offer' : '🎁 Create New Offer'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="e.g. 20% off first ride" /></div>
              <div><label style={labelStyle}>Description</label><textarea style={{ ...inputStyle, height: '80px', resize: 'vertical' } as any} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required placeholder="Offer details" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label style={labelStyle}>Discount (₹ or %)</label><input type="number" step="0.01" style={inputStyle} value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))} placeholder="20" /></div>
                <div><label style={labelStyle}>Coupon Code (optional)</label><input style={inputStyle} value={form.couponCode} onChange={e => setForm(f => ({ ...f, couponCode: e.target.value }))} placeholder="RIDE20" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label style={labelStyle}>Start Date</label><input type="date" style={inputStyle} value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required /></div>
                <div><label style={labelStyle}>End Date</label><input type="date" style={inputStyle} value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required /></div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#475569' }}>
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                Active (visible to customers)
              </label>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="submit" disabled={submitting} style={{ flex: 1, padding: '11px', backgroundColor: '#00b562', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer' }}>{submitting ? 'Saving...' : 'Save Offer'}</button>
                <button type="button" onClick={closeForm} style={{ flex: 1, padding: '11px', backgroundColor: '#f1f5f9', color: '#0f172a', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>Loading offers...</div>}
      {!loading && offers.length === 0 && <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px' }}>🎁 No offers yet. Create your first offer!</div>}

      {!loading && offers.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
          {offers.map((o: any) => {
            const active = isActive(o);
            const expired = isExpired(o.endDate);
            return (
              <div key={o.id} style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', opacity: expired ? 0.7 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <span style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>🎁 {o.title}</span>
                  <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: active ? '#15803d' : expired ? '#94a3b8' : '#92400e', backgroundColor: active ? '#dcfce7' : expired ? '#f1f5f9' : '#fef3c7' }}>
                    {expired ? 'Expired' : active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p style={{ margin: '0 0 10px', color: '#64748b', fontSize: '13px', lineHeight: 1.5 }}>{o.description}</p>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#475569', marginBottom: '14px', flexWrap: 'wrap' }}>
                  {o.discountValue > 0 && <span>💰 ₹{o.discountValue} off</span>}
                  {o.couponCode && <span>🏷️ {o.couponCode}</span>}
                  <span>📅 {new Date(o.startDate).toLocaleDateString()} – {new Date(o.endDate).toLocaleDateString()}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button onClick={() => openEdit(o)} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#f1f5f9', color: '#0f172a', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>✏️ Edit</button>
                  <button onClick={() => handleToggleActive(o.id, o.isActive)} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: o.isActive ? '#fef3c7' : '#dcfce7', color: o.isActive ? '#92400e' : '#15803d', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                    {o.isActive ? '⏸ Deactivate' : '▶ Activate'}
                  </button>
                  <button onClick={() => handleDelete(o.id, o.title)} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#fff5f5', color: '#e53e3e', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>🗑 Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Offers;
