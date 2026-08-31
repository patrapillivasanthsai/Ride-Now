import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', backgroundColor: '#fff', color: '#0f172a' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' };

const DEFAULT_SETTINGS: Record<string, { label: string; key: string; type: string; section: string; placeholder?: string }> = {
  company_name: { label: 'Company Name', key: 'company_name', type: 'text', section: 'General', placeholder: 'RideNow' },
  support_email: { label: 'Support Email', key: 'support_email', type: 'email', section: 'General', placeholder: 'support@ridenow.com' },
  currency: { label: 'Currency', key: 'currency', type: 'text', section: 'General', placeholder: 'INR ₹' },
  timezone: { label: 'Timezone', key: 'timezone', type: 'text', section: 'General', placeholder: 'Asia/Kolkata' },
  bike_available: { label: '🏍️ Bike Service', key: 'bike_available', type: 'toggle', section: 'Services' },
  auto_available: { label: '🛺 Auto Service', key: 'auto_available', type: 'toggle', section: 'Services' },
  cab_available: { label: '🚗 Cab Service', key: 'cab_available', type: 'toggle', section: 'Services' },
  max_search_radius_km: { label: 'Max Driver Search Radius (KM)', key: 'max_search_radius_km', type: 'number', section: 'Operations', placeholder: '10' },
  driver_commission_pct: { label: 'Driver Earnings %', key: 'driver_commission_pct', type: 'number', section: 'Operations', placeholder: '80' },
};

export const Settings: React.FC = () => {
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
      .then(d => { setSettings(d || {}); setLocalSettings(d || {}); })
      .catch(e => setError(e.message || 'Failed to load settings'))
      .finally(() => setLoading(false));

    api.getAuditLogs()
      .then((d: any) => setAuditLogs(Array.isArray(d.data) ? d.data.slice(0, 12) : []))
      .catch(() => {})
      .finally(() => setLogsLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true); setError(null); setSuccess(null);
    try {
      await api.updateSettings(localSettings);
      setSettings({ ...localSettings });
      setSuccess('Settings saved successfully!');
    } catch (e: any) {
      setError(e.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const setVal = (key: string, val: string) => setLocalSettings(s => ({ ...s, [key]: val }));
  const getBool = (key: string) => localSettings[key] === 'true' || localSettings[key] === '1';
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(localSettings);

  const sections = ['General', 'Services', 'Operations'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>Settings</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>Configure app-wide settings and service availability.</p>
        </div>
        <button onClick={handleSave} disabled={saving || !hasChanges || loading}
          style={{ padding: '10px 22px', backgroundColor: hasChanges ? '#00b562' : '#e2e8f0', color: hasChanges ? '#fff' : '#94a3b8', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: hasChanges && !saving ? 'pointer' : 'not-allowed' }}>
          {saving ? 'Saving...' : '💾 Save Changes'}
        </button>
      </div>

      {error && <div style={{ backgroundColor: '#fff5f5', color: '#e53e3e', borderLeft: '4px solid #ef4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>⚠️ {error}</div>}
      {success && <div style={{ backgroundColor: '#f0fdf4', color: '#15803d', borderLeft: '4px solid #00b562', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>✅ {success}</div>}

      {loading && <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>Loading settings...</div>}

      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Settings Panels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {sections.map(section => {
              const fields = Object.values(DEFAULT_SETTINGS).filter(f => f.section === section);
              return (
                <div key={section} style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
                  <h3 style={{ margin: '0 0 18px 0', fontSize: '14px', fontWeight: '700', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{section}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {fields.map(f => (
                      <div key={f.key}>
                        {f.type === 'toggle' ? (
                          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                            <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '600' }}>{f.label}</span>
                            <div onClick={() => setVal(f.key, getBool(f.key) ? 'false' : 'true')}
                              style={{ width: '44px', height: '24px', borderRadius: '12px', backgroundColor: getBool(f.key) ? '#00b562' : '#e2e8f0', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                              <div style={{ position: 'absolute', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#fff', top: '3px', left: getBool(f.key) ? '23px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                            </div>
                          </label>
                        ) : (
                          <>
                            <label style={labelStyle}>{f.label}</label>
                            <input type={f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : 'text'}
                              style={inputStyle} value={localSettings[f.key] || ''}
                              onChange={e => setVal(f.key, e.target.value)}
                              placeholder={f.placeholder}
                              readOnly={f.key === 'currency'} />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Audit Log Panel */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', position: 'sticky', top: '20px' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>📋 Recent Activity</h3>
            {logsLoading && <div style={{ color: '#94a3b8', fontSize: '13px' }}>Loading...</div>}
            {!logsLoading && auditLogs.length === 0 && <div style={{ color: '#94a3b8', fontSize: '13px' }}>No activity yet.</div>}
            {!logsLoading && auditLogs.map((log: any) => (
              <div key={log.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>{log.action?.replace(/_/g, ' ')}</div>
                {log.targetType && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{log.targetType}{log.targetId ? ` · ${log.targetId.slice(-8)}` : ''}</div>}
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{log.actor?.user?.email || '—'} · {new Date(log.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
