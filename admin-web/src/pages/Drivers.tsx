import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const vehicleIcon = (v: string) => ({ BIKE: '🏍️', AUTO: '🛺', CAB: '🚗' }[v] || '🚖');

const statusBadge = (isApproved: boolean, isSuspended: boolean) => {
  if (isSuspended) return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: '#ef4444', backgroundColor: '#fff5f5' }}>⛔ Suspended</span>;
  if (isApproved) return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: '#059669', backgroundColor: '#ecfdf5' }}>✅ Approved</span>;
  return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: '#d97706', backgroundColor: '#fffbeb' }}>⏳ Pending</span>;
};

const onlineBadge = (status: string) => {
  const map: Record<string, { color: string; bg: string }> = { ONLINE: { color: '#059669', bg: '#ecfdf5' }, BUSY: { color: '#d97706', bg: '#fffbeb' }, OFFLINE: { color: '#94a3b8', bg: '#f1f5f9' } };
  const s = map[status] || map.OFFLINE;
  return <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', color: s.color, backgroundColor: s.bg }}>● {status}</span>;
};

export const Drivers: React.FC = () => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalFilter, setApprovalFilter] = useState<string>('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = () => {
    setLoading(true); setError(null);
    const params: any = {};
    if (approvalFilter === 'approved') params.isApproved = true;
    if (approvalFilter === 'pending') params.isApproved = false;
    if (vehicleFilter) params.vehicleType = vehicleFilter;
    if (search) params.search = search;
    api.getDrivers(params)
      .then((d: any) => setDrivers(Array.isArray(d) ? d : []))
      .catch(e => setError(e.message || 'Failed to load drivers'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [approvalFilter, vehicleFilter]);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000); };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try { await api.approveDriver(id); showSuccess('Driver approved and notified.'); load(); }
    catch (e: any) { alert(e.message); }
    finally { setActionLoading(null); }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Enter rejection reason (optional):') || '';
    setActionLoading(id);
    try { await api.rejectDriver(id, reason); showSuccess('Driver rejected.'); load(); }
    catch (e: any) { alert(e.message); }
    finally { setActionLoading(null); }
  };

  const handleSuspend = async (id: string) => {
    const reason = prompt('Enter suspension reason:');
    if (!reason) return;
    setActionLoading(id);
    try { await api.suspendDriver(id, reason); showSuccess('Driver suspended.'); load(); }
    catch (e: any) { alert(e.message); }
    finally { setActionLoading(null); }
  };

  const handleActivate = async (id: string) => {
    setActionLoading(id);
    try { await api.activateDriver(id); showSuccess('Driver reactivated.'); load(); }
    catch (e: any) { alert(e.message); }
    finally { setActionLoading(null); }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>Drivers & Captains</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>Manage driver accounts, approvals, and suspensions.</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '240px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, phone..."
            style={{ flex: 1, padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff' }} />
          <button type="submit" style={{ padding: '9px 16px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>Search</button>
        </form>
        <select value={approvalFilter} onChange={e => setApprovalFilter(e.target.value)}
          style={{ padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', color: '#0f172a' }}>
          <option value="">All Drivers</option>
          <option value="approved">✅ Approved</option>
          <option value="pending">⏳ Pending Approval</option>
        </select>
        <select value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)}
          style={{ padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', color: '#0f172a' }}>
          <option value="">All Vehicles</option>
          <option value="BIKE">🏍️ Bike</option>
          <option value="AUTO">🛺 Auto</option>
          <option value="CAB">🚗 Cab</option>
        </select>
      </div>

      {successMsg && <div style={{ backgroundColor: '#f0fdf4', color: '#15803d', borderLeft: '4px solid #00b562', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>✅ {successMsg}</div>}
      {error && <div style={{ backgroundColor: '#fff5f5', color: '#e53e3e', borderLeft: '4px solid #ef4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>⚠️ {error}</div>}
      {loading && <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>Loading drivers...</div>}

      {!loading && drivers.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px' }}>No drivers found.</div>
      )}

      {!loading && drivers.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {drivers.map((d: any) => (
            <div key={d.id} style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', opacity: d.isSuspended ? 0.85 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>{d.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{d.email}</div>
                  {d.phone && <div style={{ fontSize: '12px', color: '#64748b' }}>{d.phone}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                  {statusBadge(d.isApproved, d.isSuspended)}
                  {d.status && onlineBadge(d.status)}
                </div>
              </div>

              {d.vehicle && (
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', color: '#334155', fontWeight: '600' }}>{vehicleIcon(d.vehicle.type)} {d.vehicle.make} {d.vehicle.model}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>{d.vehicle.registrationNumber} · {d.vehicle.color}</div>
                  {d.licenseNumber && <div style={{ fontSize: '12px', color: '#94a3b8' }}>License: {d.licenseNumber}</div>}
                </div>
              )}

              <div style={{ display: 'flex', gap: '16px', marginBottom: '14px', fontSize: '12px', color: '#64748b' }}>
                <span>🚖 {d.totalRides ?? 0} rides</span>
                <span>💰 ₹{(d.totalEarnings ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                {d.avgRating && <span>⭐ {Number(d.avgRating).toFixed(1)}</span>}
              </div>

              {d.isSuspended && d.suspendReason && (
                <div style={{ fontSize: '12px', color: '#b45309', backgroundColor: '#fffbeb', borderRadius: '6px', padding: '8px 10px', marginBottom: '12px' }}>
                  ⚠️ Reason: {d.suspendReason}
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {!d.isApproved && !d.isSuspended && (
                  <button onClick={() => handleApprove(d.id)} disabled={actionLoading === d.id}
                    style={{ flex: 1, padding: '8px', borderRadius: '7px', border: 'none', backgroundColor: '#00b562', color: '#fff', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                    {actionLoading === d.id ? '...' : '✅ Approve'}
                  </button>
                )}
                {!d.isApproved && !d.isSuspended && (
                  <button onClick={() => handleReject(d.id)} disabled={actionLoading === d.id}
                    style={{ flex: 1, padding: '8px', borderRadius: '7px', border: 'none', backgroundColor: '#fff5f5', color: '#ef4444', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                    {actionLoading === d.id ? '...' : '❌ Reject'}
                  </button>
                )}
                {d.isApproved && !d.isSuspended && (
                  <button onClick={() => handleSuspend(d.id)} disabled={actionLoading === d.id}
                    style={{ flex: 1, padding: '8px', borderRadius: '7px', border: 'none', backgroundColor: '#fff7ed', color: '#c2410c', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                    {actionLoading === d.id ? '...' : '⛔ Suspend'}
                  </button>
                )}
                {d.isSuspended && (
                  <button onClick={() => handleActivate(d.id)} disabled={actionLoading === d.id}
                    style={{ flex: 1, padding: '8px', borderRadius: '7px', border: 'none', backgroundColor: '#f0fdf4', color: '#15803d', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                    {actionLoading === d.id ? '...' : '▶ Reactivate'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Drivers;
