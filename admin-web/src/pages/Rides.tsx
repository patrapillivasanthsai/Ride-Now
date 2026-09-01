import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  RIDE_COMPLETED: { color: '#059669', bg: 'rgba(5,150,105,0.12)' },
  CANCELLED: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  RIDE_STARTED: { color: '#00b562', bg: 'rgba(0,181,98,0.12)' },
  DRIVER_ASSIGNED: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  DRIVER_ARRIVING: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  DRIVER_ARRIVED: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  SEARCHING_DRIVER: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  REQUESTED: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  NO_DRIVER_AVAILABLE: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

const vehicleIcon = (v: string) => ({ BIKE: '🏍️', AUTO: '🛺', CAB: '🚗' }[v] || '🚖');

const ASSIGNABLE = ['REQUESTED', 'SEARCHING_DRIVER', 'NO_DRIVER_AVAILABLE'];
const CANCELLABLE = ['REQUESTED', 'SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'RIDE_STARTED'];

export const Rides: React.FC = () => {
  const { theme } = useTheme();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [eligibleDrivers, setEligibleDrivers] = useState<any[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [rideToCancel, setRideToCancel] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const load = (p = 1) => {
    setLoading(true);
    setError(null);
    api.getRides({
      status: statusFilter || undefined,
      vehicleType: vehicleFilter || undefined,
      search: search || undefined,
      page: p
    })
      .then((d: any) => {
        setRides(d.data || d);
        setMeta(d.meta || null);
      })
      .catch((e: any) => setError(e.message || 'Failed to load rides'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(page);
    const interval = setInterval(() => {
      api.getRides({
        status: statusFilter || undefined,
        vehicleType: vehicleFilter || undefined,
        search: search || undefined,
        page
      })
        .then((d: any) => {
          setRides(d.data || d);
          setMeta(d.meta || null);
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [statusFilter, vehicleFilter, page, search]);

  const showToast = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load(1);
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const d = await api.getRideDetail(id);
      setSelectedRide(d);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const openAssignModal = async (rideId: string) => {
    setActionLoading(true);
    try {
      const drivers = await api.getEligibleDrivers(rideId);
      setEligibleDrivers(Array.isArray(drivers) ? drivers : []);
      setShowAssignModal(true);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignSpecificDriver = async (driverId: string) => {
    if (!selectedRide) return;
    setActionLoading(true);
    try {
      await api.assignDriver(selectedRide.id, driverId);
      setShowAssignModal(false);
      showToast('Captain assigned successfully!');
      openDetail(selectedRide.id);
      load(page);
    } catch (e: any) {
      alert(e.message || 'Failed to assign driver');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAutoAssignRandomDriver = async (rideId: string) => {
    setActionLoading(true);
    try {
      await api.assignDriver(rideId, 'random');
      setShowAssignModal(false);
      showToast('⚡ Random available captain assigned automatically!');
      if (selectedRide?.id === rideId) openDetail(rideId);
      load(page);
    } catch (e: any) {
      alert(e.message || 'No available drivers found for this vehicle type');
    } finally {
      setActionLoading(false);
    }
  };

  const promptCancelModal = (rideId: string) => {
    setRideToCancel(rideId);
    setCancelReason('Operations resolution / Customer request');
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!rideToCancel || !cancelReason.trim()) return;
    setActionLoading(true);
    try {
      await api.adminCancelRide(rideToCancel, cancelReason);
      setShowCancelModal(false);
      setRideToCancel(null);
      showToast('Ride cancelled and resolved by admin.');
      if (selectedRide?.id === rideToCancel) openDetail(rideToCancel);
      load(page);
    } catch (e: any) {
      alert(e.message || 'Failed to cancel ride');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Toast Notification */}
      {actionSuccess && (
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
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Manual & Auto Driver Assign Modal */}
      {showAssignModal && selectedRide && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '16px', padding: '28px', width: '560px', maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `1px solid ${theme.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: theme.text }}>🚗 Manual / Auto Driver Assignment</h3>
                <div style={{ fontSize: '12.5px', color: theme.textMuted, marginTop: '2px' }}>
                  Preferred Vehicle: <strong>{vehicleIcon(selectedRide.vehicleType)} {selectedRide.vehicleType}</strong> · Pickup: {selectedRide.pickupAddress}
                </div>
              </div>
              <button onClick={() => setShowAssignModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: theme.textMuted, cursor: 'pointer' }}>✕</button>
            </div>

            {/* 1-Click Auto Assign Random Driver Button */}
            <div style={{ backgroundColor: theme.primaryBg, border: `1.5px dashed ${theme.primary}`, borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <div style={{ fontWeight: '800', color: theme.primary, fontSize: '14px' }}>⚡ 1-Click Random / Best Available Dispatch</div>
                <div style={{ fontSize: '12px', color: theme.textMuted }}>Instantly assigns a verified {selectedRide.vehicleType} driver.</div>
              </div>
              <button
                onClick={() => handleAutoAssignRandomDriver(selectedRide.id)}
                disabled={actionLoading}
                style={{
                  padding: '9px 16px',
                  backgroundColor: '#00b562',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(0,181,98,0.3)'
                }}
              >
                {actionLoading ? 'Assigning...' : 'Auto-Assign Now'}
              </button>
            </div>

            <div style={{ fontSize: '12px', fontWeight: '800', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
              Eligible Captains ({eligibleDrivers.length})
            </div>

            {eligibleDrivers.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: theme.textMuted, backgroundColor: theme.cardBgSecondary, borderRadius: '10px', fontSize: '13px' }}>
                No active/approved {selectedRide.vehicleType} captains found in the area. Try Auto-Assign or approve more drivers in Drivers section.
              </div>
            ) : (
              eligibleDrivers.map((d: any) => (
                <div
                  key={d.id}
                  onClick={() => handleAssignSpecificDriver(d.id)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: `1px solid ${theme.border}`,
                    marginBottom: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: theme.cardBg,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = theme.tableRowHover}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = theme.cardBg}
                >
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: theme.text }}>{d.name} ({d.phone})</div>
                    <div style={{ fontSize: '12px', color: theme.textMuted }}>
                      {vehicleIcon(d.vehicle?.type || '')} {d.vehicle?.type} · {d.vehicle?.make} {d.vehicle?.model} · Plate: {d.vehicle?.plateNumber}
                    </div>
                    {d.avgRating && <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '600', marginTop: '2px' }}>⭐ {d.avgRating} / 5.0</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: d.status === 'ONLINE' ? '#00b562' : '#94a3b8', fontWeight: '700', padding: '3px 8px', borderRadius: '12px', backgroundColor: d.status === 'ONLINE' ? 'rgba(0,181,98,0.1)' : theme.badgeBg }}>
                      ● {d.status}
                    </span>
                    {d.distanceFromPickup !== null && (
                      <div style={{ fontSize: '11.5px', color: theme.textMuted, marginTop: '4px' }}>
                        {d.distanceFromPickup?.toFixed(1)} km away
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            <button
              onClick={() => setShowAssignModal(false)}
              style={{ width: '100%', padding: '10px', backgroundColor: theme.cardBgSecondary, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '8px', fontWeight: '700', cursor: 'pointer', marginTop: '12px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Cancel Problematic Ride Modal */}
      {showCancelModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '16px', padding: '28px', width: '460px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `1px solid ${theme.border}` }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '800', color: '#ef4444' }}>❌ Cancel & Resolve Problematic Ride</h3>
            <p style={{ fontSize: '13px', color: theme.textMuted, marginBottom: '16px' }}>
              Are you sure you want to cancel this ride? The customer and driver will be notified and logged in the audit trail.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: theme.textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>Cancellation Reason</label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1.5px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.text, fontSize: '13px', boxSizing: 'border-box' }}
                placeholder="Explain why this ride is being cancelled by admin..."
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleConfirmCancel}
                disabled={actionLoading || !cancelReason.trim()}
                style={{ flex: 1, padding: '11px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: actionLoading ? 'not-allowed' : 'pointer' }}
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                style={{ flex: 1, padding: '11px', backgroundColor: theme.cardBgSecondary, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header & Stats Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: theme.text }}>Rides Monitor & Dispatch</h1>
          <p style={{ margin: '4px 0 0', color: theme.textMuted, fontSize: '13.5px' }}>
            {meta ? `${meta.total} Total Rides Tracked` : 'Manage, assign captains, and resolve problematic rides in real time'}
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '260px' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by Ride ID, Customer, Captain, Address..."
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
            style={{
              padding: '10px 18px',
              backgroundColor: '#0f172a',
              color: '#fff',
              border: 'none',
              borderRadius: '9px',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Search
          </button>
        </form>

        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{
            padding: '10px 14px',
            border: `1.5px solid ${theme.border}`,
            borderRadius: '9px',
            fontSize: '13px',
            backgroundColor: theme.inputBg,
            color: theme.text,
            minWidth: '180px'
          }}
        >
          <option value="">All Ride Statuses</option>
          {['REQUESTED', 'SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'RIDE_STARTED', 'RIDE_COMPLETED', 'CANCELLED', 'NO_DRIVER_AVAILABLE'].map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <select
          value={vehicleFilter}
          onChange={e => { setVehicleFilter(e.target.value); setPage(1); }}
          style={{
            padding: '10px 14px',
            border: `1.5px solid ${theme.border}`,
            borderRadius: '9px',
            fontSize: '13px',
            backgroundColor: theme.inputBg,
            color: theme.text
          }}
        >
          <option value="">All Vehicles</option>
          <option value="BIKE">🏍️ Bike</option>
          <option value="AUTO">🛺 Auto</option>
          <option value="CAB">🚗 Cab</option>
        </select>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', borderLeft: '4px solid #ef4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Main Grid: Rides Table + Side Detail Drawer */}
      <div style={{ display: 'grid', gridTemplateColumns: (!isMobile && selectedRide) ? '1fr 380px' : '1fr', gap: '20px', alignItems: 'start' }}>
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: theme.textMuted }}>Loading rides...</div>
          ) : (
            <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
              {rides.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', color: theme.textMuted, fontSize: '14px' }}>
                  No rides found matching the criteria.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: theme.tableHeaderBg, borderBottom: `1px solid ${theme.border}` }}>
                        {['Ride ID', 'Vehicle', 'Customer', 'Captain / Driver', 'Fare (₹)', 'Status', 'Booking Time', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: theme.textMuted, fontWeight: '700', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rides.map((r: any) => {
                        const isSelected = selectedRide?.id === r.id;
                        const s = STATUS_COLORS[r.status] || { color: theme.textMuted, bg: theme.badgeBg };
                        return (
                          <tr
                            key={r.id}
                            style={{ borderBottom: `1px solid ${theme.borderLight}`, cursor: 'pointer', backgroundColor: isSelected ? theme.primaryBg : 'transparent' }}
                            onClick={() => openDetail(r.id)}
                            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = theme.tableRowHover; }}
                            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '11.5px', color: theme.textMuted }}>
                              #{r.id.slice(0, 8)}
                            </td>
                            <td style={{ padding: '14px 16px', fontWeight: '700', color: theme.text }}>
                              {vehicleIcon(r.vehicleType)} {r.vehicleType}
                            </td>
                            <td style={{ padding: '14px 16px', color: theme.text }}>
                              <div style={{ fontWeight: '600' }}>{r.customer?.name || 'Customer'}</div>
                              <div style={{ fontSize: '11.5px', color: theme.textMuted }}>{r.customer?.phone || '—'}</div>
                            </td>
                            <td style={{ padding: '14px 16px', color: theme.text }}>
                              {r.driver ? (
                                <>
                                  <div style={{ fontWeight: '600' }}>{r.driver.name}</div>
                                  <div style={{ fontSize: '11.5px', color: theme.textMuted }}>{r.driver.phone}</div>
                                </>
                              ) : (
                                <span style={{ color: theme.textMuted, fontStyle: 'italic', fontSize: '12px' }}>Unassigned</span>
                              )}
                            </td>
                            <td style={{ padding: '14px 16px', fontWeight: '800', color: theme.text }}>
                              ₹{r.fare?.toFixed(0)}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: s.color, backgroundColor: s.bg }}>
                                {r.status?.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px', color: theme.textMuted, fontSize: '12px' }}>
                              {new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {ASSIGNABLE.includes(r.status) && (
                                  <>
                                    <button
                                      onClick={() => { openDetail(r.id).then(() => openAssignModal(r.id)); }}
                                      style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer' }}
                                    >
                                      Assign
                                    </button>
                                    <button
                                      onClick={() => handleAutoAssignRandomDriver(r.id)}
                                      title="Auto-Assign Random Available Driver"
                                      style={{ padding: '5px 8px', borderRadius: '6px', border: 'none', backgroundColor: '#00b562', color: '#fff', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer' }}
                                    >
                                      ⚡ Auto
                                    </button>
                                  </>
                                )}
                                {CANCELLABLE.includes(r.status) && (
                                  <button
                                    onClick={() => promptCancelModal(r.id)}
                                    style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer' }}
                                  >
                                    Cancel
                                  </button>
                                )}
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

          {/* Pagination Controls */}
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
                Page {page} of {meta.totalPages} ({meta.total} total)
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

        {/* Side Detail Drawer */}
        {selectedRide && (
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '22px', position: 'sticky', top: '20px', maxHeight: '88vh', overflowY: 'auto' }}>
            {detailLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: theme.textMuted }}>Loading ride details...</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: theme.text }}>Trip Details</h3>
                    <span style={{ fontSize: '11px', color: theme.textMuted, fontFamily: 'monospace' }}>ID: {selectedRide.id}</span>
                  </div>
                  <button onClick={() => setSelectedRide(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: theme.textMuted }}>✕</button>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  {(() => {
                    const s = STATUS_COLORS[selectedRide.status] || { color: theme.textMuted, bg: theme.badgeBg };
                    return (
                      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11.5px', fontWeight: '800', color: s.color, backgroundColor: s.bg }}>
                        {selectedRide.status?.replace(/_/g, ' ')}
                      </span>
                    );
                  })()}
                </div>

                {/* Locations */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ backgroundColor: theme.cardBgSecondary, borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '10.5px', color: '#00b562', fontWeight: '800', textTransform: 'uppercase' }}>📍 Pickup Location</div>
                    <div style={{ fontSize: '13px', color: theme.text, marginTop: '2px', fontWeight: '600' }}>{selectedRide.pickupAddress}</div>
                  </div>
                  <div style={{ backgroundColor: theme.cardBgSecondary, borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '10.5px', color: '#ef4444', fontWeight: '800', textTransform: 'uppercase' }}>🏁 Destination</div>
                    <div style={{ fontSize: '13px', color: theme.text, marginTop: '2px', fontWeight: '600' }}>{selectedRide.dropoffAddress}</div>
                  </div>
                </div>

                {/* Customer Details */}
                {selectedRide.customer && (
                  <div style={{ backgroundColor: theme.cardBgSecondary, borderRadius: '10px', padding: '12px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '10.5px', color: theme.textMuted, fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>Customer</div>
                    <div style={{ fontSize: '13.5px', fontWeight: '700', color: theme.text }}>{selectedRide.customer.name}</div>
                    <div style={{ fontSize: '12px', color: theme.textMuted }}>{selectedRide.customer.phone || selectedRide.customer.user?.email}</div>
                  </div>
                )}

                {/* Driver Details */}
                {selectedRide.driver ? (
                  <div style={{ backgroundColor: theme.cardBgSecondary, borderRadius: '10px', padding: '12px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '10.5px', color: theme.textMuted, fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>Assigned Captain</div>
                    <div style={{ fontSize: '13.5px', fontWeight: '700', color: theme.text }}>{selectedRide.driver.name}</div>
                    <div style={{ fontSize: '12px', color: theme.textMuted }}>{selectedRide.driver.phone}</div>
                    {selectedRide.driver.vehicle && (
                      <div style={{ fontSize: '12px', color: theme.text, marginTop: '4px', fontWeight: '500' }}>
                        {vehicleIcon(selectedRide.driver.vehicle.type)} {selectedRide.driver.vehicle.make} {selectedRide.driver.vehicle.model} · {selectedRide.driver.vehicle.plateNumber}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '12px', marginBottom: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '12.5px', color: '#d97706', fontWeight: '700' }}>No captain assigned yet</span>
                  </div>
                )}

                {/* Fare Itemization */}
                <div style={{ backgroundColor: theme.cardBgSecondary, borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '10.5px', color: theme.textMuted, fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>Fare Breakdown (₹ INR)</div>
                  {[
                    ['Base Fare', selectedRide.baseFare],
                    ['Distance Fare', selectedRide.distanceFare],
                    ['Time Fare', selectedRide.timeFare],
                  ].map(([k, v]) => v !== undefined && (
                    <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', color: theme.textMuted }}>
                      <span>{k}</span>
                      <span style={{ color: theme.text, fontWeight: '600' }}>₹{(v as number)?.toFixed(2)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '800', marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${theme.border}` }}>
                    <span style={{ color: theme.text }}>Total Fare</span>
                    <span style={{ color: '#00b562' }}>₹{selectedRide.fare?.toFixed(2)}</span>
                  </div>
                </div>

                {/* Status Timeline History */}
                {selectedRide.statusHistory?.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: theme.textMuted, textTransform: 'uppercase', marginBottom: '8px' }}>Status Timeline</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {selectedRide.statusHistory.map((h: any) => (
                        <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: theme.textMuted, padding: '4px 0', borderBottom: `1px solid ${theme.borderLight}` }}>
                          <span style={{ fontWeight: '600', color: theme.text }}>{h.status?.replace(/_/g, ' ')}</span>
                          <span>{new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {ASSIGNABLE.includes(selectedRide.status) && (
                    <>
                      <button
                        onClick={() => openAssignModal(selectedRide.id)}
                        disabled={actionLoading}
                        style={{ flex: 1, padding: '10px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12.5px' }}
                      >
                        🚗 Pick Driver
                      </button>
                      <button
                        onClick={() => handleAutoAssignRandomDriver(selectedRide.id)}
                        disabled={actionLoading}
                        style={{ flex: 1, padding: '10px', backgroundColor: '#00b562', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12.5px' }}
                      >
                        ⚡ Auto-Assign
                      </button>
                    </>
                  )}
                  {CANCELLABLE.includes(selectedRide.status) && (
                    <button
                      onClick={() => promptCancelModal(selectedRide.id)}
                      disabled={actionLoading}
                      style={{ width: '100%', padding: '10px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12.5px' }}
                    >
                      ❌ Cancel & Resolve Ride
                    </button>
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

export default Rides;
