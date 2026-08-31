import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', backgroundColor: '#fff', color: '#0f172a', outline: 'none' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' };

export const Notifications: React.FC = () => {
  const [form, setForm] = useState({ title: '', body: '', type: 'SYSTEM', targetRole: 'ALL' });
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const [history, setHistory] = useState<any[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [histError, setHistError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);

  const loadHistory = (p = 1) => {
    setHistLoading(true); setHistError(null);
    api.getAdminNotifications(p)
      .then((d: any) => { setHistory(d.data || d); setMeta(d.meta || null); })
      .catch((e: any) => setHistError(e.message || 'Failed to load notifications'))
      .finally(() => setHistLoading(false));
  };

  useEffect(() => { loadHistory(page); }, [page]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) { setSendError('Title and body are required.'); return; }
    setSending(true); setSendSuccess(null); setSendError(null);
    try {
      await api.createNotification(form as any);
      setSendSuccess('✅ Notification sent successfully!');
      setForm({ title: '', body: '', type: 'SYSTEM', targetRole: 'ALL' });
      loadHistory(1); setPage(1);
    } catch (e: any) {
      setSendError(e.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const targetLabel = (role: string) => ({ ALL: '🌐 Everyone', CUSTOMER_ONLY: '👥 Customers', DRIVER_ONLY: '🪪 Drivers' }[role] || role);
  const typeIcon = (t: string) => ({ SYSTEM: '⚙️', OFFER: '🎁', BROADCAST: '📢', SAFETY: '🚨', RIDE_UPDATE: '🚖', APPROVAL: '✅' }[t] || '📬');

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>Notifications</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>Broadcast messages to customers, drivers, or everyone.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Compose Panel */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', position: 'sticky', top: '20px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>📬 Send Notification</h3>

          {sendError && <div style={{ backgroundColor: '#fff5f5', color: '#e53e3e', borderLeft: '4px solid #ef4444', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>⚠️ {sendError}</div>}
          {sendSuccess && <div style={{ backgroundColor: '#f0fdf4', color: '#15803d', borderLeft: '4px solid #00b562', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>{sendSuccess}</div>}

          <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Title</label>
              <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Notification title" required />
            </div>
            <div>
              <label style={labelStyle}>Message</label>
              <textarea style={{ ...inputStyle, height: '90px', resize: 'vertical' } as any} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Write your message..." required />
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <select style={inputStyle} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="SYSTEM">⚙️ System</option>
                <option value="BROADCAST">📢 Broadcast</option>
                <option value="OFFER">🎁 Offer</option>
                <option value="SAFETY">🚨 Safety Alert</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Target Audience</label>
              <select style={inputStyle} value={form.targetRole} onChange={e => setForm(f => ({ ...f, targetRole: e.target.value }))}>
                <option value="ALL">🌐 Everyone (Customers + Drivers)</option>
                <option value="CUSTOMER_ONLY">👥 Customers Only</option>
                <option value="DRIVER_ONLY">🪪 Drivers Only</option>
              </select>
            </div>
            <button type="submit" disabled={sending}
              style={{ padding: '11px', backgroundColor: '#00b562', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1 }}>
              {sending ? 'Sending...' : '🚀 Send Now'}
            </button>
          </form>
        </div>

        {/* History Panel */}
        <div>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>📋 Notification History</h3>
          {histError && <div style={{ backgroundColor: '#fff5f5', color: '#e53e3e', borderLeft: '4px solid #ef4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px' }}>⚠️ {histError}</div>}
          {histLoading && <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading history...</div>}
          {!histLoading && history.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px' }}>No notifications sent yet.</div>}
          {!histLoading && history.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {history.map((n: any) => (
                <div key={n.id} style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '14px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>{typeIcon(n.type || 'SYSTEM')} {n.title}</div>
                      <div style={{ color: '#64748b', fontSize: '13px', marginTop: '3px' }}>{n.body}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(n.createdAt).toLocaleDateString()}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>{targetLabel(n.targetRole || 'CUSTOMER_ONLY')}</div>
                    </div>
                  </div>
                </div>
              ))}
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
      </div>
    </div>
  );
};

export default Notifications;
