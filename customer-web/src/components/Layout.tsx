import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      api.getNotifications()
        .then((d: any) => setUnreadCount(d?.unreadCount || 0))
        .catch(() => {});
    }
  }, [user]);

  const handleLogoutClick = () => {
    logout();
    navigate('/login');
  };

  const searchParams = new URLSearchParams(location.search);
  const step = searchParams.get('step');
  const isAssignedStep = location.pathname === '/' && (step === '2' || step === '3');

  const handleNavScroll = (elementId: string) => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById(elementId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(elementId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const linkStyle = {
    color: '#333',
    textDecoration: 'none',
    padding: '8px 12px',
    transition: 'all 0.2s ease',
    fontSize: '15px'
  };

  const dropdownLinkStyle = {
    display: 'block',
    padding: '10px 20px',
    color: '#333',
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'background 0.2s',
  };

  const isHome = location.pathname === '/';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      {/* Navigation Header */}
      <nav style={{
        backgroundColor: '#fff',
        borderBottom: '1px solid #e3e6f0',
        padding: '12px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h2 
            style={{ margin: 0, color: '#00b562', cursor: 'pointer', fontWeight: 'bold', fontSize: '24px' }} 
            onClick={() => navigate('/')}
          >
            RideNow
          </h2>
        </div>

        {/* Navigation Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {user ? (
            <>
              {!isAssignedStep && (
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginRight: '15px' }}>
                  <Link to="/" style={{ ...linkStyle, color: location.pathname === '/' && !step ? '#00b562' : '#333', fontWeight: location.pathname === '/' && !step ? 'bold' : 'normal' }}>Home</Link>
                  <a href="#about" onClick={(e) => { e.preventDefault(); handleNavScroll('about'); }} style={linkStyle}>About Us</a>
                  <a href="#safety" onClick={(e) => { e.preventDefault(); handleNavScroll('safety'); }} style={linkStyle}>Safety</a>
                  <a href="#contact" onClick={(e) => { e.preventDefault(); handleNavScroll('contact'); }} style={linkStyle}>Contact Us</a>
                </div>
              )}
              {/* Notification Bell */}
              <Link to="/notifications" style={{ position: 'relative', textDecoration: 'none', padding: '6px', display: 'flex', alignItems: 'center' }} title="Notifications">
                <span style={{ fontSize: '20px' }}>🔔</span>
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: '0', right: '0', backgroundColor: '#ef4444', color: '#fff', borderRadius: '50%', fontSize: '10px', fontWeight: '700', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
              {/* Profile Dropdown Container */}
              <div style={{ position: 'relative' }}>
                <div 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: '1px solid #e3e6f0',
                    backgroundColor: '#f8f9fa',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <span style={{ fontSize: '16px' }}>👤</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                    {user.email.split('@')[0]}
                  </span>
                  <span style={{ fontSize: '10px', color: '#888' }}>▼</span>
                </div>

                {dropdownOpen && (
                  <>
                    <div 
                      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} 
                      onClick={() => setDropdownOpen(false)} 
                    />
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '8px',
                      backgroundColor: '#fff',
                      border: '1px solid #e3e6f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      zIndex: 999,
                      minWidth: '220px',
                      padding: '8px 0',
                    }}>
                      <div style={{ padding: '8px 20px', borderBottom: '1px solid #f8f9fa', fontSize: '12px', color: '#777' }}>
                        Signed in as:<br/>
                        <strong style={{ color: '#333', wordBreak: 'break-all' }}>{user.email}</strong>
                      </div>
                      <Link to="/profile" style={dropdownLinkStyle} onClick={() => setDropdownOpen(false)}>My Profile</Link>
                      <Link to="/rides" style={dropdownLinkStyle} onClick={() => setDropdownOpen(false)}>Ride History</Link>
                      <Link to="/payment-methods" style={dropdownLinkStyle} onClick={() => setDropdownOpen(false)}>Payments</Link>
                      <div style={{ height: '1px', backgroundColor: '#eee', margin: '5px 0' }} />
                      <button 
                        onClick={() => { setDropdownOpen(false); handleLogoutClick(); }} 
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '10px 20px',
                          textAlign: 'left',
                          border: 'none',
                          background: 'none',
                          color: '#dc3545',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <Link to="/login" style={{ color: '#00b562', textDecoration: 'none', fontWeight: 'bold', fontSize: '15px' }}>Login</Link>
              <span style={{ color: '#ccc' }}>|</span>
              <Link to="/register" style={{ color: '#333', textDecoration: 'none', fontWeight: 'bold', fontSize: '15px' }}>Register</Link>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main style={{ 
        flex: 1, 
        padding: isHome ? '0' : '30px 20px', 
        maxWidth: isHome ? '100%' : '1000px', 
        width: '100%', 
        margin: '0 auto', 
        boxSizing: 'border-box' 
      }}>
        {children}
      </main>

      {/* Footer */}
      {!isAssignedStep && (
        <footer style={{
          backgroundColor: '#111',
          color: '#aaa',
          borderTop: '1px solid #222',
          padding: '40px 30px 30px 30px',
          fontSize: '14px',
        }}>
          <div style={{ 
            maxWidth: '1100px', 
            margin: '0 auto', 
            display: 'flex', 
            flexWrap: 'wrap', 
            justifyContent: 'space-between', 
            gap: '30px',
            marginBottom: '30px'
          }}>
            <div>
              <h3 style={{ color: '#00b562', margin: '0 0 15px 0', fontSize: '20px' }}>RideNow</h3>
              <p style={{ maxWidth: '280px', color: '#888', fontSize: '13px', lineHeight: '1.6' }}>
                Next-Gen commute booking platform providing quick, reliable, and affordable rides at your doorstep.
              </p>
            </div>
            <div>
              <h4 style={{ color: '#fff', margin: '0 0 15px 0', fontSize: '15px' }}>Quick Links</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Link to="/" style={{ color: '#888', textDecoration: 'none' }}>Home</Link>
                <a href="#about" onClick={(e) => { e.preventDefault(); handleNavScroll('about'); }} style={{ color: '#888', textDecoration: 'none' }}>About Us</a>
                <a href="#safety" onClick={(e) => { e.preventDefault(); handleNavScroll('safety'); }} style={{ color: '#888', textDecoration: 'none' }}>Safety</a>
                <a href="#contact" onClick={(e) => { e.preventDefault(); handleNavScroll('contact'); }} style={{ color: '#888', textDecoration: 'none' }}>Contact Us</a>
              </div>
            </div>
            <div>
              <h4 style={{ color: '#fff', margin: '0 0 15px 0', fontSize: '15px' }}>Customer</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Link to="/profile" style={{ color: '#888', textDecoration: 'none' }}>My Profile</Link>
                <Link to="/rides" style={{ color: '#888', textDecoration: 'none' }}>Ride History</Link>
                <Link to="/payment-methods" style={{ color: '#888', textDecoration: 'none' }}>Payments</Link>
              </div>
            </div>
          </div>

          <div style={{ 
            maxWidth: '1100px', 
            margin: '0 auto', 
            borderTop: '1px solid #222', 
            paddingTop: '20px', 
            textAlign: 'center', 
            fontSize: '13px', 
            color: '#666' 
          }}>
            &copy; 2026 RideNow Technologies Inc. All rights reserved.
          </div>
        </footer>
      )}
    </div>
  );
}
