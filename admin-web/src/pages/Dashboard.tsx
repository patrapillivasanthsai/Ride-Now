import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

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

export const Dashboard: React.FC = () => {
  const { theme } = useTheme();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadStats = () => {
    setLoading(true);
    api.getStats()
      .then(d => {
        setStats(d);
        setLastRefreshed(new Date());
      })
      .catch(e => setError(e.message || 'Failed to load dashboard stats'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 20000); // Live poll every 20s
    return () => clearInterval(interval);
  }, []);

  const KpiCard = ({
    label,
    value,
    icon,
    color,
    sub,
    badge,
    linkTo
  }: {
    label: string;
    value: string;
    icon: string;
    color: string;
    sub?: string;
    badge?: string;
    linkTo?: string;
  }) => {
    const cardContent = (
      <div
        style={{
          backgroundColor: theme.cardBg,
          borderRadius: '14px',
          border: `1px solid ${theme.border}`,
          padding: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          borderLeft: `4px solid ${color}`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          cursor: linkTo ? 'pointer' : 'default',
        }}
        onMouseEnter={e => {
          if (linkTo) e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={e => {
          if (linkTo) e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: theme.text, lineHeight: 1.15, marginTop: '4px' }}>{value}</div>
          </div>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
          }}>
            {icon}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
          {sub && <span style={{ fontSize: '11.5px', color: theme.textMuted }}>{sub}</span>}
          {badge && (
            <span style={{ fontSize: '10.5px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', backgroundColor: `${color}20`, color: color }}>
              {badge}
            </span>
          )}
        </div>
      </div>
    );

    return linkTo ? <Link to={linkTo} style={{ textDecoration: 'none' }}>{cardContent}</Link> : cardContent;
  };

  if (loading && !stats) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '16px', color: theme.textMuted }}>
      <div style={{ width: '40px', height: '40px', border: `4px solid ${theme.border}`, borderTop: '4px solid #00b562', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: '14px', fontWeight: '600' }}>Initializing Real-Time Dashboard...</span>
    </div>
  );

  if (error && !stats) return (
    <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', borderLeft: '4px solid #ef4444', padding: '20px 24px', borderRadius: '10px', fontSize: '14px' }}>
      ⚠️ {error}
    </div>
  );

  const {
    driversBreakdown = {},
    paymentsBreakdown = {},
    recentRides = [],
    activeCustomers = 0,
    activeDrivers = 0,
    grossBookingValue = 0,
    driverEarnings = 0,
    platformEarnings = 0
  } = stats || {};

  const totalDriversTracked = (driversBreakdown.online || 0) + (driversBreakdown.offline || 0) + (driversBreakdown.busy || 0) || stats?.totalDrivers || 1;
  const totalPaymentsCount = (paymentsBreakdown.success || 0) + (paymentsBreakdown.pending || 0) + (paymentsBreakdown.failed || 0);

  return (
    <div>
      {/* Top Banner & Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: theme.text, letterSpacing: '-0.02em' }}>Operations Dashboard</h1>
          <p style={{ margin: '4px 0 0', color: theme.textMuted, fontSize: '13.5px' }}>
            Live platform metrics, ride dispatch status, and revenue breakdown (All amounts in ₹ INR)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11.5px', color: theme.textMuted }}>
            Updated: {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            onClick={loadStats}
            style={{
              padding: '7px 14px',
              backgroundColor: theme.cardBg,
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              color: theme.text,
              fontSize: '12.5px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Quick Alerts for Actionable Items */}
      {stats?.pendingApprovals > 0 && (
        <div style={{
          backgroundColor: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '12px',
          padding: '14px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>⏳</span>
            <div>
              <strong style={{ color: '#d97706', fontSize: '14px' }}>{stats.pendingApprovals} Driver Application{stats.pendingApprovals > 1 ? 's' : ''} Pending Approval</strong>
              <div style={{ fontSize: '12px', color: theme.textMuted }}>Review driver license & vehicle documents to expand fleet capacity.</div>
            </div>
          </div>
          <Link
            to="/drivers"
            style={{
              padding: '7px 14px',
              backgroundColor: '#f59e0b',
              color: '#fff',
              borderRadius: '7px',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: '700'
            }}
          >
            Review Drivers →
          </Link>
        </div>
      )}

      {/* SECTION 1: TODAY'S OPERATIONS & REVENUE */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', fontWeight: '800', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📅 Today's Live Performance</span>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#00b562' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <KpiCard
            label="Today's Bookings"
            value={String(stats.todayRides ?? 0)}
            icon="🚖"
            color="#3b82f6"
            sub="Rides requested today"
            badge="Live"
            linkTo="/rides"
          />
          <KpiCard
            label="Today's Revenue"
            value={fmt(stats.todayRevenue ?? 0)}
            icon="💰"
            color="#00b562"
            sub="Completed rides today"
            badge="₹ INR"
            linkTo="/payments"
          />
          <KpiCard
            label="Ongoing Rides"
            value={String(stats.ongoingRides ?? 0)}
            icon="⏱️"
            color="#f59e0b"
            sub="Active on the road now"
            badge="In-flight"
            linkTo="/rides"
          />
          <KpiCard
            label="Online Drivers"
            value={`${driversBreakdown.online ?? 0} / ${stats.totalDrivers ?? 0}`}
            icon="🟢"
            color="#10b981"
            sub={`${driversBreakdown.busy ?? 0} busy on trips`}
            badge="Captains"
            linkTo="/drivers"
          />
        </div>
      </div>

      {/* SECTION 2: LIFETIME VOLUME & GROSS BOOKING VALUE */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', fontWeight: '800', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
          🌐 Platform Totals & Financial Volume
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <KpiCard
            label="Total Customers"
            value={String(stats.totalCustomers ?? 0)}
            icon="👥"
            color="#06b6d4"
            sub={`${activeCustomers} active accounts`}
            badge="Riders"
            linkTo="/customers"
          />
          <KpiCard
            label="Total Captains / Drivers"
            value={String(stats.totalDrivers ?? 0)}
            icon="🪪"
            color="#8b5cf6"
            sub={`${activeDrivers} approved & verified`}
            badge="Fleet"
            linkTo="/drivers"
          />
          <KpiCard
            label="Gross Booking Value"
            value={fmt(grossBookingValue || stats.completedFaresSum || 0)}
            icon="💳"
            color="#00b562"
            sub="Total platform GMV"
            badge="GMV"
            linkTo="/payments"
          />
          <KpiCard
            label="Platform Commission (20%)"
            value={fmt(platformEarnings)}
            icon="🏢"
            color="#6366f1"
            sub={`Driver Share (80%): ${fmt(driverEarnings)}`}
            badge="Net Revenue"
            linkTo="/analytics"
          />
        </div>
      </div>

      {/* SECTION 3: FLEET STATUS & PAYMENT HEALTH (2 COLUMNS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Driver Fleet Status */}
        <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: theme.text }}>🚗 Captain Fleet Availability</h3>
            <span style={{ fontSize: '12px', color: theme.textMuted }}>{totalDriversTracked} Total Fleet</span>
          </div>

          {[
            { label: 'Online & Available', count: driversBreakdown.online || 0, color: '#00b562', icon: '🟢' },
            { label: 'Busy on Ride', count: driversBreakdown.busy || 0, color: '#f59e0b', icon: '🟡' },
            { label: 'Offline / Inactive', count: driversBreakdown.offline || 0, color: '#94a3b8', icon: '⚪' },
          ].map(s => {
            const pct = totalDriversTracked > 0 ? Math.round((s.count / totalDriversTracked) * 100) : 0;
            return (
              <div key={s.label} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px' }}>
                  <span style={{ color: theme.text, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{s.icon}</span> {s.label}
                  </span>
                  <span style={{ fontWeight: '700', color: theme.text }}>{s.count} ({pct}%)</span>
                </div>
                <div style={{ height: '8px', backgroundColor: theme.cardBgSecondary, borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, backgroundColor: s.color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                </div>
              </div>
            );
          })}

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '14px', borderTop: `1px solid ${theme.border}` }}>
            <Link to="/drivers" style={{ fontSize: '12px', color: theme.primary, fontWeight: '700', textDecoration: 'none' }}>
              Manage Captains & Approvals →
            </Link>
          </div>
        </div>

        {/* Payment Health Summary */}
        <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: theme.text }}>💳 Payment Health & Gateway</h3>
            <span style={{ fontSize: '12px', color: theme.textMuted }}>{totalPaymentsCount} Transactions</span>
          </div>

          {[
            { label: 'Successful Payments', count: paymentsBreakdown.success || 0, color: '#00b562', icon: '✅' },
            { label: 'Pending Authorizations', count: paymentsBreakdown.pending || 0, color: '#f59e0b', icon: '⏳' },
            { label: 'Failed / Declined', count: paymentsBreakdown.failed || 0, color: '#ef4444', icon: '❌' },
          ].map(p => {
            const pct = totalPaymentsCount > 0 ? Math.round((p.count / totalPaymentsCount) * 100) : 0;
            return (
              <div key={p.label} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px' }}>
                  <span style={{ color: theme.text, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{p.icon}</span> {p.label}
                  </span>
                  <span style={{ fontWeight: '700', color: theme.text }}>{p.count} ({pct}%)</span>
                </div>
                <div style={{ height: '8px', backgroundColor: theme.cardBgSecondary, borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, backgroundColor: p.color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                </div>
              </div>
            );
          })}

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '14px', borderTop: `1px solid ${theme.border}` }}>
            <Link to="/payments" style={{ fontSize: '12px', color: theme.primary, fontWeight: '700', textDecoration: 'none' }}>
              View All Financial Transactions →
            </Link>
          </div>
        </div>
      </div>

      {/* SECTION 4: RECENT RIDES & DISPATCH MONITOR */}
      <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: theme.text }}>🚖 Recent Ride Activity</h3>
            <span style={{ fontSize: '12px', color: theme.textMuted }}>Latest ride bookings and trip states</span>
          </div>
          <Link to="/rides" style={{ fontSize: '13px', color: theme.primary, textDecoration: 'none', fontWeight: '700' }}>
            Open Rides Monitor →
          </Link>
        </div>

        {recentRides.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: theme.textMuted, fontSize: '13.5px' }}>
            No rides recorded yet. Bookings will appear here in real-time.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: theme.tableHeaderBg, borderBottom: `1px solid ${theme.border}` }}>
                  {['Vehicle', 'Customer', 'Captain / Driver', 'Fare (₹)', 'Status', 'Booking Time'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: theme.textMuted, fontWeight: '700', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentRides.map((r: any) => {
                  const s = STATUS_COLORS[r.status] || { color: theme.textMuted, bg: theme.badgeBg };
                  return (
                    <tr
                      key={r.id}
                      style={{ borderBottom: `1px solid ${theme.borderLight}` }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = theme.tableRowHover}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '13px 16px', color: theme.text, fontWeight: '600' }}>
                        {vehicleIcon(r.vehicleType)} {r.vehicleType}
                      </td>
                      <td style={{ padding: '13px 16px', color: theme.text }}>
                        <div style={{ fontWeight: '600' }}>{r.customer?.name || 'Customer'}</div>
                        <div style={{ fontSize: '11px', color: theme.textMuted }}>{r.customer?.phone || '—'}</div>
                      </td>
                      <td style={{ padding: '13px 16px', color: theme.text }}>
                        {r.driver ? (
                          <>
                            <div style={{ fontWeight: '600' }}>{r.driver.name}</div>
                            <div style={{ fontSize: '11px', color: theme.textMuted }}>{r.driver.phone}</div>
                          </>
                        ) : (
                          <span style={{ color: theme.textMuted, fontStyle: 'italic', fontSize: '12px' }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ padding: '13px 16px', fontWeight: '800', color: theme.text }}>
                        ₹{r.fare?.toFixed(0)}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: s.color, backgroundColor: s.bg }}>
                          {r.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', color: theme.textMuted, fontSize: '12px' }}>
                        {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
