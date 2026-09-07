import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Bell, User, ChevronDown, LogOut, Menu, X, Sun, Moon } from 'lucide-react';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Theme State & Persistence
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
      return true;
    }
    document.documentElement.classList.remove('dark');
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  useEffect(() => {
    if (user) {
      api.getNotifications()
        .then((d: any) => setUnreadCount(d?.unreadCount || 0))
        .catch(() => {});
    }
  }, [user]);

  const handleLogoutClick = () => {
    logout();
    setDropdownOpen(false);
    navigate('/login');
  };

  const searchParams = new URLSearchParams(location.search);
  const step = searchParams.get('step');
  const isAssignedStep = location.pathname === '/' && (step === '2' || step === '3');
  const isHome = location.pathname === '/';

  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname !== '/') {
      navigate('/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

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
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Navigation Header */}
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm transition-colors duration-200">
        {/* Brand Logo */}
        <div className="flex items-center">
          <Link to="/" onClick={handleHomeClick} className="text-brand-green font-bold text-2xl tracking-tight hover:opacity-90 transition">
            RideNow
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          {user ? (
            <>
              {!isAssignedStep && (
                <div className="flex items-center gap-6 mr-2">
                  <a 
                    href="#" 
                    onClick={handleHomeClick}
                    className={`text-sm transition cursor-pointer ${isHome && !step ? 'text-brand-green font-bold' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    Home
                  </a>
                  <a href="#about" onClick={(e) => { e.preventDefault(); handleNavScroll('about'); }} className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer">About Us</a>
                  <a href="#safety" onClick={(e) => { e.preventDefault(); handleNavScroll('safety'); }} className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer">Safety</a>
                  <a href="#contact" onClick={(e) => { e.preventDefault(); handleNavScroll('contact'); }} className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer">Contact Us</a>
                </div>
              )}
              
              {/* Light / Dark Mode Toggle */}
              <button
                type="button"
                onClick={toggleDarkMode}
                className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                aria-label="Toggle Theme"
              >
                {darkMode ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-indigo-400" />}
              </button>

              {/* Notification Bell */}
              <Link to="/notifications" className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" title="Notifications">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white rounded-full text-[10px] font-bold w-4 h-4 flex items-center justify-center border border-white dark:border-slate-900">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
              
              {/* Profile Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition focus:outline-none"
                >
                  <div className="bg-brand-green text-white rounded-full p-1">
                    <User size={14} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
                    {user.email.split('@')[0]}
                  </span>
                  <ChevronDown size={14} className="text-slate-400" />
                </button>

                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 py-2">
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 mb-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Signed in as</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{user.email}</p>
                      </div>
                      <Link to="/profile" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition" onClick={() => setDropdownOpen(false)}>My Profile</Link>
                      <Link to="/rides" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition" onClick={() => setDropdownOpen(false)}>Ride History</Link>
                      <Link to="/payment-methods" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition" onClick={() => setDropdownOpen(false)}>Payments</Link>
                      <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                      <button 
                        onClick={handleLogoutClick} 
                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition flex items-center gap-2"
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              {/* Light / Dark Mode Toggle for unauth */}
              <button
                type="button"
                onClick={toggleDarkMode}
                className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                aria-label="Toggle Theme"
              >
                {darkMode ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-indigo-400" />}
              </button>
              <Link to="/login" className="text-brand-green font-semibold text-sm hover:opacity-80 transition">Login</Link>
              <Link to="/register" className="bg-brand-green text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-opacity-90 transition shadow-sm">Register</Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex items-center gap-3">
          {/* Light / Dark Mode Toggle Mobile */}
          <button
            type="button"
            onClick={toggleDarkMode}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Theme"
          >
            {darkMode ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-indigo-400" />}
          </button>

          {user && (
            <Link to="/notifications" className="relative p-1 text-slate-600 dark:text-slate-300">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-[10px] font-bold w-4 h-4 flex items-center justify-center border border-white dark:border-slate-900">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-600 dark:text-slate-300 focus:outline-none">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 absolute top-[60px] left-0 right-0 z-40 shadow-md">
          {user ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="bg-brand-green text-white rounded-full p-2">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Signed in as</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  {darkMode ? <><Sun size={16} className="text-amber-500" /> Switch to Light</> : <><Moon size={16} className="text-indigo-400" /> Switch to Dark</>}
                </button>
              </div>
              <a href="#" onClick={handleHomeClick} className="text-sm font-medium text-slate-700 dark:text-slate-200">Home</a>
              <a href="#about" onClick={(e) => { e.preventDefault(); handleNavScroll('about'); }} className="text-sm font-medium text-slate-700 dark:text-slate-200">About Us</a>
              <a href="#safety" onClick={(e) => { e.preventDefault(); handleNavScroll('safety'); }} className="text-sm font-medium text-slate-700 dark:text-slate-200">Safety</a>
              <a href="#contact" onClick={(e) => { e.preventDefault(); handleNavScroll('contact'); }} className="text-sm font-medium text-slate-700 dark:text-slate-200">Contact Us</a>
              <Link to="/profile" className="text-sm font-medium text-slate-700 dark:text-slate-200" onClick={() => setMobileMenuOpen(false)}>My Profile</Link>
              <Link to="/rides" className="text-sm font-medium text-slate-700 dark:text-slate-200" onClick={() => setMobileMenuOpen(false)}>Ride History</Link>
              <Link to="/payment-methods" className="text-sm font-medium text-slate-700 dark:text-slate-200" onClick={() => setMobileMenuOpen(false)}>Payments</Link>
              <button 
                onClick={handleLogoutClick} 
                className="text-left text-sm font-bold text-red-600 dark:text-red-400 pt-2 border-t border-slate-100 dark:border-slate-800"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={toggleDarkMode}
                className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <span>Theme Mode</span>
                <span className="flex items-center gap-1">
                  {darkMode ? <><Sun size={16} className="text-amber-500" /> Switch to Light</> : <><Moon size={16} className="text-indigo-400" /> Switch to Dark</>}
                </span>
              </button>
              <Link to="/login" className="text-brand-green font-semibold text-center py-2 border border-brand-green rounded-lg" onClick={() => setMobileMenuOpen(false)}>Login</Link>
              <Link to="/register" className="bg-brand-green text-white font-semibold text-center py-2 rounded-lg" onClick={() => setMobileMenuOpen(false)}>Register</Link>
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 w-full mx-auto ${isHome ? 'max-w-full px-0' : 'max-w-5xl px-4 md:px-8 py-8'}`}>
        {children}
      </main>

      {/* Footer */}
      {!isAssignedStep && (
        <footer className="bg-brand-navy text-slate-300 pt-12 pb-8 px-6 md:px-12 border-t border-slate-800 mt-auto">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-10 mb-10">
            <div className="max-w-xs">
              <h3 className="text-brand-green text-2xl font-bold mb-4">RideNow</h3>
              <p className="text-sm leading-relaxed text-slate-400">
                Next-Gen commute booking platform providing quick, reliable, and affordable rides at your doorstep.
              </p>
            </div>
            <div className="flex flex-wrap gap-12 md:gap-24">
              <div>
                <h4 className="text-white text-base font-semibold mb-4 tracking-wide">Quick Links</h4>
                <div className="flex flex-col gap-3 text-sm text-slate-400">
                  <a href="#" onClick={handleHomeClick} className="hover:text-white transition cursor-pointer">Home</a>
                  <a href="#about" onClick={(e) => { e.preventDefault(); handleNavScroll('about'); }} className="hover:text-white transition cursor-pointer">About Us</a>
                  <a href="#safety" onClick={(e) => { e.preventDefault(); handleNavScroll('safety'); }} className="hover:text-white transition cursor-pointer">Safety</a>
                  <a href="#contact" onClick={(e) => { e.preventDefault(); handleNavScroll('contact'); }} className="hover:text-white transition cursor-pointer">Contact Us</a>
                </div>
              </div>
              <div>
                <h4 className="text-white text-base font-semibold mb-4 tracking-wide">Customer</h4>
                <div className="flex flex-col gap-3 text-sm text-slate-400">
                  <Link to="/profile" className="hover:text-white transition">My Profile</Link>
                  <Link to="/rides" className="hover:text-white transition">Ride History</Link>
                  <Link to="/payment-methods" className="hover:text-white transition">Payments</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-6xl mx-auto border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
            &copy; 2026 RideNow Technologies Inc. All rights reserved.
          </div>
        </footer>
      )}
    </div>
  );
}

