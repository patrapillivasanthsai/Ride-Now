import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  COMPLETED: { color: '#059669', bg: '#ecfdf5' },
  PENDING: { color: '#d97706', bg: '#fffbeb' },
  FAILED: { color: '#ef4444', bg: '#fff5f5' },
  REFUNDED: { color: '#7c3aed', bg: '#f5f3ff' },
};

const paymentMethodIcon = (m: string) => ({ CASH: '💵', UPI: '📱', CARD: '💳', STRIPE: '💳' }[m] || '💳');

const statusBadge = (status: string) => {
  const s = STATUS_COLORS[status] || { color: '#64748b', bg: '#f1f5f9' };
  return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: s.color, backgroundColor: s.bg }}>{status}</span>;
};

export const Payments: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);

  const load = (p = 1) => {
    setLoading(true); setError(null);
    api.getPayments({ status: statusFilter || undefined, paymentMethod: methodFilter || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, page: p })
      .then((d: any) => { setPayments(d.data || d); setMeta(d.meta || null); })
      .catch(e => setError(e.message || 'Failed to load payments'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(page); }, [statusFilter, methodFilter, page]);

  const applyDateFilter = () => { setPage(1); load(1); };

  const handleInspect = async (id: string) => {
    setLoadingDetail(true);
    try { const d = await api.getPaymentDetail(id); setSelectedPayment(d); }
    catch (e: any) { alert(e.message); }
    finally { setLoadingDetail(false); }
  };

  // Aggregate stats from loaded payments
  const totalRevenue = payments.filter(p => p.status === 'COMPLETED').reduce((sum, p) => sum + p.amount, 0);
  const failedCount = payments.filter(p => p.status === 'FAILED').length;
  const pendingCount = payments.filter(p => p.status === 'PENDING').length;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>Payments</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>Transaction ledger and payment monitoring. {meta ? `${meta.total} total.` : ''}</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Revenue (this page)', value: `₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: '#00b562', icon: '💰' },
          { label: 'Failed Payments', value: String(failedCount), color: '#ef4444', icon: '❌' },
          { label: 'Pending', value: String(pendingCount), color: '#f59e0b', icon: '⏳' },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: '#fff', borderRadius: '10px', border: `1px solid #e2e8f0`, padding: '16px 20px', borderLeft: `4px solid ${s.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>{s.label}</div>
              </div>
              <span style={{ fontSize: '24px' }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', color: '#0f172a' }}>
          <option value="">All Statuses</option>
          <option value="COMPLETED">✅ Completed</option>
          <option value="PENDING">⏳ Pending</option>
          <option value="FAILED">❌ Failed</option>
          <option value="REFUNDED">🔄 Refunded</option>
        </select>
        <select value={methodFilter} onChange={e => { setMethodFilter(e.target.value); setPage(1); }}
          style={{ padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', color: '#0f172a' }}>
          <option value="">All Methods</option>
          <option value="CASH">💵 Cash</option>
          <option value="UPI">📱 UPI</option>
          <option value="CARD">💳 Card</option>
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          style={{ padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', color: '#0f172a' }} />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          style={{ padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', color: '#0f172a' }} />
        <button onClick={applyDateFilter} style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#0f172a', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>Apply</button>
        {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); load(1); }} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#64748b', fontSize: '13px', cursor: 'pointer' }}>Clear Dates</button>}
      </div>

      {error && <div style={{ backgroundColor: '#fff5f5', color: '#e53e3e', borderLeft: '4px solid #ef4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>⚠️ {error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: selectedPayment ? '1fr 340px' : '1fr', gap: '20px', alignItems: 'start' }}>
        <div>
          {loading ? <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>Loading payments...</div> : (
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {payments.length === 0
                ? <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>No payment records found.</div>
                : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                        {['Amount', 'Method', 'Status', 'Customer', 'Date', 'Detail'].map(h => (
                          <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: '#475569', fontWeight: '700', fontSize: '12px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p: any) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: selectedPayment?.id === p.id ? '#f8faff' : '#fff' }}>
                          <td style={{ padding: '12px 14px', fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>₹{p.amount?.toFixed(2)}</td>
                          <td style={{ padding: '12px 14px', color: '#334155' }}>{paymentMethodIcon(p.paymentMethod || p.provider)} {p.paymentMethod || p.provider}</td>
                          <td style={{ padding: '12px 14px' }}>{statusBadge(p.status)}</td>
                          <td style={{ padding: '12px 14px', color: '#475569' }}>{p.ride?.customer?.name || '—'}</td>
                          <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: '12px' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <button onClick={() => handleInspect(p.id)} style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#f1f5f9', color: '#0f172a', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                              {loadingDetail ? '...' : 'Inspect →'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '13px', color: '#475569' }}>← Prev</button>
              <span style={{ padding: '7px 14px', fontSize: '13px', color: '#64748b' }}>Page {page} of {meta.totalPages}</span>
              <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}
                style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: page === meta.totalPages ? 'not-allowed' : 'pointer', fontSize: '13px', color: '#475569' }}>Next →</button>
            </div>
          )}
        </div>

        {/* Detail Drawer */}
        {selectedPayment && (
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', position: 'sticky', top: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Transaction Detail</h3>
              <button onClick={() => setSelectedPayment(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            <div style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>₹{selectedPayment.amount?.toFixed(2)}</div>
            <div style={{ marginBottom: '16px' }}>{statusBadge(selectedPayment.status)}</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              {[
                ['Method', `${paymentMethodIcon(selectedPayment.paymentMethod || selectedPayment.provider)} ${selectedPayment.paymentMethod || selectedPayment.provider}`],
                ['Transaction ID', selectedPayment.id?.slice(-12)],
                ['Date', new Date(selectedPayment.createdAt).toLocaleString()],
                selectedPayment.ride && ['Ride ID', selectedPayment.ride?.id?.slice(-12)],
                selectedPayment.ride?.customer && ['Customer', selectedPayment.ride.customer.name],
                selectedPayment.ride?.driver && ['Driver', selectedPayment.ride.driver?.name],
              ].filter(Boolean).map(([k, v]) => (
                <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#94a3b8' }}>{k}</span>
                  <span style={{ fontWeight: '600', color: '#334155', textAlign: 'right', maxWidth: '160px', wordBreak: 'break-all' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payments;
