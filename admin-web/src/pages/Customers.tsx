import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [suspendFilter, setSuspendFilter] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = () => {
    setLoading(true); setError(null);
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

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000); };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try { const d = await api.getCustomerDetail(id); setSelectedCustomer(d); }
    catch (e: any) { alert(e.message); }
    finally { setDetailLoading(false); }
  };

  const handleSuspend = async (id: string) => {
    const reason = prompt('Enter suspension reason:');
    if (!reason) return;
    setActionLoading(id);
    try { await api.suspendCustomer(id, reason); showSuccess('Customer suspended.'); load(); if (selectedCustomer?.id === id) openDetail(id); }
    catch (e: any) { alert(e.message); }
    finally { setActionLoading(null); }
  };

  const handleReactivate = async (id: string) => {
    setActionLoading(id);
    try { await api.reactivateCustomer(id); showSuccess('Customer reactivated.'); load(); if (selectedCustomer?.id === id) openDetail(id); }
    catch (e: any) { alert(e.message); }
    finally { setActionLoading(null); }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>Customers</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>Manage customer accounts and view ride history.</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '240px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, phone..."
            style={{ flex: 1, padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff' }} />
          <button type="submit" style={{ padding: '9px 16px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>Search</button>
        </form>
        <select value={suspendFilter} onChange={e => setSuspendFilter(e.target.value)}
          style={{ padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', color: '#0f172a' }}>
          <option value="">All Customers</option>
          <option value="active">✅ Active</option>
          <option value="suspended">⛔ Suspended</option>
        </select>
      </div>

      {successMsg && <div style={{ backgroundColor: '#f0fdf4', color: '#15803d', borderLeft: '4px solid #00b562', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>✅ {successMsg}</div>}
      {error && <div style={{ backgroundColor: '#fff5f5', color: '#e53e3e', borderLeft: '4px solid #ef4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>⚠️ {error}</div>}
      {loading && <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>Loading customers...</div>}

      <div style={{ display: 'grid', gridTemplateColumns: selectedCustomer ? '1fr 360px' : '1fr', gap: '20px', alignItems: 'start' }}>
        {!loading && (
          <div>
            {customers.length === 0
              ? <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px' }}>No customers found.</div>
              : (
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                        {['Name', 'Contact', 'Rides', 'Spent', 'Status', 'Joined', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: '#475569', fontWeight: '700', fontSize: '12px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((c: any) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', backgroundColor: selectedCustomer?.id === c.id ? '#f8faff' : '#fff' }}
                          onClick={() => openDetail(c.id)}
                          onMouseEnter={e => { if (selectedCustomer?.id !== c.id) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                          onMouseLeave={e => { if (selectedCustomer?.id !== c.id) e.currentTarget.style.backgroundColor = '#fff'; }}>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{c.name}</div>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ color: '#475569' }}>{c.email}</div>
                            {c.phone && <div style={{ fontSize: '12px', color: '#94a3b8' }}>{c.phone}</div>}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#334155', fontWeight: '600' }}>{c.totalRides ?? 0}</td>
                          <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0f172a' }}>₹{(c.totalSpent ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                          <td style={{ padding: '12px 14px' }}>
                            {c.isSuspended
                              ? <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: '#ef4444', backgroundColor: '#fff5f5' }}>⛔ Suspended</span>
                              : <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: '#059669', backgroundColor: '#ecfdf5' }}>● Active</span>}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: '12px' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                          <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                            {c.isSuspended
                              ? <button onClick={() => handleReactivate(c.id)} disabled={actionLoading === c.id}
                                  style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#f0fdf4', color: '#15803d', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                                  {actionLoading === c.id ? '...' : '▶ Reactivate'}
                                </button>
                              : <button onClick={() => handleSuspend(c.id)} disabled={actionLoading === c.id}
                                  style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#fff7ed', color: '#c2410c', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                                  {actionLoading === c.id ? '...' : '⛔ Suspend'}
                                </button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        )}

        {/* Side Drawer */}
        {selectedCustomer && (
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', position: 'sticky', top: '20px', maxHeight: '85vh', overflowY: 'auto' }}>
            {detailLoading
              ? <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading...</div>
              : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Customer Profile</h3>
                    <button onClick={() => setSelectedCustomer(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{selectedCustomer.name}</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>{selectedCustomer.email}</div>
                      {selectedCustomer.phone && <div style={{ fontSize: '13px', color: '#64748b' }}>{selectedCustomer.phone}</div>}
                    </div>

                    {selectedCustomer.isSuspended && (
                      <div style={{ backgroundColor: '#fff5f5', borderRadius: '8px', padding: '10px 12px', borderLeft: '4px solid #ef4444' }}>
                        <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: '700' }}>⛔ Account Suspended</div>
                        {selectedCustomer.suspendReason && <div style={{ fontSize: '12px', color: '#b45309', marginTop: '4px' }}>{selectedCustomer.suspendReason}</div>}
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {[
                        ['Total Rides', selectedCustomer.totalRides ?? 0, '🚖'],
                        ['Completed', selectedCustomer.completedRides ?? 0, '✅'],
                        ['Cancelled', selectedCustomer.cancelledRides ?? 0, '❌'],
                        ['Total Spent', `₹${(selectedCustomer.totalSpent ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, '💰'],
                      ].map(([l, v, i]) => (
                        <div key={l as string} style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '12px' }}>
                          <div style={{ fontSize: '20px', marginBottom: '4px' }}>{i}</div>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{v}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{l}</div>
                        </div>
                      ))}
                    </div>

                    {selectedCustomer.gender && (
                      <div style={{ fontSize: '13px', color: '#64748b' }}>Gender: {selectedCustomer.gender}</div>
                    )}
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Member since {new Date(selectedCustomer.createdAt).toLocaleDateString()}</div>

                    {/* Action */}
                    <div style={{ marginTop: '8px' }}>
                      {selectedCustomer.isSuspended
                        ? <button onClick={() => handleReactivate(selectedCustomer.id)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#f0fdf4', color: '#15803d', fontWeight: '700', cursor: 'pointer' }}>▶ Reactivate Account</button>
                        : <button onClick={() => handleSuspend(selectedCustomer.id)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#fff7ed', color: '#c2410c', fontWeight: '700', cursor: 'pointer' }}>⛔ Suspend Account</button>}
                    </div>

                    {/* Recent rides */}
                    {selectedCustomer.rides?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Recent Rides</div>
                        {selectedCustomer.rides.slice(0, 5).map((r: any) => (
                          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '12px' }}>
                            <span style={{ color: '#475569' }}>{r.status?.replace(/_/g, ' ')}</span>
                            <span style={{ fontWeight: '700', color: '#0f172a' }}>₹{r.fare?.toFixed(0)}</span>
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
