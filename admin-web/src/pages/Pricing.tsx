import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface PricingTier {
  id?: string;
  vehicleType: string;
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  minimumFare: number;
}

const VEHICLE_CONFIG: Record<string, { label: string; icon: string; color: string; desc: string }> = {
  BIKE: { label: 'Bike / Moto', icon: '🏍️', color: '#00b562', desc: 'Fastest 1-passenger commute through city traffic' },
  AUTO: { label: 'Auto Rickshaw', icon: '🛺', color: '#f59e0b', desc: 'Affordable 3-wheeler for quick suburban hops' },
  CAB: { label: 'Premium Cab', icon: '🚗', color: '#3b82f6', desc: 'Air-conditioned 4-seater comfortable sedans' },
};

export const Pricing: React.FC = () => {
  const { theme } = useTheme();
  const [pricingList, setPricingList] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null);
  const [saving, setSaving] = useState(false);

  // Live Simulator State
  const [simDistanceKm, setSimDistanceKm] = useState<number>(5);
  const [simDurationMin, setSimDurationMin] = useState<number>(15);

  const loadPricing = () => {
    setLoading(true);
    setError(null);
    api.getPricing()
      .then((data: any) => {
        setPricingList(Array.isArray(data) ? data : []);
      })
      .catch(e => setError(e.message || 'Failed to load pricing config'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPricing(); }, []);

  const handleSaveTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTier) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.updatePricing(editingTier.vehicleType, {
        baseFare: Number(editingTier.baseFare),
        perKmRate: Number(editingTier.perKmRate),
        perMinuteRate: Number(editingTier.perMinuteRate),
        minimumFare: Number(editingTier.minimumFare || 0),
      });
      setSuccess(`Updated pricing for ${editingTier.vehicleType} successfully!`);
      setEditingTier(null);
      loadPricing();
    } catch (e: any) {
      setError(e.message || 'Failed to update pricing');
    } finally {
      setSaving(false);
    }
  };

  const calculateSimulatedFare = (tier: PricingTier) => {
    const rawFare = tier.baseFare + (simDistanceKm * tier.perKmRate) + (simDurationMin * tier.perMinuteRate);
    return Math.max(rawFare, tier.minimumFare || 0);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: theme.text }}>Fare Pricing & Rates (₹ INR)</h1>
          <p style={{ margin: '4px 0 0', color: theme.textMuted, fontSize: '13.5px' }}>
            Control base fares, per-kilometre, and per-minute tariffs for Bike, Auto, and Cab tiers.
          </p>
        </div>
      </div>

      {success && (
        <div style={{ backgroundColor: 'rgba(0,181,98,0.1)', color: '#00b562', borderLeft: '4px solid #00b562', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '13.5px', fontWeight: '600' }}>
          ✅ {success}
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', borderLeft: '4px solid #ef4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '13.5px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Edit Pricing Modal */}
      {editingTier && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '16px', padding: '28px', width: '480px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `1px solid ${theme.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>{VEHICLE_CONFIG[editingTier.vehicleType]?.icon || '🚖'}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: theme.text }}>Edit {editingTier.vehicleType} Rates</h3>
                  <div style={{ fontSize: '12px', color: theme.textMuted }}>All monetary values are in Indian Rupees (₹)</div>
                </div>
              </div>
              <button onClick={() => setEditingTier(null)} style={{ background: 'none', border: 'none', fontSize: '20px', color: theme.textMuted, cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSaveTier} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', marginBottom: '6px' }}>Base Fare (₹)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={editingTier.baseFare}
                  onChange={e => setEditingTier({ ...editingTier, baseFare: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1.5px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.text, fontSize: '14px', fontWeight: '700', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', marginBottom: '6px' }}>Per-Kilometre Rate (₹ / km)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  value={editingTier.perKmRate}
                  onChange={e => setEditingTier({ ...editingTier, perKmRate: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1.5px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.text, fontSize: '14px', fontWeight: '700', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', marginBottom: '6px' }}>Per-Minute Rate (₹ / min)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={editingTier.perMinuteRate}
                  onChange={e => setEditingTier({ ...editingTier, perMinuteRate: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1.5px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.text, fontSize: '14px', fontWeight: '700', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', marginBottom: '6px' }}>Minimum Fare Floor (₹)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={editingTier.minimumFare}
                  onChange={e => setEditingTier({ ...editingTier, minimumFare: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1.5px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.text, fontSize: '14px', fontWeight: '700', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ flex: 1, padding: '12px', backgroundColor: '#00b562', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer' }}
                >
                  {saving ? 'Saving...' : '💾 Save Rates'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTier(null)}
                  style={{ flex: 1, padding: '12px', backgroundColor: theme.cardBgSecondary, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: theme.textMuted }}>Loading pricing configurations...</div>
      ) : (
        <>
          {/* Active Pricing Cards for Bike, Auto, Cab */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            {pricingList.map((tier) => {
              const cfg = VEHICLE_CONFIG[tier.vehicleType] || { label: tier.vehicleType, icon: '🚖', color: '#00b562', desc: 'Standard Transport' };
              return (
                <div
                  key={tier.vehicleType}
                  style={{
                    backgroundColor: theme.cardBg,
                    borderRadius: '16px',
                    border: `1px solid ${theme.border}`,
                    padding: '24px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    borderTop: `4px solid ${cfg.color}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '28px' }}>{cfg.icon}</span>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: theme.text }}>{cfg.label}</h3>
                          <span style={{ fontSize: '11.5px', color: theme.textMuted }}>{cfg.desc}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '20px 0' }}>
                      {[
                        ['Base Fare', `₹${tier.baseFare}`],
                        ['Distance Rate', `₹${tier.perKmRate} / km`],
                        ['Time Rate', `₹${tier.perMinuteRate} / min`],
                        ['Minimum Fare Floor', `₹${tier.minimumFare || 0}`],
                      ].map(([label, val]) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: theme.cardBgSecondary, borderRadius: '8px' }}>
                          <span style={{ fontSize: '12.5px', color: theme.textMuted, fontWeight: '600' }}>{label}</span>
                          <span style={{ fontSize: '13.5px', fontWeight: '800', color: theme.text }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setEditingTier(tier)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: theme.primaryBg,
                      color: theme.primary,
                      border: `1px solid ${theme.primary}40`,
                      borderRadius: '8px',
                      fontWeight: '800',
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    ✏️ Adjust {tier.vehicleType} Rates
                  </button>
                </div>
              );
            })}
          </div>

          {/* Dynamic Interactive Fare Simulator */}
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '16px', border: `1px solid ${theme.border}`, padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: theme.text }}>⚡ Dynamic Interactive Fare Simulator</h3>
                <p style={{ margin: '4px 0 0', color: theme.textMuted, fontSize: '13px' }}>
                  Simulate and compare estimated passenger fares and driver payouts for custom ride distances and durations.
                </p>
              </div>
            </div>

            {/* Slider Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '28px' }}>
              <div style={{ backgroundColor: theme.cardBgSecondary, padding: '16px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: theme.text }}>Trip Distance</span>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#00b562' }}>{simDistanceKm} km</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="0.5"
                  value={simDistanceKm}
                  onChange={e => setSimDistanceKm(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#00b562', cursor: 'pointer' }}
                />
              </div>

              <div style={{ backgroundColor: theme.cardBgSecondary, padding: '16px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: theme.text }}>Estimated Trip Duration</span>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#3b82f6' }}>{simDurationMin} mins</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="120"
                  step="1"
                  value={simDurationMin}
                  onChange={e => setSimDurationMin(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Simulated Live Outputs Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              {pricingList.map(tier => {
                const estFare = calculateSimulatedFare(tier);
                const captainPayout = (estFare * 0.80).toFixed(0);
                const platformShare = (estFare * 0.20).toFixed(0);
                const cfg = VEHICLE_CONFIG[tier.vehicleType] || { label: tier.vehicleType, icon: '🚖', color: '#00b562' };

                return (
                  <div key={tier.vehicleType} style={{ border: `1.5px solid ${cfg.color}`, borderRadius: '14px', padding: '18px', backgroundColor: theme.cardBg }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '22px' }}>{cfg.icon}</span>
                      <span style={{ fontSize: '15px', fontWeight: '800', color: theme.text }}>{cfg.label}</span>
                    </div>

                    <div style={{ fontSize: '28px', fontWeight: '800', color: cfg.color, marginBottom: '12px' }}>
                      ₹{estFare.toFixed(0)}
                    </div>

                    <div style={{ fontSize: '11.5px', color: theme.textMuted, display: 'flex', flexDirection: 'column', gap: '4px', borderTop: `1px solid ${theme.borderLight}`, paddingTop: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Base Fare:</span>
                        <span style={{ fontWeight: '600', color: theme.text }}>₹{tier.baseFare}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Distance ({simDistanceKm}km @ ₹{tier.perKmRate}):</span>
                        <span style={{ fontWeight: '600', color: theme.text }}>₹{(simDistanceKm * tier.perKmRate).toFixed(1)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Time ({simDurationMin}m @ ₹{tier.perMinuteRate}):</span>
                        <span style={{ fontWeight: '600', color: theme.text }}>₹{(simDurationMin * tier.perMinuteRate).toFixed(1)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', paddingTop: '6px', borderTop: `1px solid ${theme.borderLight}`, fontWeight: '700' }}>
                        <span style={{ color: '#00b562' }}>Captain Payout (80%):</span>
                        <span style={{ color: '#00b562' }}>₹{captainPayout}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700' }}>
                        <span style={{ color: '#6366f1' }}>Platform Fee (20%):</span>
                        <span style={{ color: '#6366f1' }}>₹{platformShare}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Pricing;
