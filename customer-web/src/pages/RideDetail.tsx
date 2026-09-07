import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
  ArrowLeft, MapPin, CreditCard, 
  Car, User, Star, AlertCircle, Info, Activity
} from 'lucide-react';

export function RideDetail() {
  const { id } = useParams<{ id: string }>();
  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingError, setRatingError] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setRatingError('');
      setSubmittingRating(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/customer/rides/${id}/rating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ score: ratingScore, comment: ratingComment })
      });
      const data = await res.json();
      if (data.success) {
        const updatedRide = await api.getRideDetail(id);
        setRide(updatedRide);
      } else {
        setRatingError(data.error?.message || 'Failed to submit rating');
      }
    } catch (err) {
      setRatingError('Connection error submitting rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  useEffect(() => {
    async function fetchRideDetail() {
      if (!id) return;
      try {
        const data = await api.getRideDetail(id);
        setRide(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load ride details.');
      } finally {
        setLoading(false);
      }
    }
    fetchRideDetail();
  }, [id]);

  const getStatusBadge = (status: string) => {
    let style = 'bg-slate-100 text-slate-700 border-slate-200';
    switch (status) {
      case 'RIDE_COMPLETED': style = 'bg-green-100 text-brand-green border-green-200'; break;
      case 'REQUESTED':
      case 'SEARCHING_DRIVER': style = 'bg-yellow-100 text-yellow-700 border-yellow-200'; break;
      case 'DRIVER_ASSIGNED':
      case 'DRIVER_ARRIVING':
      case 'DRIVER_ARRIVED':
      case 'RIDE_STARTED': style = 'bg-blue-100 text-blue-700 border-blue-200'; break;
      case 'CANCELLED':
      case 'NO_DRIVER_AVAILABLE': style = 'bg-red-100 text-red-700 border-red-200'; break;
    }
    return (
      <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${style}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-green border-t-transparent"></div>
        <p className="mt-4 text-slate-500 font-semibold">Loading trip details...</p>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl mb-6 font-semibold border border-red-100 flex flex-col items-center gap-3">
          <AlertCircle className="w-8 h-8" />
          {error || 'Ride detail could not be retrieved.'}
        </div>
        <button
          onClick={() => navigate('/rides')}
          className="bg-brand-green hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-brand-green/20"
        >
          Back to History
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      <button
        onClick={() => navigate('/rides')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-semibold mb-8 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to History
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Main Info Column */}
        <div className="md:col-span-2 flex flex-col gap-6">
          
          {/* Trip Summary Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4 bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="text-brand-green w-5 h-5" /> Trip Summary
              </h3>
              {getStatusBadge(ride.status)}
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ride ID</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate" title={ride.id}>{ride.id.split('-')[0]}...</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Service Class</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {ride.vehicleType === 'BIKE' ? 'Bike-Taxi' : ride.vehicleType === 'AUTO' ? 'Auto' : ride.vehicleType === 'CAB' ? 'Cab' : ride.vehicleType}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Request Time</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{new Date(ride.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Fare</p>
                  <p className="text-xl font-bold text-brand-green">₹{ride.fare.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 relative">
                <div className="absolute top-6 bottom-6 left-5 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-3 h-3 rounded-full bg-brand-green mt-1 outline outline-4 outline-slate-50 dark:outline-slate-800"></div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Pickup Address</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{ride.pickupAddress}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">({ride.pickupLat}, {ride.pickupLng})</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-3 h-3 rounded-full bg-red-500 mt-1 outline outline-4 outline-slate-50 dark:outline-slate-800"></div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Dropoff Address</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{ride.dropoffAddress}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">({ride.dropoffLat}, {ride.dropoffLng})</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
              <CreditCard className="text-slate-600 dark:text-slate-300 w-5 h-5" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Payment Information</h3>
            </div>
            <div className="p-6">
              {ride.payments && ride.payments.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {ride.payments.map((payment: any) => (
                    <div key={payment.id} className="flex flex-wrap justify-between items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">Amount Charged: <span className="text-brand-green">₹{payment.amount.toFixed(2)}</span></div>
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Method: {payment.provider} | Tx: {payment.transactionId || 'N/A'}</div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        payment.status === 'COMPLETED' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800' :
                        payment.status === 'FAILED' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800' :
                        'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800'
                      }`}>
                        {payment.status === 'COMPLETED' ? 'PAID' : payment.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 italic text-sm">
                  <Info className="w-4 h-4" /> No payment records found.
                </div>
              )}
            </div>
          </div>

          {/* Ratings & Reviews */}
          {ride.status === 'RIDE_COMPLETED' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
                <Star className="text-yellow-500 w-5 h-5" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Ratings & Reviews</h3>
              </div>
              <div className="p-6">
                {(() => {
                  const myRating = ride.ratings?.find((r: any) => r.raterRole === 'CUSTOMER');
                  if (myRating) {
                    return (
                      <div>
                        <div className="flex items-center gap-1 text-yellow-500 mb-4">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-6 h-6 ${i < myRating.score ? 'fill-current' : 'text-slate-200'}`} />
                          ))}
                          <span className="ml-2 font-bold text-slate-700 text-sm">({myRating.score} / 5)</span>
                        </div>
                        {myRating.comment && (
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 italic text-slate-700">
                            "{myRating.comment}"
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <form onSubmit={handleRatingSubmit}>
                      {ratingError && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-semibold border border-red-100">
                          {ratingError}
                        </div>
                      )}
                      <div className="mb-6">
                        <label className="block mb-2 text-sm font-bold text-slate-700">Rate your experience</label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRatingScore(star)}
                              className="focus:outline-none transition-transform hover:scale-110"
                            >
                              <Star className={`w-10 h-10 ${ratingScore >= star ? 'text-yellow-400 fill-current' : 'text-slate-200 fill-current'}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mb-6">
                        <label className="block mb-2 text-sm font-bold text-slate-700">Optional Review</label>
                        <textarea
                          placeholder="Share details of your experience..."
                          value={ratingComment}
                          onChange={(e) => setRatingComment(e.target.value)}
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition text-sm min-h-[100px]"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={submittingRating}
                        className="bg-brand-green hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold transition disabled:opacity-70 flex items-center gap-2"
                      >
                        {submittingRating ? <><span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span> Submitting...</> : 'Submit Rating'}
                      </button>
                    </form>
                  );
                })()}
              </div>
            </div>
          )}

        </div>

        {/* Sidebar Column */}
        <div className="flex flex-col gap-6">
          
          {/* Driver & Vehicle */}
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <User className="text-slate-600 w-5 h-5" />
              <h4 className="text-lg font-bold text-slate-900">Captain Details</h4>
            </div>
            <div className="p-5">
              {ride.driver ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email</p>
                    <p className="text-sm font-bold text-slate-900">{ride.driver.user.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone</p>
                    <p className="text-sm font-bold text-slate-900">{ride.driver.phone || 'N/A'}</p>
                  </div>
                  {ride.driver.vehicle && (
                    <div className="bg-brand-green/5 p-4 rounded-xl border border-brand-green/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Car className="text-brand-green w-4 h-4" />
                        <span className="text-xs font-bold text-brand-green uppercase tracking-wider">Vehicle</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 mb-1">
                        {ride.driver.vehicle.color} {ride.driver.vehicle.make} {ride.driver.vehicle.model} ({ride.driver.vehicle.year})
                      </p>
                      <p className="text-xs font-bold bg-slate-900 text-white inline-block px-2 py-1 rounded">
                        {ride.driver.vehicle.plateNumber}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-500 italic text-sm">
                  <Info className="w-4 h-4" /> No Captain assigned yet.
                </div>
              )}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Activity className="text-slate-600 w-5 h-5" />
              <h4 className="text-lg font-bold text-slate-900">Activity Timeline</h4>
            </div>
            <div className="p-5">
              {ride.statusHistory && ride.statusHistory.length > 0 ? (
                <div className="relative pl-6">
                  <div className="absolute top-2 bottom-2 left-1.5 w-0.5 bg-brand-green/30"></div>
                  <div className="flex flex-col gap-6">
                    {ride.statusHistory.map((history: any, idx: number) => (
                      <div key={history.id} className="relative">
                        <div className={`absolute -left-[27.5px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${idx === ride.statusHistory.length - 1 ? 'bg-brand-green ring-4 ring-brand-green/20' : 'bg-slate-300'}`}></div>
                        <p className={`text-xs font-bold uppercase tracking-wider ${idx === ride.statusHistory.length - 1 ? 'text-brand-green' : 'text-slate-600'}`}>{history.status.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-slate-500 mt-1">{new Date(history.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-500 italic text-sm">
                  <Info className="w-4 h-4" /> No activity logged.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
