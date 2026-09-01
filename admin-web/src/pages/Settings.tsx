import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

export const Settings: React.FC = () => {
  const { theme, mode, setMode } = useTheme();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    api.getSettings()
      .then(d => {
        setSettings(d || {});
        setLocalSettings(d || {});
      })
      .catch(e => setError(e.message || 'Failed to load settings'))
      .finally(() => setLoading(false));

    api.getAuditLogs()
      .then((d: any) => setAuditLogs(Array.isArray(d.data) ? d.data.slice(0, 15) : []))
      .catch(() => {})
      .finally(() => setLogsLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.updateSettings(localSettings);
      setSettings({ ...localSettings });
      setSuccess('Settings saved and deployed across platform successfully!');
    } catch (e: any) {
      setError(e.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const setVal = (key: string, val: string) => setLocalSettings(s => ({ ...s, [key]: val }));
  const getBool = (key: string) => localSettings[key] === 'true' || localSettings[key] === '1';
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(localSettings);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: `1.5px solid ${theme.border}`,
    borderRadius: '8px',
    fontSize: '13.5px',
    boxSizing: 'border-box',
    backgroundColor: theme.inputBg,
    color: theme.text,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '12px',
    fontWeight: '700',
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: theme.text }}>Platform Configuration & Settings</h1>
          <p style={{ margin: '4px 0 0', color: theme.textMuted, fontSize: '13.5px' }}>
            Configure global company information, visual appearance, service toggles, and view security audit logs.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges || loading}
          style={{
            padding: '10px 22px',
            backgroundColor: hasChanges ? '#00b562' : theme.badgeBg,
            color: hasChanges ? '#fff' : theme.textMuted,
            border: 'none',
            borderRadius: '9px',
            fontWeight: '800',
            fontSize: '13.5px',
            cursor: hasChanges && !saving ? 'pointer' : 'not-allowed',
            boxShadow: hasChanges ? '0 4px 14px rgba(0,181,98,0.3)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          {saving ? 'Saving...' : '💾 Save Settings'}
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', borderLeft: '4px solid #ef4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{ backgroundColor: 'rgba(0,181,98,0.1)', color: '#00b562', borderLeft: '4px solid #00b562', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: '700' }}>
          ✅ {success}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: theme.textMuted }}>Loading settings...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Main Settings Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Visual Appearance & Theme */}
            <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '800', color: theme.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎨 Visual Theme & Appearance</span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setMode('light')}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: mode === 'light' ? '2px solid #00b562' : `1.5px solid ${theme.border}`,
                    backgroundColor: mode === 'light' ? 'rgba(0,181,98,0.08)' : theme.cardBgSecondary,
                    color: theme.text,
                    fontWeight: '700',
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span>☀️ Light Mode</span>
                  {mode === 'light' && <span style={{ color: '#00b562' }}>✓</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('dark')}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: mode === 'dark' ? '2px solid #00b562' : `1.5px solid ${theme.border}`,
                    backgroundColor: mode === 'dark' ? 'rgba(0,181,98,0.08)' : theme.cardBgSecondary,
                    color: theme.text,
                    fontWeight: '700',
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span>🌙 Dark Mode</span>
                  {mode === 'dark' && <span style={{ color: '#00b562' }}>✓</span>}
                </button>
              </div>
            </div>

            {/* General Company Information */}
            <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '800', color: theme.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                🏢 Company & Platform Details
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Company / App Name</label>
                  <input
                    style={inputStyle}
                    value={localSettings.company_name || 'RideNow'}
                    onChange={e => setVal('company_name', e.target.value)}
                    placeholder="RideNow"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Support Email</label>
                  <input
                    type="email"
                    style={inputStyle}
                    value={localSettings.support_email || 'support@ridenow.com'}
                    onChange={e => setVal('support_email', e.target.value)}
                    placeholder="support@ridenow.com"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Platform Currency</label>
                  <input
                    style={inputStyle}
                    value={localSettings.currency || 'INR (₹)'}
                    readOnly
                    title="Fixed to Indian Rupees ₹"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Time Zone</label>
                  <input
                    style={inputStyle}
                    value={localSettings.timezone || 'Asia/Kolkata'}
                    onChange={e => setVal('timezone', e.target.value)}
                    placeholder="Asia/Kolkata"
                  />
                </div>
              </div>
            </div>

            {/* Service Availability Toggles */}
            <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '800', color: theme.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                🚖 Fleet Service Availability
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { key: 'bike_available', label: '🏍️ Bike / Moto Service', desc: 'Accept bike ride requests in the passenger app' },
                  { key: 'auto_available', label: '🛺 Auto Rickshaw Service', desc: 'Accept 3-wheeler auto ride requests' },
                  { key: 'cab_available', label: '🚗 Cab / Taxi Service', desc: 'Accept 4-seater cab requests' },
                ].map(svc => {
                  const isActive = getBool(svc.key);
                  return (
                    <div
                      key={svc.key}
                      onClick={() => setVal(svc.key, isActive ? 'false' : 'true')}
                      style={{
                        padding: '12px 16px',
                        backgroundColor: theme.cardBgSecondary,
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: theme.text }}>{svc.label}</div>
                        <div style={{ fontSize: '11.5px', color: theme.textMuted }}>{svc.desc}</div>
                      </div>
                      <div style={{
                        width: '46px',
                        height: '26px',
                        borderRadius: '13px',
                        backgroundColor: isActive ? '#00b562' : '#94a3b8',
                        position: 'relative',
                        transition: 'background 0.2s ease'
                      }}>
                        <div style={{
                          position: 'absolute',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#fff',
                          top: '3px',
                          left: isActive ? '23px' : '3px',
                          transition: 'left 0.2s ease',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Operational Parameters */}
            <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '800', color: theme.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ⚙️ Operational Parameters & Commission
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Max Driver Search Radius (KM)</label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={localSettings.max_search_radius_km || '10'}
                    onChange={e => setVal('max_search_radius_km', e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Driver Commission Share (%)</label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={localSettings.driver_commission_pct || '80'}
                    onChange={e => setVal('driver_commission_pct', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Audit & Security Activity Feed */}
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '22px', position: 'sticky', top: '20px', maxHeight: '88vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: theme.text }}>📋 Security & Audit Logs</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: theme.textMuted }}>
              Recent administrative and operational state changes recorded in immutable audit log.
            </p>

            {logsLoading ? (
              <div style={{ color: theme.textMuted, fontSize: '13px' }}>Loading audit history...</div>
            ) : auditLogs.length === 0 ? (
              <div style={{ color: theme.textMuted, fontSize: '13px' }}>No audit activity recorded yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {auditLogs.map((log: any) => (
                  <div key={log.id} style={{ borderBottom: `1px solid ${theme.borderLight}`, paddingBottom: '10px' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: '700', color: theme.text }}>
                      {log.action?.replace(/_/g, ' ')}
                    </div>
                    {log.targetType && (
                      <div style={{ fontSize: '11.5px', color: theme.textMuted }}>
                        Target: {log.targetType} {log.targetId ? `(#${log.targetId.slice(-6)})` : ''}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '2px' }}>
                      {log.actor?.user?.email || 'Admin'} · {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(log.createdAt).toLocaleDateString()})
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
