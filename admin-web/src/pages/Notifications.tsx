import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const TYPE_ICONS: Record<string, string> = {
  SYSTEM: '⚙️ System Alert',
  OFFER: '🎁 Offer & Promo',
  RIDE_UPDATE: '🚖 Ride Update',
  PAYMENT: '💳 Payment Notification',
  APPROVAL: '✅ Approval Notice',
  SAFETY: '🚨 Safety Alert',
  BROADCAST: '📢 Public Broadcast',
};

export const Notifications: React.FC = () => {
  const { theme } = useTheme();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    body: '',
    type: 'SYSTEM',
    targetRole: 'ALL',
  });
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadNotifications = () => {
    setLoading(true);
    setError(null);
    api.getAdminNotifications()
      .then((d: any) => setNotifications(d.data || d))
      .catch(e => setError(e.message || 'Failed to load notifications'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadNotifications(); }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    setSubmitting(true);
    try {
      await api.createNotification(form);
      showToast(`Notification broadcasted to ${form.targetRole.replace(/_/g, ' ')}!`);
      setForm({ title: '', body: '', type: 'SYSTEM', targetRole: 'ALL' });
      setShowComposeModal(false);
      loadNotifications();
    } catch (e: any) {
      alert(e.message || 'Failed to send notification');
    } finally {
      setSubmitting(false);
    }
  };

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
      {/* Toast Notification */}
      {toastMsg && (
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
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: theme.text }}>Platform Notifications & Broadcasts</h1>
          <p style={{ margin: '4px 0 0', color: theme.textMuted, fontSize: '13.5px' }}>
            Send real-time alerts, safety notices, and updates targeted to Customers, Drivers, or All users.
          </p>
        </div>
        <button
          onClick={() => setShowComposeModal(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#00b562',
            color: '#fff',
            border: 'none',
            borderRadius: '9px',
            fontWeight: '800',
            fontSize: '13.5px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,181,98,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>🔔</span> Send Notification
        </button>
      </div>

      {/* Compose Notification Modal */}
      {showComposeModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '16px', padding: '28px', width: '500px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `1px solid ${theme.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: theme.text }}>🔔 Send Broadcast / Notification</h3>
              <button onClick={() => setShowComposeModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: theme.textMuted, cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSendNotification} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Target Audience</label>
                <select
                  style={inputStyle}
                  value={form.targetRole}
                  onChange={e => setForm({ ...form, targetRole: e.target.value })}
                >
                  <option value="CUSTOMER_ONLY">👥 Customers Only (Delivered to Customer App / Web)</option>
                  <option value="DRIVER_ONLY">🪪 Captains / Drivers Only (Delivered to Driver Mobile)</option>
                  <option value="ADMIN_ONLY">🛡️ Admin & Staff Only</option>
                  <option value="ALL">🌐 All Users (Customers & Drivers)</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Notification Category</label>
                <select
                  style={inputStyle}
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                >
                  <option value="SYSTEM">⚙️ System Alert / Maintenance</option>
                  <option value="OFFER">🎁 Offer & Promotional Campaign</option>
                  <option value="RIDE_UPDATE">🚖 Ride Dispatch & Operational Update</option>
                  <option value="SAFETY">🚨 Safety & Emergency Alert</option>
                  <option value="BROADCAST">📢 General Platform Broadcast</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Notification Title</label>
                <input
                  style={inputStyle}
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Peak Hour Bonus Active! ⚡"
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Message Body</label>
                <textarea
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  value={form.body}
                  onChange={e => setForm({ ...form, body: e.target.value })}
                  placeholder="Write message details for the targeted users..."
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ flex: 1, padding: '12px', backgroundColor: '#00b562', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '13.5px', cursor: submitting ? 'not-allowed' : 'pointer' }}
                >
                  {submitting ? 'Broadcasting...' : '🚀 Broadcast Now'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  style={{ flex: 1, padding: '12px', backgroundColor: theme.cardBgSecondary, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', borderLeft: '4px solid #ef4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Notifications Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: theme.textMuted }}>Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: theme.textMuted, backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}` }}>
          🔔 No notifications sent yet. Click "Send Notification" to broadcast your first message.
        </div>
      ) : (
        <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: theme.tableHeaderBg, borderBottom: `1px solid ${theme.border}` }}>
                  {['Target Audience', 'Type', 'Title', 'Message Body', 'Sent Date'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: theme.textMuted, fontWeight: '700', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {notifications.map((n: any) => (
                  <tr
                    key={n.id}
                    style={{ borderBottom: `1px solid ${theme.borderLight}` }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = theme.tableRowHover}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: n.targetRole === 'CUSTOMER_ONLY' ? '#3b82f6' : n.targetRole === 'DRIVER_ONLY' ? '#00b562' : '#8b5cf6',
                        backgroundColor: n.targetRole === 'CUSTOMER_ONLY' ? 'rgba(59,130,246,0.1)' : n.targetRole === 'DRIVER_ONLY' ? 'rgba(0,181,98,0.1)' : 'rgba(139,92,246,0.1)'
                      }}>
                        {n.targetRole?.replace(/_/g, ' ') || 'ALL'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: theme.text, fontWeight: '600' }}>
                      {TYPE_ICONS[n.type] || n.type}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: theme.text }}>
                      {n.title}
                    </td>
                    <td style={{ padding: '14px 16px', color: theme.textMuted, maxWidth: '340px' }}>
                      {n.body}
                    </td>
                    <td style={{ padding: '14px 16px', color: theme.textMuted, fontSize: '12px' }}>
                      {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
