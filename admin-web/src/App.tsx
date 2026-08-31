import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/AdminLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Drivers } from './pages/Drivers';
import { Rides } from './pages/Rides';
import { Pricing } from './pages/Pricing';
import { Customers } from './pages/Customers';
import { Payments } from './pages/Payments';
import { Analytics } from './pages/Analytics';
import { Ratings } from './pages/Ratings';
import { Notifications } from './pages/Notifications';
import { Offers } from './pages/Offers';
import { Staff } from './pages/Staff';
import { Settings } from './pages/Settings';

const WrappedRoute: React.FC<{ element: React.ReactNode }> = ({ element }) => (
  <ProtectedRoute>
    <AdminLayout>{element}</AdminLayout>
  </ProtectedRoute>
);

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<WrappedRoute element={<Dashboard />} />} />
          <Route path="/rides" element={<WrappedRoute element={<Rides />} />} />
          <Route path="/drivers" element={<WrappedRoute element={<Drivers />} />} />
          <Route path="/customers" element={<WrappedRoute element={<Customers />} />} />
          <Route path="/payments" element={<WrappedRoute element={<Payments />} />} />
          <Route path="/pricing" element={<WrappedRoute element={<Pricing />} />} />
          <Route path="/analytics" element={<WrappedRoute element={<Analytics />} />} />
          <Route path="/ratings" element={<WrappedRoute element={<Ratings />} />} />
          <Route path="/notifications" element={<WrappedRoute element={<Notifications />} />} />
          <Route path="/offers" element={<WrappedRoute element={<Offers />} />} />
          <Route path="/staff" element={<WrappedRoute element={<Staff />} />} />
          <Route path="/settings" element={<WrappedRoute element={<Settings />} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
