import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Clock, ArrowRight, Car, Bike, Info } from 'lucide-react';

export function Rides() {
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchRides() {
      try {
        const data = await api.getRides();
        setRides(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load ride history.');
      } finally {
        setLoading(false);
      }
    }
    fetchRides();
  }, []);

  const getStatusBadge = (status: string) => {
    let style = 'bg-slate-100 text-slate-700 border-slate-200'; // default gray
    
    switch (status) {
      case 'RIDE_COMPLETED':
        style = 'bg-green-100 text-brand-green border-green-200';
        break;
      case 'REQUESTED':
      case 'SEARCHING_DRIVER':
        style = 'bg-yellow-100 text-yellow-700 border-yellow-200';
        break;
      case 'DRIVER_ASSIGNED':
      case 'DRIVER_ARRIVING':
      case 'DRIVER_ARRIVED':
      case 'RIDE_STARTED':
        style = 'bg-blue-100 text-blue-700 border-blue-200';
        break;
      case 'CANCELLED':
      case 'NO_DRIVER_AVAILABLE':
        style = 'bg-red-100 text-red-700 border-red-200';
        break;
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${style}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-green border-t-transparent"></div>
        <p className="mt-4 text-slate-500 font-semibold">Loading ride history...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      <div className="flex items-center gap-3 mb-8">
        <Clock className="w-8 h-8 text-brand-green" />
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Ride History</h2>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 text-sm font-semibold flex items-start gap-3 border border-red-100 dark:border-red-900/50">
          <Info className="w-5 h-5 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {rides.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 p-12 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
            <Car className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No rides yet</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm">You haven't requested any rides yet. Book your first ride and track it here.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-brand-green hover:bg-green-600 text-white px-8 py-3 rounded-xl font-bold transition shadow-lg shadow-brand-green/20"
          >
            Go to Dashboard
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {rides.map((ride) => (
            <div key={ride.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/30 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden hover:shadow-slate-200/60 transition group">
              <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between md:items-center gap-6">
                
                {/* Left: Info */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-700">
                      {new Date(ride.createdAt).toLocaleString()}
                    </span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg flex items-center gap-2">
                      {ride.vehicleType === 'BIKE' ? <Bike className="w-4 h-4"/> : <Car className="w-4 h-4" />}
                      {ride.vehicleType === 'BIKE' ? 'Bike-Taxi' : ride.vehicleType === 'AUTO' ? 'Auto' : ride.vehicleType === 'CAB' ? 'Cab' : ride.vehicleType}
                    </span>
                    {getStatusBadge(ride.status)}
                  </div>
                  
                  <div className="flex flex-col gap-3 relative pl-4 border-l-2 border-slate-100 dark:border-slate-800 ml-2">
                    <div className="absolute top-0 left-[-5px] w-2 h-2 rounded-full bg-brand-green"></div>
                    <div className="absolute bottom-1 left-[-5px] w-2 h-2 rounded-full bg-red-500"></div>
                    
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Pickup</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{ride.pickupAddress}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Dropoff</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{ride.dropoffAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-8">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Fare</p>
                    <div className="text-2xl font-bold text-brand-green">
                      ₹{ride.fare.toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/rides/${ride.id}`)}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition"
                  >
                    View Details <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
