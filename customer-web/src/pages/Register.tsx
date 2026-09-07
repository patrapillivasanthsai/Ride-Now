import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { User, Mail, Phone, Lock, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

export function Register() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Frontend validations
    if (!email.trim() || !phone.trim() || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.registerCustomer(email, password, phone, name);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] px-4 py-8">
      <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 w-full max-w-lg">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Create Account</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Sign up as a customer to get started with RideNow</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 text-sm font-semibold flex items-start gap-3 border border-red-100 dark:border-red-900/50">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-950/30 text-brand-green p-4 rounded-xl mb-6 text-sm font-semibold flex items-start gap-3 border border-green-100 dark:border-green-900/50">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <div>Registration successful! Redirecting to login...</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 chars"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full bg-brand-green hover:bg-green-600 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg shadow-brand-green/30 transition disabled:opacity-70 disabled:cursor-not-allowed mt-4 flex justify-center items-center gap-2"
          >
            {(loading || success) ? (
              <><span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span> Registering...</>
            ) : (
              <>Register <ArrowRight size={20} /></>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-green font-bold hover:underline transition">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
