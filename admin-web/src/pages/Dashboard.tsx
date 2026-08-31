import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const KpiCard: React.FC<{ label: string; value: string; icon: string; color: string; sub?: string }> = ({ label, value, icon, color, sub }) => (
  <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', borderLeft: `4px solid ${color}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px', fontWeight: '600' }}>{label}</div>
        {sub && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{sub}</div>}
      </div>
      <span style={{ fontSize: '26px' }}>{icon}</span>
    </div>
  </div>
);

const statusColor: Record<string, { color: string; bg: string }> = {
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

const vehicleIcon = (v: string) => ({ BIKE: '🏍️', AUTO: '🛺', CAB: '🚗' }[v] || '🚖');

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getStats()
      .then(d => setStats(d))
      .catch(e => setError(e.message || 'Failed to load dashboard stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '16px', color: '#94a3b8' }}>
      <div style={{ width: '40px', height: '40px', border: '4px solid #f1f5f9', borderTop: '4px solid #00b562', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: '14px' }}>Loading dashboard...</span>
    </div>
  );

  if (error) return <div style={{ backgroundColor: '#fff5f5', color: '#e53e3e', borderLeft: '4px solid #ef4444', padding: '20px 24px', borderRadius: '10px', fontSize: '14px' }}>⚠️ {error}</div>;

  if (!stats) return null;

  const { driversBreakdown = {}, paymentsBreakdown = {}, recentRides = [] } = stats;
  const totalDriversOnline = (driversBreakdown.online || 0) + (driversBreakdown.offline || 0) + (driversBreakdown.busy || 0);

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>Dashboard</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>Real-time overview of RideNow operations</p>
      </div>

      {/* Today's KPIs */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Today</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          {KpiCard({ label: "Today's Rides", value: String(stats.todayRides ?? 0), icon: '🚖', color: '#3b82f6', sub: 'bookings today' })}
          {KpiCard({ label: "Today's Revenue", value: fmt(stats.todayRevenue ?? 0), icon: '💰', color: '#00b562', sub: 'completed fares' })}
          {KpiCard({ label: 'Ongoing Rides', value: String(stats.ongoingRides ?? 0), icon: '⏱️', color: '#f59e0b', sub: 'in progress now' })}
          {KpiCard({ label: 'Online Drivers', value: String(driversBreakdown.online ?? 0), icon: '🟢', color: '#10b981', sub: 'available now' })}
        </div>
      </div>

      {/* Overall KPIs */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>All Time</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          {KpiCard({ label: 'Total Customers', value: String(stats.totalCustomers ?? 0), icon: '👥', color: '#06b6d4' })}
          {KpiCard({ label: 'Total Drivers', value: String(stats.totalDrivers ?? 0), icon: '🪪', color: '#8b5cf6' })}
          {KpiCard({ label: 'Pending Approvals', value: String(stats.pendingApprovals ?? 0), icon: '⏳', color: '#f59e0b', sub: stats.pendingApprovals > 0 ? 'action needed' : 'all clear' })}
          {KpiCard({ label: 'Total Revenue', value: fmt(stats.completedFaresSum ?? 0), icon: '💳', color: '#00b562', sub: 'completed rides' })}
        </div>
      </div>

      {/* Driver Availability + Payment Health */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Driver availability */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <h3 style={{ margin: '0 0 18px 0', fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>🚗 Driver Fleet Status</h3>
          {[
            { label: 'Online', count: driversBreakdown.online || 0, color: '#00b562' },
            { label: 'Busy', count: driversBreakdown.busy || 0, color: '#f59e0b' },
            { label: 'Offline', count: driversBreakdown.offline || 0, color: '#94a3b8' },
          ].map(s => (
            <div key={s.label} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>{s.label}</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{s.count} / {totalDriversOnline}</span>
              </div>
              <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: totalDriversOnline > 0 ? `${(s.count / totalDriversOnline) * 100}%` : '0%', backgroundColor: s.color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Payment health */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <h3 style={{ margin: '0 0 18px 0', fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>💳 Payment Health</h3>
          {[
            { label: 'Successful', count: paymentsBreakdown.success || 0, color: '#00b562', icon: '✅' },
            { label: 'Pending', count: paymentsBreakdown.pending || 0, color: '#f59e0b', icon: '⏳' },
            { label: 'Failed', count: paymentsBreakdown.failed || 0, color: '#ef4444', icon: '❌' },
          ].map(p => {
            const total = (paymentsBreakdown.success || 0) + (paymentsBreakdown.pending || 0) + (paymentsBreakdown.failed || 0);
            const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
            return (
              <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <span style={{ fontSize: '18px', width: '24px' }}>{p.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>{p.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{p.count} ({pct}%)</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: p.color, borderRadius: '3px' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Rides */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>🕐 Recent Rides</h3>
          <a href="/rides" style={{ fontSize: '13px', color: '#00b562', textDecoration: 'none', fontWeight: '600' }}>View all →</a>
        </div>
        {recentRides.length === 0
          ? <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>No rides recorded yet.</div>
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  {['Customer', 'Driver', 'Vehicle', 'Fare', 'Status', 'Time'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#475569', fontWeight: '700', fontSize: '12px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentRides.map((r: any) => {
                  const sc = statusColor[r.status] || { color: '#64748b', bg: '#f1f5f9' };
                  return (
                    <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>{r.customer?.name || '—'}</td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>{r.driver?.name || <em style={{ color: '#94a3b8' }}>Unassigned</em>}</td>
                      <td style={{ padding: '12px 16px' }}>{vehicleIcon(r.vehicleType)} {r.vehicleType}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f172a' }}>₹{r.fare?.toFixed(0) || 0}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: sc.color, backgroundColor: sc.bg }}>
                          {r.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '12px' }}>{new Date(r.createdAt).toLocaleTimeString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
};

export default Dashboard;
