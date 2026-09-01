import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { DriverDetail } from './DriverDetail';

export const Drivers: React.FC = () => {
  const { theme } = useTheme();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [vehicleFilter, setVehicleFilter] = useState<string>('');

  // Selected driver for in-page view (fallback or fast view)
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  // Modals state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [driverToSuspend, setDriverToSuspend] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<{ id: string; name?: string } | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    const params: any = {};
    if (search) params.search = search;
    if (approvalFilter === 'approved') params.isApproved = true;
    if (approvalFilter === 'pending') params.isApproved = false;
    if (statusFilter && statusFilter !== 'ALL') params.status = statusFilter;
    if (vehicleFilter && vehicleFilter !== 'ALL') params.vehicleType = vehicleFilter;

    api.getDrivers(params)
      .then((d: any) => setDrivers(Array.isArray(d) ? d : []))
      .catch(e => setError(e.message || 'Failed to load drivers'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [approvalFilter, statusFilter, vehicleFilter]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await api.approveDriver(id);
      showToast('Captain approved successfully! They can now accept rides.');
      load();
    } catch (e: any) {
      showToast(e.message || 'Failed to approve driver.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Specify reason for review / rejection:');
    if (reason === null) return;
    setActionLoading(id);
    try {
      await api.rejectDriver(id, reason);
      showToast('Application marked as review required.');
      load();
    } catch (e: any) {
      showToast(e.message || 'Failed to reject driver.');
    } finally {
      setActionLoading(null);
    }
  };

  const openSuspendModal = (id: string) => {
    setDriverToSuspend(id);
    setSuspendReason('Document irregularity / Policy violation');
    setShowSuspendModal(true);
  };

  const handleConfirmSuspend = async () => {
    if (!driverToSuspend || !suspendReason.trim()) return;
    setActionLoading(driverToSuspend);
    try {
      await api.suspendDriver(driverToSuspend, suspendReason);
      setShowSuspendModal(false);
      setDriverToSuspend(null);
      showToast('Captain account suspended.');
      load();
    } catch (e: any) {
      showToast(e.message || 'Failed to suspend driver.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async (id: string) => {
    setActionLoading(id);
    try {
      await api.activateDriver(id);
      showToast('Captain account reactivated.');
      load();
    } catch (e: any) {
      showToast(e.message || 'Failed to activate driver.');
    } finally {
      setActionLoading(null);
    }
  };

  const openDeleteModal = (id: string, name?: string) => {
    setDriverToDelete({ id, name });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!driverToDelete) return;
    const { id } = driverToDelete;
    setActionLoading(id);
    try {
      await api.deleteDriver(id);
      setShowDeleteModal(false);
      setDriverToDelete(null);
      showToast('Captain permanently deleted from database.');
      // Immediately remove from state
      setDrivers(prev => prev.filter(d => d.id !== id));
      if (selectedDriverId === id) setSelectedDriverId(null);
    } catch (err: any) {
      showToast(err.message || 'Could not delete driver.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  const vehicleIcon = (type: string) => {
    const raw = String(type || 'CAB').toUpperCase();
    if (raw.includes('BIKE')) return '🏍️';
    if (raw.includes('AUTO')) return '🛺';
    return '🚗';
  };

  const pendingCount = drivers.filter(d => !d.isApproved && !d.isSuspended).length;
  const approvedCount = drivers.filter(d => d.isApproved && !d.isSuspended).length;
  const onlineCount = drivers.filter(d => d.status === 'ONLINE').length;

  // If a driver detail view is selected in-page
  if (selectedDriverId) {
    return (
      <DriverDetail
        driverId={selectedDriverId}
        onBack={() => {
          setSelectedDriverId(null);
          load();
        }}
      />
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          backgroundColor: '#0f172a',
          color: '#fff',
          padding: '14px 22px',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          borderLeft: '4px solid #00b562',
          zIndex: 9999,
          fontWeight: '700',
          fontSize: '13.5px'
        }}>
          {toastMsg}
        </div>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '16px', padding: '24px', maxWidth: '440px', width: '100%', border: '1px solid ' + theme.border }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: '800', color: theme.text }}>Suspend Captain Account</h3>
            <p style={{ margin: '0 0 14px', fontSize: '13px', color: theme.textMuted }}>
              Suspending this driver will disconnect them from duty and prevent receiving new bookings.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: theme.text, marginBottom: '6px' }}>Reason for Suspension</label>
              <textarea
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid ' + theme.border, backgroundColor: theme.inputBg, color: theme.text, fontSize: '13px', boxSizing: 'border-box' }}
                placeholder="Specify reason for suspending captain..."
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
                style={{ flex: 1, padding: '11px', backgroundColor: theme.cardBgSecondary, color: theme.text, border: '1px solid ' + theme.border, borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Driver Modal */}
      {showDeleteModal && driverToDelete && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '16px', padding: '26px', maxWidth: '460px', width: '100%', border: '1px solid ' + theme.border }}>
            <div style={{ fontSize: '38px', marginBottom: '8px', textAlign: 'center' }}>⚠️</div>
            <h3 style={{ margin: '0 0 10px', fontSize: '19px', fontWeight: '900', color: '#ef4444', textAlign: 'center' }}>
              Delete Captain Account
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: theme.textMuted, lineHeight: '19px', textAlign: 'center' }}>
              Are you sure you want to permanently delete Captain <strong>"{driverToDelete.name || driverToDelete.id}"</strong>?
              <br /><br />
              This will permanently remove the driver account, vehicle registration, credentials, and active access from the RideNow database.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleConfirmDelete}
                disabled={actionLoading !== null}
                style={{ flex: 1, padding: '12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '9px', fontWeight: '800', cursor: actionLoading ? 'not-allowed' : 'pointer' }}
              >
                {actionLoading ? 'Deleting...' : 'Delete Driver'}
              </button>
              <button
                onClick={() => { setShowDeleteModal(false); setDriverToDelete(null); }}
                disabled={actionLoading !== null}
                style={{ flex: 1, padding: '12px', backgroundColor: theme.cardBgSecondary, color: theme.text, border: '1px solid ' + theme.border, borderRadius: '9px', fontWeight: '700', cursor: 'pointer' }}
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
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '900', color: theme.text }}>Captains & Drivers Management</h1>
          <p style={{ margin: '4px 0 0', color: theme.textMuted, fontSize: '13.5px' }}>
            Inspect driver profiles, vehicle registrations, payouts, approvals, and fleet management.
          </p>
        </div>

        {/* Top KPI counters */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ backgroundColor: theme.cardBg, padding: '8px 14px', borderRadius: '10px', border: '1px solid ' + theme.border }}>
            <span style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '700' }}>TOTAL FLEET: </span>
            <strong style={{ color: theme.text }}>{drivers.length}</strong>
          </div>
          <div style={{ backgroundColor: theme.cardBg, padding: '8px 14px', borderRadius: '10px', border: '1px solid ' + theme.border }}>
            <span style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '700' }}>ONLINE DUTY: </span>
            <strong style={{ color: '#00b562' }}>{onlineCount}</strong>
          </div>
          <div style={{ backgroundColor: theme.cardBg, padding: '8px 14px', borderRadius: '10px', border: '1px solid ' + theme.border }}>
            <span style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '700' }}>PENDING: </span>
            <strong style={{ color: '#f59e0b' }}>{pendingCount}</strong>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '260px' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by Name, Phone, Email, Plate #..."
            style={{
              flex: 1,
              padding: '10px 14px',
              border: '1.5px solid ' + theme.border,
              borderRadius: '9px',
              fontSize: '13.5px',
              backgroundColor: theme.inputBg,
              color: theme.text,
            }}
          />
          <button
            type="submit"
            style={{ padding: '10px 18px', backgroundColor: '#00b562', color: '#fff', border: 'none', borderRadius: '9px', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}
          >
            Search
          </button>
        </form>

        <select
          value={approvalFilter}
          onChange={e => setApprovalFilter(e.target.value)}
          style={{ padding: '10px 14px', border: '1.5px solid ' + theme.border, borderRadius: '9px', fontSize: '13px', backgroundColor: theme.inputBg, color: theme.text }}
        >
          <option value="">All Approval States</option>
          <option value="pending">⏳ Pending Approvals ({pendingCount})</option>
          <option value="approved">✅ Approved ({approvedCount})</option>
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '10px 14px', border: '1.5px solid ' + theme.border, borderRadius: '9px', fontSize: '13px', backgroundColor: theme.inputBg, color: theme.text }}
        >
          <option value="">All Duty Statuses</option>
          <option value="ONLINE">🟢 Online</option>
          <option value="BUSY">🟡 On Trip</option>
          <option value="OFFLINE">⚪ Offline</option>
        </select>

        <select
          value={vehicleFilter}
          onChange={e => setVehicleFilter(e.target.value)}
          style={{ padding: '10px 14px', border: '1.5px solid ' + theme.border, borderRadius: '9px', fontSize: '13px', backgroundColor: theme.inputBg, color: theme.text }}
        >
          <option value="">All Vehicle Categories</option>
          <option value="BIKE">🏍️ Bike</option>
          <option value="AUTO">🛺 Auto</option>
          <option value="CAB">🚗 Cab</option>
        </select>
      </div>

      {/* Drivers Data Table */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: theme.textMuted }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>
          <div style={{ fontSize: '15px', fontWeight: '700' }}>Loading Captains Fleet...</div>
        </div>
      ) : error ? (
        <div style={{ padding: '30px', textAlign: 'center', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: '12px', color: '#ef4444' }}>
          {error}
        </div>
      ) : (
        <div style={{ backgroundColor: theme.cardBg, borderRadius: '16px', border: '1px solid ' + theme.border, overflow: 'hidden' }}>
          {drivers.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: theme.textMuted }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>👨‍✈️</div>
              <div style={{ fontSize: '16px', fontWeight: '800' }}>No captains found matching filters.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: theme.cardBgSecondary, color: theme.textMuted, textAlign: 'left', borderBottom: '1px solid ' + theme.border }}>
                    <th style={{ padding: '14px 16px' }}>Captain</th>
                    <th style={{ padding: '14px 16px' }}>Vehicle</th>
                    <th style={{ padding: '14px 16px' }}>Duty Status</th>
                    <th style={{ padding: '14px 16px' }}>Rating</th>
                    <th style={{ padding: '14px 16px' }}>Approval</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map(d => {
                    const v = d.vehicle;
                    return (
                      <tr
                        key={d.id}
                        style={{ borderBottom: '1px solid ' + theme.border, cursor: 'pointer', transition: 'background-color 0.15s' }}
                        onClick={() => setSelectedDriverId(d.id)}
                      >
                        {/* Captain Profile Cell */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '19px', backgroundColor: 'rgba(0,181,98,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                              {d.selfieUrl ? <img src={d.selfieUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : '👨‍✈️'}
                            </div>
                            <div>
                              <div style={{ fontWeight: '800', color: theme.text }}>{d.name || 'Unnamed Driver'}</div>
                              <div style={{ fontSize: '11.5px', color: theme.textMuted }}>{d.user?.email}</div>
                              {d.phone && <div style={{ fontSize: '11.5px', color: theme.textMuted }}>📞 {d.phone}</div>}
                            </div>
                          </div>
                        </td>

                        {/* Vehicle Cell */}
                        <td style={{ padding: '14px 16px' }}>
                          {v ? (
                            <div>
                              <div style={{ fontWeight: '700', color: theme.text }}>
                                {vehicleIcon(v.type)} {v.make} {v.model}
                              </div>
                              <div style={{ fontFamily: 'monospace', fontSize: '11.5px', color: '#00b562', fontWeight: '800', marginTop: '2px' }}>
                                {v.plateNumber}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: theme.textMuted, fontSize: '12px' }}>No Vehicle</span>
                          )}
                        </td>

                        {/* Duty Status */}
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '800',
                            color: d.status === 'ONLINE' ? '#00b562' : d.status === 'BUSY' ? '#f59e0b' : theme.textMuted,
                            backgroundColor: d.status === 'ONLINE' ? 'rgba(0,181,98,0.1)' : 'rgba(255,255,255,0.05)'
                          }}>
                            {d.status === 'ONLINE' ? '🟢 Online' : d.status === 'BUSY' ? '🟡 On Trip' : '⚪ Offline'}
                          </span>
                        </td>

                        {/* Rating */}
                        <td style={{ padding: '14px 16px', color: theme.text, fontWeight: '700' }}>
                          {d.avgRating ? ('⭐ ' + d.avgRating) : <span style={{ color: theme.textMuted }}>New</span>}
                        </td>

                        {/* Approval State */}
                        <td style={{ padding: '14px 16px' }}>
                          {d.isSuspended ? (
                            <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' }}>
                              ⛔ Suspended
                            </span>
                          ) : d.isApproved ? (
                            <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', color: '#059669', backgroundColor: 'rgba(5,150,105,0.1)' }}>
                              ✅ Approved
                            </span>
                          ) : (
                            <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', color: '#d97706', backgroundColor: 'rgba(245,158,11,0.1)' }}>
                              ⏳ Pending
                            </span>
                          )}
                        </td>

                        {/* Actions Column (Properly aligned with uniform heights & spacing) */}
                        <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {/* View Profile Button */}
                            <button
                              onClick={() => setSelectedDriverId(d.id)}
                              style={{
                                height: '30px',
                                padding: '0 10px',
                                borderRadius: '6px',
                                border: '1px solid ' + theme.border,
                                backgroundColor: theme.cardBgSecondary,
                                color: theme.text,
                                fontSize: '11.5px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              👁️ View
                            </button>

                            {/* Approve / Reject buttons */}
                            {!d.isApproved && !d.isSuspended && (
                              <>
                                <button
                                  onClick={() => handleApprove(d.id)}
                                  disabled={actionLoading === d.id}
                                  style={{ height: '30px', padding: '0 10px', borderRadius: '6px', border: 'none', backgroundColor: '#00b562', color: '#fff', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer' }}
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(d.id)}
                                  disabled={actionLoading === d.id}
                                  style={{ height: '30px', padding: '0 8px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer' }}
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {/* Suspend / Reactivate buttons */}
                            {d.isApproved && !d.isSuspended && (
                              <button
                                onClick={() => openSuspendModal(d.id)}
                                disabled={actionLoading === d.id}
                                style={{ height: '30px', padding: '0 8px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer' }}
                              >
                                Suspend
                              </button>
                            )}

                            {d.isSuspended && (
                              <button
                                onClick={() => handleActivate(d.id)}
                                disabled={actionLoading === d.id}
                                style={{ height: '30px', padding: '0 8px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(0,181,98,0.1)', color: '#00b562', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer' }}
                              >
                                Reactivate
                              </button>
                            )}

                            {/* Delete Driver Button (Destructive red outline) */}
                            <button
                              onClick={() => openDeleteModal(d.id, d.name)}
                              disabled={actionLoading === d.id}
                              title="Delete Driver"
                              style={{
                                height: '30px',
                                padding: '0 8px',
                                borderRadius: '6px',
                                border: '1px solid #ef4444',
                                backgroundColor: 'transparent',
                                color: '#ef4444',
                                fontSize: '11.5px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
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
  );
};
