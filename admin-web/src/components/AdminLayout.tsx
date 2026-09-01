import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { logout, user } = useAuth();
  const { theme, mode, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      if (!mobile) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: '📊', badge: 'Live' },
    { path: '/rides', label: 'Rides Monitor', icon: '🚖' },
    { path: '/drivers', label: 'Drivers & Captains', icon: '🪪' },
    { path: '/customers', label: 'Customers', icon: '👥' },
    { path: '/pricing', label: 'Pricing (₹ INR)', icon: '🏷️' },
    { path: '/payments', label: 'Payments', icon: '💳' },
    { path: '/analytics', label: 'Analytics & Reports', icon: '📈' },
    { path: '/ratings', label: 'Ratings & Reviews', icon: '⭐' },
    { path: '/notifications', label: 'Notifications', icon: '🔔' },
    { path: '/offers', label: 'Offers & Promos', icon: '🎁' },
    { path: '/staff', label: 'Admin Staff & Roles', icon: '🛡️' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: theme.bg,
      color: theme.text,
      fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Mobile Backdrop Overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(2px)',
            zIndex: 998,
            transition: 'opacity 0.2s'
          }}
        />
      )}

      {/* Sidebar (Desktop Sticky / Mobile Drawer) */}
      <aside style={{
        width: '260px',
        minWidth: '260px',
        backgroundColor: theme.sidebarBg,
        borderRight: `1px solid ${theme.sidebarBorder}`,
        color: theme.sidebarText,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: mode === 'dark' ? '4px 0 20px rgba(0,0,0,0.5)' : '4px 0 15px rgba(0,0,0,0.04)',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0,
        left: 0,
        bottom: isMobile ? 0 : 'auto',
        height: '100vh',
        boxSizing: 'border-box',
        zIndex: 999,
        transform: isMobile ? (mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        transition: isMobile ? 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
      }}>
        {/* Brand */}
        <div style={{
          padding: '18px 20px',
          borderBottom: `1px solid ${theme.sidebarBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#00b562',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 4px 12px rgba(0,181,98,0.35)'
            }}>
              ⚡
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h1 style={{ margin: 0, fontSize: '17px', fontWeight: '800', letterSpacing: '-0.02em', color: '#fff' }}>RideNow</h1>
                <span style={{ fontSize: '10px', backgroundColor: 'rgba(0,181,98,0.2)', color: '#00b562', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>PRO</span>
              </div>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Admin Operations</span>
            </div>
          </div>

          {/* Close button on mobile */}
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 10px 8px' }}>Main Navigation</div>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => isMobile && setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '9px',
                  textDecoration: 'none',
                  fontSize: '13.5px',
                  fontWeight: isActive ? '700' : '500',
                  color: isActive ? '#fff' : '#94a3b8',
                  backgroundColor: isActive ? '#00b562' : 'transparent',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 4px 14px rgba(0,181,98,0.35)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px', width: '22px', textAlign: 'center' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '10px', backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(0,181,98,0.2)', color: isActive ? '#fff' : '#00b562', fontWeight: '700' }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer & User Profile */}
        <div style={{ padding: '16px', borderTop: `1px solid ${theme.sidebarBorder}`, backgroundColor: mode === 'dark' ? '#070b14' : '#141e33', flexShrink: 0 }}>
          {/* Theme Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              transition: 'background 0.2s'
            }}
          >
            <span>{mode === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
            <span style={{ fontSize: '11px', opacity: 0.7 }}>Switch</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', fontSize: '14px', border: '2px solid #00b562' }}>
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email || 'Admin'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#00b562' }}></span>
                <span style={{ fontSize: '10.5px', color: '#00b562', fontWeight: '700', textTransform: 'uppercase' }}>Super Admin</span>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid #334155',
              borderRadius: '7px',
              fontWeight: '600',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0, width: '100%' }}>
        {/* Top Header Bar with Hamburger Button */}
        <header style={{
          height: '56px',
          backgroundColor: theme.cardBg,
          borderBottom: `1px solid ${theme.border}`,
          padding: isMobile ? '0 16px' : '0 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Hamburger button on mobile */}
            {isMobile && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{
                  background: 'none',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: theme.text,
                  backgroundColor: theme.cardBgSecondary
                }}
                aria-label="Toggle navigation menu"
              >
                ☰
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: isMobile ? '12px' : '13px', color: theme.textMuted, fontWeight: '500' }}>Admin</span>
              <span style={{ color: theme.border }}>/</span>
              <span style={{ fontSize: isMobile ? '13px' : '14px', fontWeight: '700', color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? '130px' : 'none' }}>
                {menuItems.find(m => m.path === location.pathname)?.label || 'Overview'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Live operational status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', backgroundColor: theme.primaryBg, border: `1px solid ${theme.primary}40` }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: theme.primary, boxShadow: `0 0 8px ${theme.primary}` }} />
              <span style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: '700', color: theme.primary }}>
                {isMobile ? 'Live (₹)' : 'System Live (₹ INR)'}
              </span>
            </div>

            {/* Quick theme button */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} Mode`}
              style={{
                background: theme.cardBgSecondary,
                border: `1px solid ${theme.border}`,
                borderRadius: '8px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '14px',
                color: theme.text,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {mode === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main style={{
          flex: 1,
          padding: isMobile ? '16px 12px 40px' : '24px 28px 48px',
          boxSizing: 'border-box',
          backgroundColor: theme.bg,
          width: '100%',
          maxWidth: '100%'
        }}>
          {children}
        </main>
      </div>
    </div>
  );
};
