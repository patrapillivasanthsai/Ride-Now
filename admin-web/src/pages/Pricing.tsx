import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', backgroundColor: '#fff', color: '#0f172a' };

const vehicleIcon = (v: string) => ({ BIKE: '🏍️', AUTO: '🛺', CAB: '🚗' }[v] || '🚖');

export const Pricing: React.FC = () => {
  const [pricingList, setPricingList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [baseFare, setBaseFare] = useState('');
  const [perKmRate, setPerKmRate] = useState('');
  const [perMinuteRate, setPerMinuteRate] = useState('');
  const [minimumFare, setMinimumFare] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPricing = () => {
    setLoading(true); setError(null);
    api.getPricing()
      .then((data) => setPricingList(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || 'Failed to fetch pricing rates.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPricing(); }, []);

  const handleEditClick = (pricing: any) => {
    setEditingType(pricing.vehicleType);
    setBaseFare(pricing.baseFare.toString());
    setPerKmRate(pricing.perKmRate.toString());
    setPerMinuteRate(pricing.perMinuteRate.toString());
    setMinimumFare((pricing.minimumFare ?? 0).toString());
    setSuccess(null); setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType) return;
    setError(null); setSuccess(null); setSubmitting(true);
    try {
      const base = parseFloat(baseFare);
      const km = parseFloat(perKmRate);
      const min = parseFloat(perMinuteRate);
      const minFare = parseFloat(minimumFare) || 0;
      if (isNaN(base) || isNaN(km) || isNaN(min) || base < 0 || km < 0 || min < 0 || minFare < 0) {
        throw new Error('All rates must be non-negative valid numbers');
      }
      await api.updatePricing(editingType, { baseFare: base, perKmRate: km, perMinuteRate: min, minimumFare: minFare });
      setSuccess(`${editingType} pricing saved successfully.`);
      setEditingType(null);
      fetchPricing();
    } catch (err: any) {
      setError(err.message || 'Failed to save pricing rates');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>Pricing Rules Engine</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>Configure billing parameters for each vehicle class in Indian Rupees (₹).</p>
      </div>

      {error && <div style={{ backgroundColor: '#fff5f5', color: '#e53e3e', borderLeft: '4px solid #ef4444', padding: '14px 18px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>⚠️ {error}</div>}
      {success && <div style={{ backgroundColor: '#f0fdf4', color: '#15803d', borderLeft: '4px solid #00b562', padding: '14px 18px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>✅ {success}</div>}

      {loading && <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Loading pricing configs...</div>}

      {!loading && (
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Pricing Cards */}
          <div style={{ flex: '2 1 520px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pricingList.map((price) => (
              <div key={price.id} style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '26px' }}>{vehicleIcon(price.vehicleType)}</span>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a' }}>{price.vehicleType}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>Vehicle pricing class</div>
                    </div>
                  </div>
                  <button onClick={() => editingType === price.vehicleType ? setEditingType(null) : handleEditClick(price)}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: editingType === price.vehicleType ? '#f1f5f9' : '#0f172a', color: editingType === price.vehicleType ? '#0f172a' : '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                    {editingType === price.vehicleType ? 'Close' : '✏️ Edit'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {[
                    { label: 'Base Fare', value: price.baseFare },
                    { label: 'Per KM', value: price.perKmRate },
                    { label: 'Per Minute', value: price.perMinuteRate },
                    { label: 'Minimum Fare', value: price.minimumFare ?? 0 },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>₹{value.toFixed(2)}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Edit Panel */}
          {editingType && (
            <div style={{ flex: '1 1 280px', backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px', position: 'sticky', top: '20px' }}>
              <h3 style={{ margin: '0 0 18px 0', fontSize: '16px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {vehicleIcon(editingType)} Edit {editingType}
              </h3>
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { label: 'Base Fare (₹)', value: baseFare, setter: setBaseFare },
                  { label: 'Per Km Rate (₹)', value: perKmRate, setter: setPerKmRate },
                  { label: 'Per Minute Rate (₹)', value: perMinuteRate, setter: setPerMinuteRate },
                  { label: 'Minimum Fare (₹)', value: minimumFare, setter: setMinimumFare },
                ].map(({ label, value, setter }) => (
                  <div key={label}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
                    <input type="number" step="0.01" value={value} onChange={e => setter(e.target.value)} style={inputStyle} required />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button type="submit" disabled={submitting} style={{ flex: 1, padding: '11px', backgroundColor: '#00b562', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? 'Saving...' : '💾 Save'}
                  </button>
                  <button type="button" onClick={() => setEditingType(null)} style={{ flex: 1, padding: '11px', backgroundColor: '#f1f5f9', color: '#0f172a', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Pricing;
