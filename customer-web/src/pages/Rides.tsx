import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

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

  const getStatusBadgeStyle = (status: string) => {
    let backgroundColor = '#6c757d'; // gray
    switch (status) {
      case 'RIDE_COMPLETED':
        backgroundColor = '#28a745'; // green
        break;
      case 'REQUESTED':
      case 'SEARCHING_DRIVER':
        backgroundColor = '#ffc107'; // yellow
        break;
      case 'DRIVER_ASSIGNED':
      case 'DRIVER_ARRIVING':
      case 'DRIVER_ARRIVED':
      case 'RIDE_STARTED':
        backgroundColor = '#17a2b8'; // teal
        break;
      case 'CANCELLED':
      case 'NO_DRIVER_AVAILABLE':
        backgroundColor = '#dc3545'; // red
        break;
    }
    return {
      backgroundColor,
      color: '#fff',
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 'bold' as const,
      textTransform: 'uppercase' as const,
    };
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h3>Loading ride history...</h3>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 25px 0', color: '#00b562', borderBottom: '2px solid #00b562', paddingBottom: '10px' }}>
        Ride History
      </h2>

      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {rides.length === 0 ? (
        <div style={{
          textAlign: 'center',
          backgroundColor: '#fff',
          padding: '40px 20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          color: '#666'
        }}>
          <p style={{ margin: '0 0 15px 0', fontSize: '16px' }}>You haven't requested any rides yet.</p>
          <button
            onClick={() => navigate('/')}
            style={{
              backgroundColor: '#00b562',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            Go to Dashboard
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {rides.map((ride) => (
            <div key={ride.id} style={{
              backgroundColor: '#fff',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
              border: '1px solid #e3e6f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#888' }}>
                    {new Date(ride.createdAt).toLocaleString()}
                  </span>
                  <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#eef2f7', color: '#555', fontWeight: 'bold' }}>
                    {ride.vehicleType === 'BIKE' ? 'Bike-Taxi' : ride.vehicleType === 'AUTO' ? 'Auto' : ride.vehicleType === 'CAB' ? 'Cab' : ride.vehicleType}
                  </span>
                  <span style={getStatusBadgeStyle(ride.status)}>{ride.status}</span>
                </div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>
                  Pickup: {ride.pickupAddress}
                </div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#333' }}>
                  Destination: {ride.dropoffAddress}
                </div>
              </div>

              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#00b562' }}>
                  ₹{ride.fare.toFixed(2)}
                </div>
                <button
                  onClick={() => navigate(`/rides/${ride.id}`)}
                  style={{
                    backgroundColor: '#00b562',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '12px'
                  }}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
