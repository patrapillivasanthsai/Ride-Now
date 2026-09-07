import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Clientside validations
    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.login(email, password);
      // login method in context sets states and localstorage
      login(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] px-4">
      <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 w-full max-w-md">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Welcome Back</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Login to book rides and track your journey</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 text-sm font-semibold flex items-start gap-3 border border-red-100 dark:border-red-900/50">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
            <label className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-green hover:bg-green-600 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg shadow-brand-green/30 transition disabled:opacity-70 disabled:cursor-not-allowed mt-2 flex justify-center items-center gap-2"
          >
            {loading ? (
              <><span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span> Logging in...</>
            ) : (
              <>Login <ArrowRight size={20} /></>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-green font-bold hover:underline transition">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
