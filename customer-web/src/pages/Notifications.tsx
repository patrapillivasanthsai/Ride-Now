import { useEffect, useState } from 'react';
import { api } from '../services/api';

export function Notifications() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true); setError(null);
    api.getNotifications()
      .then(d => setData(d))
      .catch(e => setError(e.message || 'Failed to load notifications'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      load();
    } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markNotificationRead('all');
      load();
    } catch { /* silent */ }
  };

  const typeIcon = (type: string) => ({ SYSTEM: '⚙️', OFFER: '🎁', BROADCAST: '📢', SAFETY: '🚨', RIDE_UPDATE: '🚖', APPROVAL: '✅' }[type] || '🔔');

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#111' }}>🔔 Notifications</h1>
          {data?.unreadCount > 0 && (
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>{data.unreadCount} unread</p>
          )}
        </div>
        {data?.unreadCount > 0 && (
          <button onClick={handleMarkAllRead} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#475569', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            Mark all read
          </button>
        )}
      </div>

      {error && <div style={{ backgroundColor: '#fff5f5', color: '#e53e3e', borderLeft: '4px solid #ef4444', padding: '14px 18px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>⚠️ {error}</div>}
      {loading && <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>Loading notifications...</div>}

      {!loading && (!data?.notifications || data.notifications.length === 0) && (
        <div style={{ textAlign: 'center', padding: '64px', color: '#94a3b8', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔔</div>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px' }}>All clear!</div>
          <div style={{ fontSize: '14px' }}>No notifications yet.</div>
        </div>
      )}

      {!loading && data?.notifications?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {data.notifications.map((n: any) => (
            <div key={n.id} onClick={() => !n.isRead && handleMarkRead(n.id)}
              style={{ backgroundColor: n.isRead ? '#fff' : '#f0fdf4', borderRadius: '12px', border: `1px solid ${n.isRead ? '#e2e8f0' : '#bbf7d0'}`, padding: '16px 20px', cursor: n.isRead ? 'default' : 'pointer', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '22px', flexShrink: 0 }}>{typeIcon(n.type)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ fontWeight: n.isRead ? '600' : '800', fontSize: '14px', color: '#0f172a' }}>{n.title}</div>
                    {!n.isRead && <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00b562', flexShrink: 0, marginTop: '4px' }} />}
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '3px', lineHeight: 1.5 }}>{n.body}</div>
                  {n.offer && (
                    <div style={{ marginTop: '8px', backgroundColor: '#fff', borderRadius: '8px', padding: '8px 12px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#00b562', fontWeight: '700' }}>
                      🎁 {n.offer.title} {n.offer.couponCode && `· Code: ${n.offer.couponCode}`} {n.offer.discountValue && `· ₹${n.offer.discountValue} off`}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>{new Date(n.createdAt).toLocaleString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;
