import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const CSSBarChart: React.FC<{
  data: any[];
  valueKey: string;
  labelKey: string;
  color: string;
  prefix?: string;
  theme: any;
}> = ({ data, valueKey, labelKey, color, prefix = '', theme }) => {
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '140px', padding: '0 4px', width: '100%', boxSizing: 'border-box' }}>
      {data.map((d, i) => {
        const val = d[valueKey] || 0;
        const h = Math.max((val / max) * 100, val > 0 ? 8 : 2);
        return (
          <div
            key={i}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}
            title={`${d[labelKey]}: ${prefix}${val}`}
          >
            <div style={{ fontSize: '10px', color: theme.textMuted, marginBottom: '4px', fontWeight: '700' }}>
              {val > 0 ? `${prefix}${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}` : ''}
            </div>
            <div
              style={{
                width: '100%',
                backgroundColor: color,
                borderRadius: '4px 4px 0 0',
                height: `${h}%`,
                minHeight: '3px',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                opacity: 0.85
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.85'}
            />
            <div style={{ fontSize: '10px', color: theme.textMuted, whiteSpace: 'nowrap', marginTop: '6px' }}>
              {String(d[labelKey]).slice(5)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const Analytics: React.FC = () => {
  const { theme } = useTheme();
  const [period, setPeriod] = useState(7);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = (p: number) => {
    setLoading(true);
    setError(null);
    api.getAnalytics(p)
      .then(d => setData(d))
      .catch(e => setError(e.message || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(period); }, [period]);

  const kpis = data?.kpis || {};
  const totalRev = kpis.totalRevenue || 0;
  const platformRev = totalRev * 0.20;
  const driverShare = totalRev * 0.80;

  return (
    <div>
      {/* Header with Period Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: theme.text }}>Analytics & Business Intelligence</h1>
          <p style={{ margin: '4px 0 0', color: theme.textMuted, fontSize: '13.5px' }}>
            Comprehensive reporting on revenue, gross booking value, vehicle distribution, and conversion rates.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', backgroundColor: theme.cardBg, padding: '4px', borderRadius: '10px', border: `1px solid ${theme.border}` }}>
          {[7, 30, 90].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                backgroundColor: period === p ? '#00b562' : 'transparent',
                color: period === p ? '#fff' : theme.textMuted,
                transition: 'all 0.15s ease'
              }}
            >
              {p} Days
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: theme.textMuted }}>📊 Loading analytics reports...</div>
      )}

      {error && (
        <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', borderLeft: '4px solid #ef4444', padding: '14px 18px', borderRadius: '8px', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      {data && !loading && (
        <>
          {/* Top KPI Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '20px', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>Total Bookings</div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: theme.text, marginTop: '4px' }}>{kpis.totalRides ?? 0}</div>
              <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '2px' }}>Last {period} days</div>
            </div>

            <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '20px', borderLeft: '4px solid #00b562' }}>
              <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>Gross Revenue (₹)</div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#00b562', marginTop: '4px' }}>{fmt(totalRev)}</div>
              <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '2px' }}>Completed rides sum</div>
            </div>

            <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '20px', borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>Platform Net (20%)</div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#8b5cf6', marginTop: '4px' }}>{fmt(platformRev)}</div>
              <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '2px' }}>Commission earnings</div>
            </div>

            <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '20px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>Captain Payout (80%)</div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#f59e0b', marginTop: '4px' }}>{fmt(driverShare)}</div>
              <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '2px' }}>Driver earnings share</div>
            </div>
          </div>

          {/* Revenue & Rides Daily Trend Charts (2 Columns) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: theme.text }}>💰 Daily Revenue Trend (₹ INR)</h3>
                <span style={{ fontSize: '12px', color: '#00b562', fontWeight: '700' }}>{fmt(totalRev)} Total</span>
              </div>
              {data.dailyData?.length > 0 ? (
                <CSSBarChart data={data.dailyData} valueKey="revenue" labelKey="date" color="#00b562" prefix="₹" theme={theme} />
              ) : (
                <div style={{ textAlign: 'center', color: theme.textMuted, padding: '40px 0' }}>No daily revenue recorded</div>
              )}
            </div>

            <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: theme.text }}>🚖 Daily Ride Volume</h3>
                <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '700' }}>{kpis.totalRides ?? 0} Trips</span>
              </div>
              {data.dailyData?.length > 0 ? (
                <CSSBarChart data={data.dailyData} valueKey="rides" labelKey="date" color="#3b82f6" theme={theme} />
              ) : (
                <div style={{ textAlign: 'center', color: theme.textMuted, padding: '40px 0' }}>No daily trips recorded</div>
              )}
            </div>
          </div>

          {/* Vehicle Distribution & Outcomes (2 Columns) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {/* Vehicle Usage Distribution (Pie / Progress Representation) */}
            <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '24px' }}>
              <h3 style={{ margin: '0 0 18px 0', fontSize: '15px', fontWeight: '800', color: theme.text }}>🚗 Vehicle Fleet Usage (Bike vs Auto vs Cab)</h3>
              {data.vehicleBreakdown?.map((v: any) => {
                const total = data.vehicleBreakdown.reduce((s: number, x: any) => s + x.count, 0) || 1;
                const pct = Math.round((v.count / total) * 100);
                const colorMap: Record<string, string> = { BIKE: '#00b562', AUTO: '#f59e0b', CAB: '#3b82f6' };
                const iconMap: Record<string, string> = { BIKE: '🏍️ Bike', AUTO: '🛺 Auto', CAB: '🚗 Cab' };
                const col = colorMap[v.vehicleType] || '#8b5cf6';
                return (
                  <div key={v.vehicleType} style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                      <span style={{ color: theme.text, fontWeight: '700' }}>{iconMap[v.vehicleType] || v.vehicleType}</span>
                      <span style={{ fontWeight: '800', color: theme.text }}>{v.count} rides ({pct}%)</span>
                    </div>
                    <div style={{ height: '9px', backgroundColor: theme.cardBgSecondary, borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: col, borderRadius: '5px', transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ride Outcomes Gauge (Completion vs Cancellation) */}
            <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '24px' }}>
              <h3 style={{ margin: '0 0 18px 0', fontSize: '15px', fontWeight: '800', color: theme.text }}>📈 Conversion & Completion Health</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                    <span style={{ color: theme.text, fontWeight: '700' }}>✅ Ride Completion Rate</span>
                    <span style={{ fontWeight: '800', color: '#00b562' }}>{kpis.completionRate ?? 0}%</span>
                  </div>
                  <div style={{ height: '9px', backgroundColor: theme.cardBgSecondary, borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${kpis.completionRate ?? 0}%`, backgroundColor: '#00b562', borderRadius: '5px' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                    <span style={{ color: theme.text, fontWeight: '700' }}>❌ Ride Cancellation Rate</span>
                    <span style={{ fontWeight: '800', color: '#ef4444' }}>{kpis.cancellationRate ?? 0}%</span>
                  </div>
                  <div style={{ height: '9px', backgroundColor: theme.cardBgSecondary, borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${kpis.cancellationRate ?? 0}%`, backgroundColor: '#ef4444', borderRadius: '5px' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', paddingTop: '12px', borderTop: `1px solid ${theme.borderLight}` }}>
                  <div style={{ backgroundColor: theme.cardBgSecondary, padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: theme.textMuted }}>New Customers</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: theme.text, marginTop: '2px' }}>+{kpis.newCustomers ?? 0}</div>
                  </div>
                  <div style={{ backgroundColor: theme.cardBgSecondary, padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: theme.textMuted }}>New Captains</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: theme.text, marginTop: '2px' }}>+{kpis.newDrivers ?? 0}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
