import React from 'react';

function App() {
  const stats = [
    { title: 'Total Rides', count: 1240, color: '#ffc107' },
    { title: 'Registered Customers', count: 852, color: '#007bff' },
    { title: 'Active Drivers', count: 84, color: '#28a745' },
  ];

  const recentRides = [
    { id: 'RIDE-001', customer: 'John Doe', driver: 'Alice Smith', pickup: 'Central Mall', dropoff: 'City Park', status: 'ONGOING' },
    { id: 'RIDE-002', customer: 'Jane Smith', driver: 'Bob Johnson', pickup: 'Airport Terminal 2', dropoff: 'Grand Plaza', status: 'COMPLETED' },
    { id: 'RIDE-003', customer: 'Michael Brown', driver: 'Pending', pickup: 'Downtown Office', dropoff: 'Metro Station', status: 'PENDING' },
  ];

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '30px', backgroundColor: '#f4f6f9', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, color: '#333' }}>RideNow Admin Portal</h1>
        <div style={{ padding: '8px 15px', backgroundColor: '#333', color: '#ffc107', borderRadius: '4px', fontWeight: 'bold' }}>Admin Session</div>
      </div>

      {/* Stats Section */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
        {stats.map((stat, i) => (
          <div key={i} style={{ flex: 1, backgroundColor: '#fff', padding: '20px', borderRadius: '8px', borderLeft: `5px solid ${stat.color}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '14px', color: '#777', textTransform: 'uppercase', marginBottom: '5px' }}>{stat.title}</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>{stat.count}</div>
          </div>
        ))}
      </div>

      {/* Main Table */}
      <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#444' }}>Recent Rides Monitor</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee', color: '#666' }}>
              <th style={{ padding: '10px 5px' }}>Ride ID</th>
              <th>Customer</th>
              <th>Driver</th>
              <th>Route</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentRides.map((ride, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px 5px', fontWeight: 'bold', color: '#007bff' }}>{ride.id}</td>
                <td>{ride.customer}</td>
                <td>{ride.driver}</td>
                <td>{ride.pickup} ➔ {ride.dropoff}</td>
                <td>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: '#fff',
                    backgroundColor: ride.status === 'COMPLETED' ? '#28a745' : ride.status === 'ONGOING' ? '#17a2b8' : '#ffc107'
                  }}>
                    {ride.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
