import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const kpiCard = (label: string, value: string, icon: string, color: string, sub?: string) => (
  <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: `1px solid #e2e8f0`, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', borderLeft: `4px solid ${color}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{label}</div>
        {sub && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{sub}</div>}
      </div>
      <span style={{ fontSize: '28px' }}>{icon}</span>
    </div>
  </div>
);

const CSSBar: React.FC<{ data: any[]; valueKey: string; labelKey: string; color: string; prefix?: string }> = ({ data, valueKey, labelKey, color, prefix = '' }) => {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px', padding: '0 4px' }}>
      {data.map((d, i) => {
        const h = Math.max((d[valueKey] / max) * 100, d[valueKey] > 0 ? 8 : 2);
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', position: 'relative', group: 'bar' } as any}
            title={`${d[labelKey]}: ${prefix}${d[valueKey]}`}>
            <div style={{ width: '100%', backgroundColor: color, borderRadius: '3px 3px 0 0', height: `${h}%`, minHeight: '2px', cursor: 'default', opacity: 0.85, transition: 'opacity 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.85')} />
            <div style={{ fontSize: '9px', color: '#94a3b8', transform: 'rotate(-45deg)', transformOrigin: 'top left', whiteSpace: 'nowrap', marginTop: '4px' }}>
              {String(d[labelKey]).slice(5)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const Analytics: React.FC = () => {
  const [period, setPeriod] = useState(7);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = (p: number) => {
    setLoading(true); setError(null);
    api.getAnalytics(p)
      .then(d => setData(d))
      .catch(e => setError(e.message || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(period); }, [period]);

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>Analytics</h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>Business performance metrics and trends</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[7, 30, 90].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', backgroundColor: period === p ? '#00b562' : '#f1f5f9', color: period === p ? '#fff' : '#475569' }}>
              {p} Days
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>📊 Loading analytics...</div>}
      {error && <div style={{ backgroundColor: '#fff5f5', color: '#e53e3e', borderLeft: '4px solid #e53e3e', padding: '14px 18px', borderRadius: '8px', marginBottom: '20px' }}>⚠️ {error}</div>}

      {data && !loading && (
        <>
          {/* KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            {kpiCard('Total Rides', String(data.kpis.totalRides), '🚖', '#3b82f6', `${period} days`)}
            {kpiCard('Completed', String(data.kpis.completedRides), '✅', '#00b562')}
            {kpiCard('Cancelled', String(data.kpis.cancelledRides), '❌', '#ef4444')}
            {kpiCard('Completion Rate', `${data.kpis.completionRate}%`, '📈', '#8b5cf6')}
            {kpiCard('Revenue', fmt(data.kpis.totalRevenue), '💰', '#f59e0b')}
            {kpiCard('New Customers', String(data.kpis.newCustomers), '👥', '#06b6d4')}
            {kpiCard('New Drivers', String(data.kpis.newDrivers), '🪪', '#ec4899')}
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {/* Revenue Chart */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>📊 Daily Revenue (₹)</h3>
              {data.dailyData.length > 0
                ? <CSSBar data={data.dailyData} valueKey="revenue" labelKey="date" color="#00b562" prefix="₹" />
                : <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '14px' }}>No revenue data</div>}
            </div>

            {/* Rides Chart */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>🚖 Daily Rides</h3>
              {data.dailyData.length > 0
                ? <CSSBar data={data.dailyData} valueKey="rides" labelKey="date" color="#3b82f6" />
                : <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '14px' }}>No ride data</div>}
            </div>
          </div>

          {/* Vehicle breakdown + Completion/Cancellation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Vehicle Breakdown */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>🚗 Rides by Vehicle Type</h3>
              {data.vehicleBreakdown.map((v: any, i: number) => {
                const total = data.vehicleBreakdown.reduce((s: number, x: any) => s + x.count, 0) || 1;
                const pct = Math.round((v.count / total) * 100);
                const colors = ['#00b562', '#f59e0b', '#3b82f6'];
                const icons = ['🏍️', '🛺', '🚗'];
                return (
                  <div key={v.vehicleType} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: '#0f172a' }}>{icons[i]} {v.vehicleType}</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{v.count} ({pct}%)</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: colors[i], borderRadius: '4px' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Completion vs Cancellation */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>📉 Ride Outcomes</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { label: 'Completed', pct: data.kpis.completionRate, color: '#00b562', icon: '✅' },
                  { label: 'Cancelled', pct: data.kpis.cancellationRate, color: '#ef4444', icon: '❌' },
                  { label: 'Other', pct: Math.max(0, 100 - data.kpis.completionRate - data.kpis.cancellationRate), color: '#94a3b8', icon: '⏳' },
                ].map(r => (
                  <div key={r.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: '#0f172a' }}>{r.icon} {r.label}</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{r.pct}%</span>
                    </div>
                    <div style={{ height: '10px', backgroundColor: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${r.pct}%`, backgroundColor: r.color, borderRadius: '5px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
