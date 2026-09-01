import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  COMPLETED: { color: '#059669', bg: 'rgba(5,150,105,0.12)' },
  PENDING: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  FAILED: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  REFUNDED: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  AUTHORIZED: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
};

const METHOD_ICONS: Record<string, string> = {
  UPI: '📱 UPI',
  CASH: '💵 Cash',
  CARD: '💳 Card',
};

export const Payments: React.FC = () => {
  const { theme } = useTheme();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const load = (p = 1) => {
    setLoading(true);
    setError(null);
    api.getPayments({
      status: statusFilter || undefined,
      paymentMethod: methodFilter || undefined,
      page: p
    })
      .then((d: any) => {
        setPayments(d.data || d);
        setMeta(d.meta || null);
      })
      .catch((e: any) => setError(e.message || 'Failed to load payments'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(page); }, [statusFilter, methodFilter, page]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const d = await api.getPaymentDetail(id);
      setSelectedPayment(d);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const totalVolume = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const completedVolume = payments.filter(p => p.status === 'COMPLETED').reduce((acc, p) => acc + (p.amount || 0), 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: theme.text }}>Financial Transactions & Payments</h1>
          <p style={{ margin: '4px 0 0', color: theme.textMuted, fontSize: '13.5px' }}>
            Monitor UPI, Cash, and Card ride transactions, gateway statuses, and settlements (All amounts in ₹ INR).
          </p>
        </div>
      </div>

      {/* Payment Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '18px', borderLeft: '4px solid #00b562' }}>
          <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>Gross Volume</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: theme.text, marginTop: '4px' }}>
            ₹{totalVolume.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '2px' }}>Total transaction value</div>
        </div>

        <div style={{ backgroundColor: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '18px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>Settled Volume</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#00b562', marginTop: '4px' }}>
            ₹{completedVolume.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '2px' }}>Completed payments</div>
        </div>

        <div style={{ backgroundColor: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '18px', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>Total Transactions</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: theme.text, marginTop: '4px' }}>
            {meta?.total ?? payments.length}
          </div>
          <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '2px' }}>Across all payment gateways</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: '10px 14px', border: `1.5px solid ${theme.border}`, borderRadius: '9px', fontSize: '13px', backgroundColor: theme.inputBg, color: theme.text, minWidth: '180px' }}
        >
          <option value="">All Payment Statuses</option>
          <option value="COMPLETED">✅ Completed / Successful</option>
          <option value="PENDING">⏳ Pending</option>
          <option value="FAILED">❌ Failed</option>
          <option value="REFUNDED">↩️ Refunded</option>
        </select>

        <select
          value={methodFilter}
          onChange={e => { setMethodFilter(e.target.value); setPage(1); }}
          style={{ padding: '10px 14px', border: `1.5px solid ${theme.border}`, borderRadius: '9px', fontSize: '13px', backgroundColor: theme.inputBg, color: theme.text, minWidth: '160px' }}
        >
          <option value="">All Payment Methods</option>
          <option value="UPI">📱 UPI Payments</option>
          <option value="CASH">💵 Cash Payments</option>
          <option value="CARD">💳 Card Payments</option>
        </select>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', borderLeft: '4px solid #ef4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Payments Table + Drawer */}
      <div style={{ display: 'grid', gridTemplateColumns: (!isMobile && selectedPayment) ? '1fr 380px' : '1fr', gap: '20px', alignItems: 'start' }}>
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: theme.textMuted }}>Loading financial transactions...</div>
          ) : (
            <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
              {payments.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', color: theme.textMuted, fontSize: '14px' }}>
                  No payment transactions found matching filters.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: theme.tableHeaderBg, borderBottom: `1px solid ${theme.border}` }}>
                        {['Tx ID / Ride', 'Customer', 'Captain / Driver', 'Amount (₹)', 'Method', 'Status', 'Date'].map(h => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: theme.textMuted, fontWeight: '700', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p: any) => {
                        const isSelected = selectedPayment?.id === p.id;
                        const s = STATUS_COLORS[p.status] || { color: theme.textMuted, bg: theme.badgeBg };
                        return (
                          <tr
                            key={p.id}
                            style={{ borderBottom: `1px solid ${theme.borderLight}`, cursor: 'pointer', backgroundColor: isSelected ? theme.primaryBg : 'transparent' }}
                            onClick={() => openDetail(p.id)}
                            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = theme.tableRowHover; }}
                            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <td style={{ padding: '14px 16px', color: theme.text }}>
                              <div style={{ fontWeight: '700', fontFamily: 'monospace', fontSize: '12px' }}>
                                {p.transactionId || `#${p.id.slice(0, 8)}`}
                              </div>
                              <div style={{ fontSize: '11px', color: theme.textMuted }}>
                                Ride: #{p.ride?.id?.slice(0, 8) || p.rideId?.slice(0, 8)}
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px', color: theme.text }}>
                              <div style={{ fontWeight: '600' }}>{p.ride?.customer?.name || 'Customer'}</div>
                              <div style={{ fontSize: '11px', color: theme.textMuted }}>{p.ride?.customer?.phone || '—'}</div>
                            </td>
                            <td style={{ padding: '14px 16px', color: theme.text }}>
                              <div style={{ fontWeight: '600' }}>{p.ride?.driver?.name || <em style={{ color: theme.textMuted }}>None</em>}</div>
                            </td>
                            <td style={{ padding: '14px 16px', fontWeight: '800', color: theme.text, fontSize: '14px' }}>
                              ₹{p.amount?.toFixed(2)}
                            </td>
                            <td style={{ padding: '14px 16px', color: theme.text, fontWeight: '600' }}>
                              {METHOD_ICONS[p.paymentMethod] || p.paymentMethod}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: s.color, backgroundColor: s.bg }}>
                                {p.status}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px', color: theme.textMuted, fontSize: '12px' }}>
                              {new Date(p.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '18px' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ padding: '7px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, backgroundColor: theme.cardBg, cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '13px', color: theme.text }}
              >
                ← Prev
              </button>
              <span style={{ padding: '7px 14px', fontSize: '13px', color: theme.textMuted }}>
                Page {page} of {meta.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                style={{ padding: '7px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, backgroundColor: theme.cardBg, cursor: page === meta.totalPages ? 'not-allowed' : 'pointer', fontSize: '13px', color: theme.text }}
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Side Payment Detail Drawer */}
        {selectedPayment && (
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '22px', position: 'sticky', top: '20px', maxHeight: '88vh', overflowY: 'auto' }}>
            {detailLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: theme.textMuted }}>Loading details...</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: theme.text }}>Transaction Receipt</h3>
                    <span style={{ fontSize: '11px', color: theme.textMuted, fontFamily: 'monospace' }}>Tx: {selectedPayment.id}</span>
                  </div>
                  <button onClick={() => setSelectedPayment(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: theme.textMuted }}>✕</button>
                </div>

                <div style={{ backgroundColor: theme.cardBgSecondary, borderRadius: '12px', padding: '16px', marginBottom: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: theme.textMuted, textTransform: 'uppercase', fontWeight: '700' }}>Amount Charged</div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#00b562', marginTop: '2px' }}>₹{selectedPayment.amount?.toFixed(2)}</div>
                  <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '2px' }}>
                    Method: {METHOD_ICONS[selectedPayment.paymentMethod] || selectedPayment.paymentMethod}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: theme.textMuted }}>
                    <span>Gateway Provider</span>
                    <strong style={{ color: theme.text }}>{selectedPayment.provider || 'UPI Direct / Razorpay'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: theme.textMuted }}>
                    <span>Transaction ID</span>
                    <span style={{ fontFamily: 'monospace', color: theme.text }}>{selectedPayment.transactionId || 'MOCK-TX-100'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: theme.textMuted }}>
                    <span>Payment Status</span>
                    <strong style={{ color: selectedPayment.status === 'COMPLETED' ? '#00b562' : '#f59e0b' }}>{selectedPayment.status}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: theme.textMuted }}>
                    <span>Timestamp</span>
                    <span style={{ color: theme.text }}>{new Date(selectedPayment.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* Ride route snapshot */}
                {selectedPayment.ride && (
                  <div style={{ backgroundColor: theme.cardBgSecondary, borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '10.5px', color: theme.textMuted, fontWeight: '800', textTransform: 'uppercase', marginBottom: '6px' }}>Associated Trip</div>
                    <div style={{ fontSize: '12.5px', color: theme.text, fontWeight: '600' }}>📍 {selectedPayment.ride.pickupAddress}</div>
                    <div style={{ fontSize: '12.5px', color: theme.text, marginTop: '4px', fontWeight: '600' }}>🏁 {selectedPayment.ride.dropoffAddress}</div>
                    <div style={{ fontSize: '11.5px', color: theme.textMuted, marginTop: '6px' }}>
                      Vehicle: {selectedPayment.ride.vehicleType} · Status: {selectedPayment.ride.status}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Payments;
