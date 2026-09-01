import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

export const Customers: React.FC = () => {
  const { theme } = useTheme();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [suspendFilter, setSuspendFilter] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [customerToSuspend, setCustomerToSuspend] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const load = () => {
    setLoading(true);
    setError(null);
    const params: any = {};
    if (search) params.search = search;
    if (suspendFilter === 'suspended') params.isSuspended = true;
    if (suspendFilter === 'active') params.isSuspended = false;

    api.getCustomers(params)
      .then((d: any) => setCustomers(Array.isArray(d) ? d : []))
      .catch(e => setError(e.message || 'Failed to load customers'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [suspendFilter]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const d = await api.getCustomerDetail(id);
      setSelectedCustomer(d);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const openSuspendModal = (id: string) => {
    setCustomerToSuspend(id);
    setSuspendReason('Fraudulent behavior / Terms violation');
    setShowSuspendModal(true);
  };

  const handleConfirmSuspend = async () => {
    if (!customerToSuspend || !suspendReason.trim()) return;
    setActionLoading(customerToSuspend);
    try {
      await api.suspendCustomer(customerToSuspend, suspendReason);
      setShowSuspendModal(false);
      setCustomerToSuspend(null);
      showToast('Customer account suspended.');
      load();
      if (selectedCustomer?.id === customerToSuspend) {
        openDetail(customerToSuspend);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (id: string) => {
    setActionLoading(id);
    try {
      await api.reactivateCustomer(id);
      showToast('Customer account reactivated.');
      load();
      if (selectedCustomer?.id === id) openDetail(id);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
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

      {/* Suspend Customer Modal */}
      {showSuspendModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '16px', padding: '28px', width: '460px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `1px solid ${theme.border}` }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '800', color: '#ef4444' }}>⛔ Suspend Customer Account</h3>
            <p style={{ fontSize: '13px', color: theme.textMuted, marginBottom: '16px' }}>
              Suspending this customer will prevent them from booking rides and logging in.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: theme.textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>Reason for Suspension</label>
              <textarea
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1.5px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.text, fontSize: '13px', boxSizing: 'border-box' }}
                placeholder="Specify reason for suspension..."
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleConfirmSuspend}
                disabled={actionLoading !== null || !suspendReason.trim()}
                style={{ flex: 1, padding: '11px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: actionLoading ? 'not-allowed' : 'pointer' }}
              >
                {actionLoading ? 'Suspending...' : 'Confirm Suspension'}
              </button>
              <button
                onClick={() => setShowSuspendModal(false)}
                style={{ flex: 1, padding: '11px', backgroundColor: theme.cardBgSecondary, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: theme.text }}>Customers Directory</h1>
          <p style={{ margin: '4px 0 0', color: theme.textMuted, fontSize: '13.5px' }}>
            Manage rider accounts, view trip and spending history, and moderate access.
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '260px' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by Name, Email, Phone..."
            style={{
              flex: 1,
              padding: '10px 14px',
              border: `1.5px solid ${theme.border}`,
              borderRadius: '9px',
              fontSize: '13.5px',
              backgroundColor: theme.inputBg,
              color: theme.text,
            }}
          />
          <button
            type="submit"
            style={{ padding: '10px 18px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '9px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
          >
            Search
          </button>
        </form>

        <select
          value={suspendFilter}
          onChange={e => setSuspendFilter(e.target.value)}
          style={{ padding: '10px 14px', border: `1.5px solid ${theme.border}`, borderRadius: '9px', fontSize: '13px', backgroundColor: theme.inputBg, color: theme.text }}
        >
          <option value="">All Accounts</option>
          <option value="active">✅ Active Accounts</option>
          <option value="suspended">⛔ Suspended Accounts</option>
        </select>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', borderLeft: '4px solid #ef4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Main Grid: Customers Table + Detail Drawer */}
      <div style={{ display: 'grid', gridTemplateColumns: (!isMobile && selectedCustomer) ? '1fr 380px' : '1fr', gap: '20px', alignItems: 'start' }}>
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: theme.textMuted }}>Loading customers...</div>
          ) : (
            <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
              {customers.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', color: theme.textMuted, fontSize: '14px' }}>
                  No customers found matching search.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: theme.tableHeaderBg, borderBottom: `1px solid ${theme.border}` }}>
                        {['Customer Name', 'Contact Info', 'Total Rides', 'Total Spent (₹)', 'Account Status', 'Joined Date', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: theme.textMuted, fontWeight: '700', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((c: any) => {
                        const isSelected = selectedCustomer?.id === c.id;
                        return (
                          <tr
                            key={c.id}
                            style={{ borderBottom: `1px solid ${theme.borderLight}`, cursor: 'pointer', backgroundColor: isSelected ? theme.primaryBg : 'transparent' }}
                            onClick={() => openDetail(c.id)}
                            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = theme.tableRowHover; }}
                            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <td style={{ padding: '14px 16px', fontWeight: '700', color: theme.text }}>
                              {c.name || 'Anonymous Customer'}
                            </td>
                            <td style={{ padding: '14px 16px', color: theme.text }}>
                              <div>{c.email || c.user?.email}</div>
                              {c.phone && <div style={{ fontSize: '11.5px', color: theme.textMuted }}>📞 {c.phone}</div>}
                            </td>
                            <td style={{ padding: '14px 16px', fontWeight: '700', color: theme.text }}>
                              {c.totalRides ?? 0}
                            </td>
                            <td style={{ padding: '14px 16px', fontWeight: '800', color: theme.text }}>
                              ₹{(c.totalSpent ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              {c.isSuspended ? (
                                <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' }}>
                                  ⛔ Suspended
                                </span>
                              ) : (
                                <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', color: '#059669', backgroundColor: 'rgba(5,150,105,0.1)' }}>
                                  ● Active
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '14px 16px', color: theme.textMuted, fontSize: '12px' }}>
                              {new Date(c.createdAt).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
                              {c.isSuspended ? (
                                <button
                                  onClick={() => handleReactivate(c.id)}
                                  disabled={actionLoading === c.id}
                                  style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(0,181,98,0.1)', color: '#00b562', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                >
                                  ▶ Reactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => openSuspendModal(c.id)}
                                  disabled={actionLoading === c.id}
                                  style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                >
                                  ⛔ Suspend
                                </button>
                              )}
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
        </div>

        {/* Side Customer Detail Drawer */}
        {selectedCustomer && (
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '22px', position: 'sticky', top: '20px', maxHeight: '88vh', overflowY: 'auto' }}>
            {detailLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: theme.textMuted }}>Loading profile...</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: theme.text }}>Customer Profile</h3>
                    <span style={{ fontSize: '11px', color: theme.textMuted, fontFamily: 'monospace' }}>ID: {selectedCustomer.id}</span>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: theme.textMuted }}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: theme.text }}>{selectedCustomer.name}</div>
                    <div style={{ fontSize: '13px', color: theme.textMuted }}>{selectedCustomer.email || selectedCustomer.user?.email}</div>
                    {selectedCustomer.phone && <div style={{ fontSize: '13px', color: theme.textMuted }}>📞 {selectedCustomer.phone}</div>}
                  </div>

                  {selectedCustomer.isSuspended && (
                    <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: '700' }}>⛔ Account Suspended</div>
                      {selectedCustomer.suspendReason && (
                        <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '4px' }}>Reason: {selectedCustomer.suspendReason}</div>
                      )}
                    </div>
                  )}

                  {/* Summary Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      ['Total Rides', selectedCustomer.totalRides ?? 0, '🚖'],
                      ['Completed', selectedCustomer.completedRides ?? 0, '✅'],
                      ['Cancelled', selectedCustomer.cancelledRides ?? 0, '❌'],
                      ['Total Spent', `₹${(selectedCustomer.totalSpent ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, '💰'],
                    ].map(([l, v, i]) => (
                      <div key={l as string} style={{ backgroundColor: theme.cardBgSecondary, borderRadius: '10px', padding: '12px' }}>
                        <div style={{ fontSize: '18px', marginBottom: '2px' }}>{i}</div>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: theme.text }}>{v}</div>
                        <div style={{ fontSize: '11px', color: theme.textMuted }}>{l}</div>
                      </div>
                    ))}
                  </div>

                  {/* Additional info */}
                  <div style={{ fontSize: '12px', color: theme.textMuted }}>
                    Default Payment: <strong style={{ color: theme.text }}>{selectedCustomer.defaultPaymentMethod || 'CARD'}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: theme.textMuted }}>
                    Member since {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                  </div>

                  {/* Suspend / Reactivate button */}
                  <div>
                    {selectedCustomer.isSuspended ? (
                      <button
                        onClick={() => handleReactivate(selectedCustomer.id)}
                        style={{ width: '100%', padding: '10px', backgroundColor: '#00b562', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                      >
                        ▶ Reactivate Account
                      </button>
                    ) : (
                      <button
                        onClick={() => openSuspendModal(selectedCustomer.id)}
                        style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                      >
                        ⛔ Suspend Account
                      </button>
                    )}
                  </div>

                  {/* Recent Ride History */}
                  {selectedCustomer.rides?.length > 0 && (
                    <div style={{ marginTop: '6px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '800', color: theme.textMuted, textTransform: 'uppercase', marginBottom: '8px' }}>Recent Ride History</div>
                      {selectedCustomer.rides.slice(0, 5).map((r: any) => (
                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${theme.borderLight}`, fontSize: '12px' }}>
                          <span style={{ color: theme.text }}>{r.status?.replace(/_/g, ' ')}</span>
                          <span style={{ fontWeight: '700', color: '#00b562' }}>₹{r.fare?.toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Customers;
