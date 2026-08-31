import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h3>Loading trip details...</h3>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          padding: '15px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error || 'Ride detail could not be retrieved.'}
        </div>
        <button
          onClick={() => navigate('/rides')}
          style={{
            backgroundColor: '#00b562',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Back to History
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <button
        onClick={() => navigate('/rides')}
        style={{
          backgroundColor: 'transparent',
          color: '#555',
          border: '1px solid #ccc',
          padding: '8px 15px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold',
          marginBottom: '20px'
        }}
      >
        &larr; Back to History
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        {/* Core Info */}
        <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)', border: '1px solid #e3e6f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#333' }}>Trip Summary</h3>
            <span style={{
              backgroundColor: '#00b562',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold',
              textTransform: 'uppercase'
            }}>
              {ride.status}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <strong>Ride ID:</strong> <span style={{ color: '#007bff' }}>{ride.id}</span>
            </div>
            <div>
              <strong>Service Class:</strong> {ride.vehicleType === 'BIKE' ? 'Bike-Taxi' : ride.vehicleType === 'AUTO' ? 'Auto' : ride.vehicleType === 'CAB' ? 'Cab' : ride.vehicleType}
            </div>
            <div>
              <strong>Request Time:</strong> {new Date(ride.createdAt).toLocaleString()}
            </div>
            <div>
              <strong>Fare:</strong> <span style={{ color: '#28a745', fontWeight: 'bold' }}>₹{ride.fare.toFixed(2)}</span>
            </div>
            <div>
              <strong>Pickup Address:</strong> {ride.pickupAddress} <span style={{ color: '#888', fontSize: '12px' }}>({ride.pickupLat}, {ride.pickupLng})</span>
            </div>
            <div>
              <strong>Dropoff Address:</strong> {ride.dropoffAddress} <span style={{ color: '#888', fontSize: '12px' }}>({ride.dropoffLat}, {ride.dropoffLng})</span>
            </div>
          </div>
        </div>

        {/* Driver & Vehicle */}
        <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)', border: '1px solid #e3e6f0' }}>
          <h4 style={{ margin: '0 0 15px 0', color: '#333', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Driver & Vehicle Details</h4>
          {ride.driver ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div><strong>Driver Email:</strong> {ride.driver.user.email}</div>
              <div><strong>Driver Phone:</strong> {ride.driver.phone || 'N/A'}</div>
              {ride.driver.vehicle && (
                <div style={{ marginTop: '10px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px', borderLeft: '4px solid #00b562' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' }}>Vehicle Information</div>
                  <div style={{ fontSize: '13px' }}>
                    {ride.driver.vehicle.color} {ride.driver.vehicle.make} {ride.driver.vehicle.model} ({ride.driver.vehicle.year})
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#00b562', marginTop: '5px', fontSize: '13px' }}>
                    License Plate: {ride.driver.vehicle.plateNumber}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p style={{ margin: 0, color: '#888', fontStyle: 'italic', fontSize: '14px' }}>No driver has been assigned to this trip yet.</p>
          )}
        </div>

        {/* Payments */}
        <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)', border: '1px solid #e3e6f0' }}>
          <h4 style={{ margin: '0 0 15px 0', color: '#333', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Payment Information</h4>
          {ride.payments && ride.payments.length > 0 ? (
            <div>
              {ride.payments.map((payment: any) => (
                <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>Amount Charged: ₹{payment.amount.toFixed(2)}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>Method: {payment.provider} | Tx: {payment.transactionId || 'N/A'}</div>
                  </div>
                  <span style={{
                    backgroundColor: payment.status === 'COMPLETED' ? '#d4edda' : payment.status === 'FAILED' ? '#f8d7da' : '#fff3cd',
                    color: payment.status === 'COMPLETED' ? '#155724' : payment.status === 'FAILED' ? '#721c24' : '#856404',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {payment.status === 'COMPLETED' ? 'COMPLETED / PAID' : payment.status === 'AUTHORIZED' ? 'AUTHORIZED (HOLD)' : payment.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, color: '#888', fontStyle: 'italic', fontSize: '14px' }}>No payment records found.</p>
          )}
        </div>

        {/* Ratings & Feedback */}
        {ride.status === 'RIDE_COMPLETED' && (
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)', border: '1px solid #e3e6f0' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#333', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Ratings & Reviews</h4>
            {(() => {
              const myRating = ride.ratings?.find((r: any) => r.raterRole === 'CUSTOMER');
              if (myRating) {
                return (
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#00b562', marginBottom: '5px' }}>
                      {'★'.repeat(myRating.score)}{'☆'.repeat(5 - myRating.score)} ({myRating.score} / 5)
                    </div>
                    {myRating.comment && (
                      <p style={{ margin: 0, fontStyle: 'italic', color: '#555', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
                        "{myRating.comment}"
                      </p>
                    )}
                  </div>
                );
              }

              return (
                <form onSubmit={handleRatingSubmit}>
                  {ratingError && (
                    <div style={{ color: '#dc3545', backgroundColor: '#f8d7da', padding: '10px', borderRadius: '4px', marginBottom: '10px', fontSize: '14px' }}>
                      {ratingError}
                    </div>
                  )}
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#555' }}>Rate your driver:</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatingScore(star)}
                          style={{
                            fontSize: '28px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: ratingScore >= star ? '#ffc107' : '#ccc',
                            padding: 0
                          }}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#555' }}>Optional Review:</label>
                    <textarea
                      placeholder="Share details of your experience..."
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', minHeight: '60px', fontFamily: 'sans-serif' }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingRating}
                    style={{
                      backgroundColor: '#00b562',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 15px',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      cursor: submittingRating ? 'not-allowed' : 'pointer',
                      opacity: submittingRating ? 0.7 : 1
                    }}
                  >
                    Submit Rating
                  </button>
                </form>
              );
            })()}
          </div>
        )}

        {/* Status Timeline */}
        <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)', border: '1px solid #e3e6f0' }}>
          <h4 style={{ margin: '0 0 15px 0', color: '#333', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Activity Timeline</h4>
          {ride.statusHistory && ride.statusHistory.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', position: 'relative', paddingLeft: '20px' }}>
              {/* Timeline vertical bar */}
              <div style={{ position: 'absolute', left: '4px', top: '5px', bottom: '5px', width: '2px', backgroundColor: '#00b562' }} />
              {ride.statusHistory.map((history: any) => (
                <div key={history.id} style={{ position: 'relative' }}>
                  {/* Timeline dot */}
                  <div style={{
                    position: 'absolute',
                    left: '-20px',
                    top: '4px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#00b562',
                    border: '2px solid #fff'
                  }} />
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{history.status}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{new Date(history.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, color: '#888', fontStyle: 'italic', fontSize: '14px' }}>No status history logged.</p>
          )}
        </div>
      </div>
    </div>
  );
}
