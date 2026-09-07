import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Bell, Check, Gift, ShieldAlert, Car, Settings, CheckCircle } from 'lucide-react';

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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SYSTEM': return <Settings className="w-6 h-6 text-slate-500" />;
      case 'OFFER': return <Gift className="w-6 h-6 text-purple-500" />;
      case 'BROADCAST': return <Bell className="w-6 h-6 text-blue-500" />;
      case 'SAFETY': return <ShieldAlert className="w-6 h-6 text-red-500" />;
      case 'RIDE_UPDATE': return <Car className="w-6 h-6 text-brand-green" />;
      case 'APPROVAL': return <CheckCircle className="w-6 h-6 text-green-500" />;
      default: return <Bell className="w-6 h-6 text-slate-400" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-12 min-h-[80vh]">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-brand-green/10 p-2.5 rounded-xl text-brand-green">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Notifications</h1>
            {data?.unreadCount > 0 && (
              <p className="text-sm font-semibold text-brand-green mt-0.5">{data.unreadCount} unread message{data.unreadCount > 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
        
        {data?.unreadCount > 0 && (
          <button 
            onClick={handleMarkAllRead} 
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition shadow-sm"
          >
            <Check className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 text-sm font-semibold border border-red-100 dark:border-red-900/50 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-green border-t-transparent"></div>
          <p className="mt-4 text-slate-500 dark:text-slate-400 font-semibold">Loading your notifications...</p>
        </div>
      )}

      {!loading && (!data?.notifications || data.notifications.length === 0) && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 p-12 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
            <Bell className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">All clear!</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm">You have no new notifications right now. We'll let you know when updates arrive.</p>
        </div>
      )}

      {!loading && data?.notifications?.length > 0 && (
        <div className="flex flex-col gap-4">
          {data.notifications.map((n: any) => (
            <div 
              key={n.id} 
              onClick={() => !n.isRead && handleMarkRead(n.id)}
              className={`relative overflow-hidden rounded-2xl border transition-all duration-200 ${
                n.isRead 
                  ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm' 
                  : 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 shadow-md cursor-pointer hover:shadow-lg hover:border-green-300'
              } p-5 md:p-6`}
            >
              {!n.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-green"></div>}
              
              <div className="flex gap-4 items-start">
                <div className={`p-3 rounded-xl shrink-0 ${n.isRead ? 'bg-slate-50 dark:bg-slate-800' : 'bg-white dark:bg-slate-800 shadow-sm'}`}>
                  {getTypeIcon(n.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-4 mb-1">
                    <h4 className={`text-base font-bold truncate ${n.isRead ? 'text-slate-700 dark:text-slate-200' : 'text-slate-900 dark:text-white'}`}>
                      {n.title}
                    </h4>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  
                  <p className={`text-sm leading-relaxed ${n.isRead ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {n.body}
                  </p>
                  
                  {n.offer && (
                    <div className="mt-4 bg-white dark:bg-slate-800 rounded-xl p-3 border border-purple-100 dark:border-purple-900/50 shadow-sm flex items-center gap-3">
                      <div className="bg-purple-50 dark:bg-purple-950/40 p-2 rounded-lg"><Gift className="w-4 h-4 text-purple-600 dark:text-purple-400" /></div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{n.offer.title}</p>
                        <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mt-0.5">
                          {n.offer.couponCode && `Code: ${n.offer.couponCode} `}
                          {n.offer.discountValue && `· Save ₹${n.offer.discountValue}`}
                        </p>
                      </div>
                    </div>
                  )}
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
