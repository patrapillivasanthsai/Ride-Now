import React, { useState } from 'react';

function App() {
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const handleBookRide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup || !dropoff) {
      setStatusMessage('Please enter both pickup and dropoff locations.');
      return;
    }
    setStatusMessage(`Booking ride from "${pickup}" to "${dropoff}"...`);
    // Future: API call to POST /rides
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '500px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h1 style={{ color: '#ffc107', textAlign: 'center' }}>RideNow</h1>
      <h3 style={{ textAlign: 'center' }}>Customer Booking App</h3>
      <form onSubmit={handleBookRide} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Pickup Location</label>
          <input
            type="text"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            placeholder="e.g. 123 Main St"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Dropoff Location</label>
          <input
            type="text"
            value={dropoff}
            onChange={(e) => setDropoff(e.target.value)}
            placeholder="e.g. Airport Terminal 1"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <button type="submit" style={{ padding: '10px', backgroundColor: '#000', color: '#ffc107', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          Request Ride
        </button>
      </form>
      {statusMessage && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px', borderLeft: '5px solid #ffc107' }}>
          {statusMessage}
        </div>
      )}
    </div>
  );
}

export default App;
