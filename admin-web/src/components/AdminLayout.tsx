import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { logout, user } = useAuth();
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/rides', label: 'Rides Monitor', icon: '🚖' },
    { path: '/drivers', label: 'Drivers & Captains', icon: '🪪' },
    { path: '/customers', label: 'Customers', icon: '👥' },
    { path: '/payments', label: 'Payments', icon: '💳' },
    { path: '/pricing', label: 'Pricing Config', icon: '🏷️' },
    { path: '/analytics', label: 'Analytics', icon: '📈' },
    { path: '/ratings', label: 'Ratings & Reviews', icon: '⭐' },
    { path: '/notifications', label: 'Notifications', icon: '🔔' },
    { path: '/offers', label: 'Offers & Promo', icon: '🎁' },
    { path: '/staff', label: 'Admin Staff', icon: '🛡️' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{
        width: '248px',
        minWidth: '248px',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 10px rgba(0,0,0,0.08)',
        position: 'sticky',
        top: 0,
        height: '100vh',
        boxSizing: 'border-box',
        overflowY: 'auto'
      }}>
        {/* Brand */}
        <div style={{ padding: '20px 20px 18px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <span style={{ fontSize: '22px' }}>⚡</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '800', letterSpacing: '-0.025em', color: '#fff' }}>RideNow Ops</h1>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Control Dashboard</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: isActive ? '700' : '500',
                  color: isActive ? '#fff' : '#94a3b8',
                  backgroundColor: isActive ? '#00b562' : 'transparent',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 2px 8px rgba(0,181,98,0.25)' : 'none'
                }}
              >
                <span style={{ fontSize: '15px', width: '20px', textAlign: 'center' }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding: '16px', borderTop: '1px solid #1e293b', backgroundColor: '#1e293b', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', fontSize: '13px' }}>
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email || 'Administrator'}</div>
              <span style={{ fontSize: '10px', color: '#00b562', fontWeight: 'bold', textTransform: 'uppercase' }}>Admin</span>
            </div>
          </div>
          <button onClick={logout} style={{ width: '100%', padding: '8px', backgroundColor: '#334155', color: '#e2e8f0', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '32px', boxSizing: 'border-box', overflowY: 'auto', height: '100vh', minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
};
