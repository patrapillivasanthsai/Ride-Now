import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <h3>Loading session, please wait...</h3>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Double check: ensure user role is indeed CUSTOMER
  if (user.role !== 'CUSTOMER') {
    console.warn('Forbidden: Customer Web only allows CUSTOMER role users.');
    logout();
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
