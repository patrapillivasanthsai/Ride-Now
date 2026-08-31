import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  RIDE_COMPLETED: { color: '#059669', bg: '#ecfdf5' },
  CANCELLED: { color: '#ef4444', bg: '#fff5f5' },
  RIDE_STARTED: { color: '#00b562', bg: '#f0fdf4' },
  DRIVER_ASSIGNED: { color: '#7c3aed', bg: '#f5f3ff' },
  DRIVER_ARRIVING: { color: '#7c3aed', bg: '#f5f3ff' },
  DRIVER_ARRIVED: { color: '#7c3aed', bg: '#f5f3ff' },
  SEARCHING_DRIVER: { color: '#2563eb', bg: '#eff6ff' },
  REQUESTED: { color: '#d97706', bg: '#fffbeb' },
  NO_DRIVER_AVAILABLE: { color: '#ef4444', bg: '#fff5f5' },
};

const statusBadge = (status: string) => {
  const s = STATUS_COLORS[status] || { color: '#64748b', bg: '#f1f5f9' };
  return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: s.color, backgroundColor: s.bg }}>{status?.replace(/_/g, ' ')}</span>;
};

const vehicleIcon = (v: string) => ({ BIKE: '🏍️', AUTO: '🛺', CAB: '🚗' }[v] || '🚖');

const ASSIGNABLE = ['REQUESTED', 'SEARCHING_DRIVER', 'NO_DRIVER_AVAILABLE'];
const CANCELLABLE = ['REQUESTED', 'SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'RIDE_STARTED'];

export const Rides: React.FC = () => {
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
  const [actionLoading, setActionLoading] = useState(false);

  const load = (p = 1) => {
    setLoading(true); setError(null);
    api.getRides({ status: statusFilter || undefined, vehicleType: vehicleFilter || undefined, search: search || undefined, page: p })
      .then((d: any) => { setRides(d.data || d); setMeta(d.meta || null); })
      .catch((e: any) => setError(e.message || 'Failed to load rides'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(page); }, [statusFilter, vehicleFilter, page]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); load(1); };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try { const d = await api.getRideDetail(id); setSelectedRide(d); }
    catch (e: any) { alert(e.message); }
    finally { setDetailLoading(false); }
  };

  const openAssign = async (rideId: string) => {
    setActionLoading(true);
    try {
      const drivers = await api.getEligibleDrivers(rideId);
      setEligibleDrivers(Array.isArray(drivers) ? drivers : []);
      setShowAssignModal(true);
    } catch (e: any) { alert(e.message); }
    finally { setActionLoading(false); }
  };

  const handleAssign = async (driverId: string) => {
    if (!selectedRide) return;
    setActionLoading(true);
    try {
      await api.assignDriver(selectedRide.id, driverId);
      setShowAssignModal(false);
      openDetail(selectedRide.id);
      load(page);
    } catch (e: any) { alert(e.message); }
    finally { setActionLoading(false); }
  };

  const handleCancel = async (rideId: string) => {
    const reason = prompt('Enter cancellation reason:');
    if (!reason) return;
    setActionLoading(true);
    try {
      await api.adminCancelRide(rideId, reason);
      if (selectedRide?.id === rideId) openDetail(rideId);
      load(page);
    } catch (e: any) { alert(e.message); }
    finally { setActionLoading(false); }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Assign Modal */}
      {showAssignModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '28px', width: '520px', maxWidth: '95vw', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>🚗 Assign Driver</h3>
            {eligibleDrivers.length === 0
              ? <p style={{ color: '#94a3b8', fontSize: '14px' }}>No eligible drivers available for this vehicle type.</p>
              : eligibleDrivers.map((d: any) => (
                <div key={d.id} onClick={() => handleAssign(d.id)}
                  style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>{d.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{vehicleIcon(d.vehicle?.type || '')} {d.vehicle?.type} · {d.vehicle?.make} {d.vehicle?.model}</div>
                    {d.avgRating && <div style={{ fontSize: '12px', color: '#f59e0b' }}>⭐ {d.avgRating}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: d.status === 'ONLINE' ? '#00b562' : '#94a3b8', fontWeight: '700' }}>● {d.status}</div>
                    {d.distanceFromPickup !== null && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{d.distanceFromPickup?.toFixed(1)} km away</div>}
                  </div>
                </div>
              ))}
            <button onClick={() => setShowAssignModal(false)} style={{ width: '100%', padding: '10px', backgroundColor: '#f1f5f9', color: '#0f172a', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>Rides Monitor</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>{meta ? `${meta.total} total rides` : 'All rides across the platform'}</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '240px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by address, customer, driver..."
            style={{ flex: 1, padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff' }} />
          <button type="submit" style={{ padding: '9px 16px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>Search</button>
        </form>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', color: '#0f172a', minWidth: '160px' }}>
          <option value="">All Statuses</option>
          {['REQUESTED', 'SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'RIDE_STARTED', 'RIDE_COMPLETED', 'CANCELLED', 'NO_DRIVER_AVAILABLE'].map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select value={vehicleFilter} onChange={e => { setVehicleFilter(e.target.value); setPage(1); }}
          style={{ padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', color: '#0f172a' }}>
          <option value="">All Vehicles</option>
          <option value="BIKE">🏍️ Bike</option>
          <option value="AUTO">🛺 Auto</option>
          <option value="CAB">🚗 Cab</option>
        </select>
      </div>

      {error && <div style={{ backgroundColor: '#fff5f5', color: '#e53e3e', borderLeft: '4px solid #ef4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>⚠️ {error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: selectedRide ? '1fr 380px' : '1fr', gap: '20px', alignItems: 'start' }}>
        {/* Rides Table */}
        <div>
          {loading ? <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>Loading rides...</div> : (
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {rides.length === 0
                ? <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>No rides found matching filters.</div>
                : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                        {['Vehicle', 'Customer', 'Driver', 'Fare', 'Status', 'Date', ''].map(h => (
                          <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: '#475569', fontWeight: '700', fontSize: '12px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rides.map((r: any) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', backgroundColor: selectedRide?.id === r.id ? '#f8faff' : '#fff' }}
                          onClick={() => openDetail(r.id)}
                          onMouseEnter={e => { if (selectedRide?.id !== r.id) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                          onMouseLeave={e => { if (selectedRide?.id !== r.id) e.currentTarget.style.backgroundColor = '#fff'; }}>
                          <td style={{ padding: '12px 14px' }}>{vehicleIcon(r.vehicleType)} <strong>{r.vehicleType}</strong></td>
                          <td style={{ padding: '12px 14px', color: '#334155' }}>{r.customer?.name || '—'}</td>
                          <td style={{ padding: '12px 14px', color: '#334155' }}>{r.driver?.name || <em style={{ color: '#94a3b8' }}>None</em>}</td>
                          <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0f172a' }}>₹{r.fare?.toFixed(0)}</td>
                          <td style={{ padding: '12px 14px' }}>{statusBadge(r.status)}</td>
                          <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: '12px' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                          <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {ASSIGNABLE.includes(r.status) && (
                                <button onClick={() => { openDetail(r.id).then(() => openAssign(r.id)); }} style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#eff6ff', color: '#2563eb', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>Assign</button>
                              )}
                              {CANCELLABLE.includes(r.status) && (
                                <button onClick={() => handleCancel(r.id)} style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#fff5f5', color: '#ef4444', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
                              )}
                            </div>
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

        {/* Side Drawer */}
        {selectedRide && (
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', position: 'sticky', top: '20px', maxHeight: '85vh', overflowY: 'auto' }}>
            {detailLoading
              ? <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading...</div>
              : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Ride Detail</h3>
                    <button onClick={() => setSelectedRide(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', marginBottom: '14px', wordBreak: 'break-all' }}>{selectedRide.id}</div>

                  {statusBadge(selectedRide.status)}

                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: '700' }}>PICKUP</div>
                      <div style={{ fontSize: '13px', color: '#334155' }}>📍 {selectedRide.pickupAddress}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>DROP: {selectedRide.dropoffAddress}</div>
                    </div>

                    {selectedRide.customer && (
                      <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: '700' }}>CUSTOMER</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{selectedRide.customer.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{selectedRide.customer.phone}</div>
                      </div>
                    )}

                    {selectedRide.driver && (
                      <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: '700' }}>DRIVER</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{selectedRide.driver.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{selectedRide.driver.phone}</div>
                        {selectedRide.driver.vehicle && (
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>{vehicleIcon(selectedRide.driver.vehicle.type)} {selectedRide.driver.vehicle.make} {selectedRide.driver.vehicle.model} · {selectedRide.driver.vehicle.registrationNumber}</div>
                        )}
                      </div>
                    )}

                    <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontWeight: '700' }}>FARE BREAKDOWN</div>
                      {[
                        ['Base Fare', selectedRide.baseFare],
                        ['Distance Fare', selectedRide.distanceFare],
                        ['Time Fare', selectedRide.timeFare],
                      ].map(([k, v]) => v !== undefined && (
                        <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ color: '#64748b' }}>{k}</span>
                          <span style={{ color: '#334155' }}>₹{(v as number)?.toFixed(2)}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '700', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                        <span style={{ color: '#0f172a' }}>Total</span>
                        <span style={{ color: '#00b562' }}>₹{selectedRide.fare?.toFixed(2)}</span>
                      </div>
                    </div>

                    {selectedRide.payments?.length > 0 && (
                      <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: '700' }}>PAYMENT</div>
                        <div style={{ fontSize: '13px', color: '#334155' }}>{selectedRide.payments[0].provider} · {selectedRide.payments[0].status}</div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                    {ASSIGNABLE.includes(selectedRide.status) && (
                      <button onClick={() => openAssign(selectedRide.id)} disabled={actionLoading}
                        style={{ flex: 1, padding: '9px', backgroundColor: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                        🚗 Assign Driver
                      </button>
                    )}
                    {CANCELLABLE.includes(selectedRide.status) && (
                      <button onClick={() => handleCancel(selectedRide.id)} disabled={actionLoading}
                        style={{ flex: 1, padding: '9px', backgroundColor: '#fff5f5', color: '#ef4444', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                        ❌ Cancel Ride
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
