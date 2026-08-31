import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Coordinate {
  lat: number;
  lng: number;
}

export function Dashboard() {
  const navigate = useNavigate();

  // Search input and suggestions states
  const [pickupInput, setPickupInput] = useState('');
  const [dropInput, setDropInput] = useState('');
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [dropSuggestions, setDropSuggestions] = useState<any[]>([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDropSuggestions, setShowDropSuggestions] = useState(false);

  // Selected points states
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [pickupCoords, setPickupCoords] = useState<Coordinate | null>(null);
  const [dropCoords, setDropCoords] = useState<Coordinate | null>(null);

  // Booking states
  const [searchParams, setSearchParams] = useSearchParams();
  const stepParam = searchParams.get('step');
  const step = stepParam ? parseInt(stepParam) : 1;
  const setStep = (newStep: number) => {
    if (newStep === 1) {
      setSearchParams({});
    } else {
      setSearchParams({ step: String(newStep) });
    }
  };
  const [selectedService, setSelectedService] = useState<'BIKE' | 'AUTO' | 'CAB'>('BIKE');
  const [loadingEstimates, setLoadingEstimates] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [estimates, setEstimates] = useState<Record<string, number>>({});
  
  // Directions results
  const [distanceText, setDistanceText] = useState('');
  const [durationText, setDurationText] = useState('');
  const [directionsResult, setDirectionsResult] = useState<any>(null);
  const [paymentMethodName, setPaymentMethodName] = useState('Payment via Card (pm_mock_visa)');

  // New payment preferences state
  const [paymentPreference, setPaymentPreference] = useState<'CARD' | 'UPI' | 'CASH'>('CARD');
  const [upiId, setUpiId] = useState('');
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [selectedCardId, setSelectedCardId] = useState('pm_mock_visa');
  const [isChangingMethod, setIsChangingMethod] = useState(false);

  useEffect(() => {
    const loadPaymentPreferences = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // 1. Fetch profile preferences
        const profileRes = await fetch(`${API_URL}/api/customer/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const profileData = await profileRes.json();
        if (profileData.success) {
          setPaymentPreference(profileData.data.defaultPaymentMethod || 'CARD');
          setUpiId(profileData.data.defaultUpiId || '');
        }

        // 2. Fetch saved cards
        const cardRes = await fetch(`${API_URL}/api/customer/payment-methods`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const cardData = await cardRes.json();
        if (cardData.success) {
          setSavedCards(cardData.data);
          if (cardData.data.length > 0) {
            setSelectedCardId(cardData.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to pre-load payment preferences:', err);
      }
    };

    loadPaymentPreferences();
  }, [step]); // reload preferences when switching steps

  // Maps refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // AbortControllers and timers for debounced search autocomplete
  const pickupAbortRef = useRef<AbortController | null>(null);
  const dropAbortRef = useRef<AbortController | null>(null);
  const pickupTimerRef = useRef<any>(null);
  const dropTimerRef = useRef<any>(null);

  // Map Rendering logic
  useEffect(() => {
    if (step === 2 && mapContainerRef.current) {
      // MapLibre map initialization using standard OpenStreetMap tiles
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [
            {
              id: 'osm-tiles',
              type: 'raster',
              source: 'osm',
              minzoom: 0,
              maxzoom: 19
            }
          ]
        },
        center: pickupCoords ? [pickupCoords.lng, pickupCoords.lat] : [83.318, 17.712],
        zoom: 12
      });

      mapRef.current = map;

      map.on('load', () => {
        // Render Pickup Marker (Green Pin)
        if (pickupCoords) {
          const el = document.createElement('div');
          el.style.width = '18px';
          el.style.height = '18px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = '#00b562';
          el.style.border = '2.5px solid #fff';
          el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

          new maplibregl.Marker({ element: el })
            .setLngLat([pickupCoords.lng, pickupCoords.lat])
            .addTo(map);
        }

        // Render Drop Marker (Red Pin)
        if (dropCoords) {
          const el = document.createElement('div');
          el.style.width = '18px';
          el.style.height = '18px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = '#dc3545';
          el.style.border = '2.5px solid #fff';
          el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

          new maplibregl.Marker({ element: el })
            .setLngLat([dropCoords.lng, dropCoords.lat])
            .addTo(map);
        }

        // Draw OSRM route path polyline
        if (directionsResult && directionsResult.geometry) {
          map.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: directionsResult.geometry
            }
          });

          map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#00b562',
              'line-width': 5,
              'line-dasharray': [2, 1.5]
            }
          });

          // Fit bounds dynamically
          const coordinates = directionsResult.geometry.coordinates;
          const bounds = coordinates.reduce((acc: maplibregl.LngLatBounds, coord: [number, number]) => {
            return acc.extend(coord);
          }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));

          map.fitBounds(bounds, {
            padding: 50
          });
        }
      });

      return () => {
        map.remove();
      };
    }
  }, [step, directionsResult, pickupCoords, dropCoords]);

  // Photon Search Auto-suggest triggers with Debounce and abort signals
  const handlePickupChange = (val: string) => {
    setPickupInput(val);
    if (pickupTimerRef.current) clearTimeout(pickupTimerRef.current);

    if (!val.trim()) {
      setPickupSuggestions([]);
      return;
    }

    pickupTimerRef.current = setTimeout(async () => {
      if (pickupAbortRef.current) pickupAbortRef.current.abort();

      const controller = new AbortController();
      pickupAbortRef.current = controller;

      try {
        // Photon API query biased towards Visakhapatnam center coordinates
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&limit=5&lon=83.318&lat=17.712`;
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();

        if (data.features) {
          const suggestions = data.features.map((feature: any) => {
            const geom = feature.geometry.coordinates; // [lng, lat]
            const props = feature.properties;
            
            const name = props.name || '';
            const street = props.street || '';
            const city = props.city || props.town || props.village || '';
            const state = props.state || '';
            const country = props.country || '';
            
            const mainText = name || street || city;
            const subParts = [street, city, state, country].filter(Boolean);
            if (name && street && subParts.includes(street)) {
              const idx = subParts.indexOf(street);
              if (idx !== -1) subParts.splice(idx, 1);
            }
            const secondaryText = subParts.join(', ');
            const fullAddress = [mainText, secondaryText].filter(Boolean).join(', ');

            return {
              description: fullAddress,
              main_text: mainText,
              secondary_text: secondaryText,
              lat: geom[1],
              lng: geom[0],
              place_id: props.osm_id || Math.random().toString()
            };
          });
          setPickupSuggestions(suggestions);
          setShowPickupSuggestions(true);
        } else {
          setPickupSuggestions([]);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Photon geocoder error:', err);
          setPickupSuggestions([]);
        }
      }
    }, 350);
  };

  const handleSelectPickup = (suggestion: any) => {
    setPickupInput(suggestion.description);
    setPickup(suggestion.description);
    setShowPickupSuggestions(false);
    setPickupCoords({ lat: suggestion.lat, lng: suggestion.lng });
    setBookingError(null);
  };

  const handleDropChange = (val: string) => {
    setDropInput(val);
    if (dropTimerRef.current) clearTimeout(dropTimerRef.current);

    if (!val.trim()) {
      setDropSuggestions([]);
      return;
    }

    dropTimerRef.current = setTimeout(async () => {
      if (dropAbortRef.current) dropAbortRef.current.abort();

      const controller = new AbortController();
      dropAbortRef.current = controller;

      try {
        // Photon API query biased towards Visakhapatnam center coordinates
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&limit=5&lon=83.318&lat=17.712`;
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();

        if (data.features) {
          const suggestions = data.features.map((feature: any) => {
            const geom = feature.geometry.coordinates; // [lng, lat]
            const props = feature.properties;
            
            const name = props.name || '';
            const street = props.street || '';
            const city = props.city || props.town || props.village || '';
            const state = props.state || '';
            const country = props.country || '';
            
            const mainText = name || street || city;
            const subParts = [street, city, state, country].filter(Boolean);
            if (name && street && subParts.includes(street)) {
              const idx = subParts.indexOf(street);
              if (idx !== -1) subParts.splice(idx, 1);
            }
            const secondaryText = subParts.join(', ');
            const fullAddress = [mainText, secondaryText].filter(Boolean).join(', ');

            return {
              description: fullAddress,
              main_text: mainText,
              secondary_text: secondaryText,
              lat: geom[1],
              lng: geom[0],
              place_id: props.osm_id || Math.random().toString()
            };
          });
          setDropSuggestions(suggestions);
          setShowDropSuggestions(true);
        } else {
          setDropSuggestions([]);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Photon geocoder error:', err);
          setDropSuggestions([]);
        }
      }
    }, 350);
  };

  const handleSelectDrop = (suggestion: any) => {
    setDropInput(suggestion.description);
    setDrop(suggestion.description);
    setShowDropSuggestions(false);
    setDropCoords({ lat: suggestion.lat, lng: suggestion.lng });
    setBookingError(null);
  };

  // Road Routing calculation using OSRM & fare calculation
  const handleFindFares = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);

    if (!pickupCoords) {
      setBookingError('Please select a pickup location from the suggestions.');
      return;
    }
    if (!dropCoords) {
      setBookingError('Please select a drop location from the suggestions.');
      return;
    }

    setLoadingEstimates(true);

    try {
      // 1. Fetch Driving Route info from Open Source Routing Machine
      const url = `https://router.project-osrm.org/route/v1/driving/${pickupCoords.lng},${pickupCoords.lat};${dropCoords.lng},${dropCoords.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Unable to calculate directions route. Road networks may be separated.');
      }
      const data = await res.json();
      
      if (!data.routes || !data.routes[0]) {
        throw new Error('Unable to calculate directions route between coordinates.');
      }

      const route = data.routes[0];
      const distanceKm = route.distance / 1000;
      const durationMins = Math.round(route.duration / 60);

      setDistanceText(`${distanceKm.toFixed(1)} km`);
      setDurationText(`${durationMins} mins`);
      setDirectionsResult(route);

      // 2. Fetch Pricing Estimates from Backend API using actual coordinates
      const token = localStorage.getItem('token');
      const types = ['BIKE', 'AUTO', 'CAB'];
      const estimatesData: Record<string, number> = {};

      await Promise.all(
        types.map(async (t) => {
          const resEstimate = await fetch(`${API_URL}/api/customer/rides/estimate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              pickupAddress: pickup,
              pickupLat: pickupCoords.lat,
              pickupLng: pickupCoords.lng,
              dropoffAddress: drop,
              dropoffLat: dropCoords.lat,
              dropoffLng: dropCoords.lng,
              vehicleType: t
            })
          });
          const json = await resEstimate.json();
          if (json.success) {
            estimatesData[t] = json.data.totalFare;
          } else {
            throw new Error(json.error?.message || `Failed to fetch estimate for ${t}`);
          }
        })
      );

      setEstimates(estimatesData);
      setStep(2);
    } catch (err: any) {
      setBookingError(err.message || 'Error processing route calculations. Please try again.');
    } finally {
      setLoadingEstimates(false);
    }
  };

  const handleContinueToPayment = async () => {
    setBookingLoading(true);
    setBookingError(null);
    const token = localStorage.getItem('token');

    try {
      if (paymentPreference === 'CASH') {
        setPaymentMethodName('Cash (Pay Captain directly)');
        setStep(3);
        return;
      }

      if (paymentPreference === 'UPI') {
        if (!upiId || !upiId.trim()) {
          throw new Error('UPI is selected but no UPI ID is registered. Please set a UPI ID under Payment Methods first, or select another method.');
        }
        setPaymentMethodName(`UPI (${upiId})`);
        setStep(3);
        return;
      }

      // Card method
      const pmRes = await fetch(`${API_URL}/api/customer/payment-methods`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const pmData = await pmRes.json();
      
      if (pmData.success && pmData.data.length > 0) {
        setPaymentMethodName(`Payment via Card (${pmData.data[0].brand.toUpperCase()} ****${pmData.data[0].last4})`);
        setSelectedCardId(pmData.data[0].id);
      } else {
        const setupRes = await fetch(`${API_URL}/api/customer/payment-methods/setup`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const setupData = await setupRes.json();
        if (!setupData.success) throw new Error('Stripe setup token initialization failed');

        const attachRes = await fetch(`${API_URL}/api/customer/payment-methods`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ paymentMethodId: 'pm_mock_visa' })
        });
        const attachData = await attachRes.json();
        if (!attachData.success) throw new Error('Failed to save credit card method');
        setPaymentMethodName('Payment via Card (VISA ****4242)');
        setSelectedCardId('pm_mock_visa');
      }

      setStep(3);
    } catch (err: any) {
      setBookingError(err.message || 'Payment method verification failed.');
    } finally {
      setBookingLoading(false);
    }
  };

  const confirmBooking = async () => {
    setBookingLoading(true);
    setBookingError(null);
    const token = localStorage.getItem('token');

    try {
      if (!pickupCoords || !dropCoords) throw new Error('Missing coordinates.');

      let paymentMethodId = 'CASH';
      if (paymentPreference === 'CARD') {
        paymentMethodId = selectedCardId || 'pm_mock_visa';
      } else if (paymentPreference === 'UPI') {
        paymentMethodId = upiId ? `upi:${upiId}` : 'UPI';
      }

      const bookRes = await fetch(`${API_URL}/api/customer/rides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pickupAddress: pickup,
          pickupLat: pickupCoords.lat,
          pickupLng: pickupCoords.lng,
          dropoffAddress: drop,
          dropoffLat: dropCoords.lat,
          dropoffLng: dropCoords.lng,
          vehicleType: selectedService,
          paymentMethodId
        })
      });
      const bookData = await bookRes.json();
      if (bookData.success) {
        navigate(`/rides/${bookData.data.id}`);
      } else {
        throw new Error(bookData.error?.message || 'Failed to book the ride.');
      }
    } catch (err: any) {
      setBookingError(err.message || 'Error completing booking. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const resetBooking = () => {
    setPickup('');
    setDrop('');
    setPickupInput('');
    setDropInput('');
    setPickupCoords(null);
    setDropCoords(null);
    setStep(1);
    setBookingError(null);
  };

  const getServiceLabel = () => {
    switch (selectedService) {
      case 'BIKE':
        return 'Bike-Taxi';
      case 'AUTO':
        return 'Auto';
      case 'CAB':
        return 'Cab';
    }
  };

  const suggestionsBoxStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    border: '1px solid #ccc',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 10,
    maxHeight: '200px',
    overflowY: 'auto',
    margin: 0,
    padding: 0,
    listStyle: 'none'
  };

  const suggestionItemStyle = {
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #eee',
    fontSize: '14px',
    color: '#333'
  };

  return (
    <div style={{ fontFamily: 'sans-serif', color: '#1a1f36', backgroundColor: '#f8f9fa' }}>
      
      {step === 1 ? (
        /* STEP 1 & 2: Search and Address Inputs Auto-suggest Panel */
        <>
          <section style={{
            background: 'linear-gradient(135deg, #e8f5e9 0%, #ffffff 100%)',
            padding: '60px 40px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '40px',
            maxWidth: '1200px',
            margin: '0 auto',
            boxSizing: 'border-box'
          }}>
            {/* Left Side: Booking Form */}
            <div style={{ flex: '1 1 500px', maxWidth: '600px' }}>
              <span style={{ 
                backgroundColor: '#c8e6c9', 
                color: '#1b5e20', 
                padding: '6px 12px', 
                borderRadius: '20px', 
                fontSize: '13px', 
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                RideNow Booking
              </span>
              <h1 style={{ fontSize: '42px', fontWeight: 'bold', margin: '20px 0 10px 0', color: '#111', lineHeight: '1.2' }}>
                Next-Gen Commute Platform
              </h1>
              <p style={{ fontSize: '18px', color: '#555', margin: '0 0 35px 0', lineHeight: '1.5' }}>
                Quick, Affordable rides at your doorstep
              </p>

              {/* Booking inputs card */}
              <div style={{
                backgroundColor: '#fff',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                border: '1px solid #e3e6f0'
              }}>
                {bookingError && (
                  <div style={{
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    padding: '12px',
                    borderRadius: '6px',
                    marginBottom: '20px',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    {bookingError}
                  </div>
                )}

                <form onSubmit={handleFindFares} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#555' }}>
                      Pickup Location
                    </label>
                    <input
                      type="text"
                      placeholder="Enter pickup location"
                      value={pickupInput}
                      onChange={(e) => handlePickupChange(e.target.value)}
                      onFocus={() => pickupSuggestions.length > 0 && setShowPickupSuggestions(true)}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: '8px',
                        border: '1px solid #ccc',
                        boxSizing: 'border-box',
                        fontSize: '15px',
                        outline: 'none'
                      }}
                      required
                    />
                    {showPickupSuggestions && pickupSuggestions.length > 0 && (
                      <>
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }} onClick={() => setShowPickupSuggestions(false)} />
                        <ul style={suggestionsBoxStyle}>
                          {pickupSuggestions.map((s) => (
                            <li 
                              key={s.place_id} 
                              onClick={() => handleSelectPickup(s)}
                              style={suggestionItemStyle}
                            >
                              <strong>{s.main_text || s.description}</strong>
                              {s.secondary_text && (
                                <span style={{ display: 'block', fontSize: '11px', color: '#888', marginTop: '2px' }}>
                                  {s.secondary_text}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>

                  <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#555' }}>
                      Drop Location
                    </label>
                    <input
                      type="text"
                      placeholder="Enter drop location"
                      value={dropInput}
                      onChange={(e) => handleDropChange(e.target.value)}
                      onFocus={() => dropSuggestions.length > 0 && setShowDropSuggestions(true)}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: '8px',
                        border: '1px solid #ccc',
                        boxSizing: 'border-box',
                        fontSize: '15px',
                        outline: 'none'
                      }}
                      required
                    />
                    {showDropSuggestions && dropSuggestions.length > 0 && (
                      <>
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }} onClick={() => setShowDropSuggestions(false)} />
                        <ul style={suggestionsBoxStyle}>
                          {dropSuggestions.map((s) => (
                            <li 
                              key={s.place_id} 
                              onClick={() => handleSelectDrop(s)}
                              style={suggestionItemStyle}
                            >
                              <strong>{s.main_text || s.description}</strong>
                              {s.secondary_text && (
                                <span style={{ display: 'block', fontSize: '11px', color: '#888', marginTop: '2px' }}>
                                  {s.secondary_text}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loadingEstimates}
                    style={{
                      backgroundColor: '#00b562',
                      color: '#fff',
                      border: 'none',
                      padding: '16px',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      boxShadow: '0 4px 12px rgba(0, 181, 98, 0.2)'
                    }}
                  >
                    {loadingEstimates ? 'Calculating route & fares...' : 'BOOK A RIDE'}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Side: Hero Image Vector */}
            <div style={{ flex: '1 1 450px', display: 'flex', justifyContent: 'center' }}>
              <svg width="450" height="350" viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ maxWidth: '100%', height: 'auto' }}>
                <rect width="500" height="400" rx="20" fill="#f1f8e9" />
                <path d="M50 300 H450 V320 H50 Z" fill="#cfd8dc" />
                <path d="M80 300 V180 H140 V300 Z M170 300 V210 H220 V300 Z M260 300 V150 H320 V300 Z M350 300 V230 H410 V300 Z" fill="#b0bec5" opacity="0.5" />
                <path d="M30 320 Q 250 290, 470 320" stroke="#37474f" strokeWidth="8" strokeLinecap="round" />
                <rect x="180" y="240" width="160" height="60" rx="15" fill="#00b562" />
                <path d="M210 240 L230 200 H300 L320 240 Z" fill="#a5d6a7" />
                <circle cx="215" cy="300" r="22" fill="#263238" />
                <circle cx="215" cy="300" r="8" fill="#eceff1" />
                <circle cx="305" cy="300" r="22" fill="#263238" />
                <circle cx="305" cy="300" r="8" fill="#eceff1" />
                <rect x="235" y="210" width="25" height="20" fill="#37474f" />
                <rect x="270" y="210" width="25" height="20" fill="#37474f" />
                <rect x="245" y="192" width="30" height="8" rx="2" fill="#ffeb3b" />
                <path d="M340 265 L360 270 L340 275 Z" fill="#fff9c4" opacity="0.8" />
                <rect x="180" y="255" width="6" height="15" fill="#f44336" />
              </svg>
            </div>
          </section>

          {/* Our Services Section */}
          <section style={{
            padding: '80px 20px',
            maxWidth: '1100px',
            margin: '0 auto',
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111', margin: '0 0 10px 0' }}>
              OUR SERVICES
            </h2>
            <div style={{ width: '60px', height: '4px', backgroundColor: '#00b562', margin: '0 auto 50px auto', borderRadius: '2px' }} />

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '30px' }}>
              <div style={{
                backgroundColor: '#fff',
                border: '1px solid #e3e6f0',
                borderRadius: '12px',
                padding: '30px 20px',
                flex: '1 1 300px',
                maxWidth: '340px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                boxSizing: 'border-box'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏍️</div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 10px 0', color: '#111' }}>Bike-Taxi</h3>
                <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.5', margin: '0 0 20px 0' }}>
                  Beat traffic, ride quicker
                </p>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#00b562', textTransform: 'uppercase' }}>
                  ⚡ Speedy Transit
                </span>
              </div>

              <div style={{
                backgroundColor: '#fff',
                border: '1px solid #e3e6f0',
                borderRadius: '12px',
                padding: '30px 20px',
                flex: '1 1 300px',
                maxWidth: '340px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                boxSizing: 'border-box'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>🛺</div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 10px 0', color: '#111' }}>Auto</h3>
                <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.5', margin: '0 0 20px 0' }}>
                  Everyday rides, made easy
                </p>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#00b562', textTransform: 'uppercase' }}>
                  ✨ Pocket Friendly
                </span>
              </div>

              <div style={{
                backgroundColor: '#fff',
                border: '1px solid #e3e6f0',
                borderRadius: '12px',
                padding: '30px 20px',
                flex: '1 1 300px',
                maxWidth: '340px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                boxSizing: 'border-box'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚗</div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 10px 0', color: '#111' }}>Cab</h3>
                <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.5', margin: '0 0 20px 0' }}>
                  Comfort for every journey
                </p>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#00b562', textTransform: 'uppercase' }}>
                  ⭐ Premium Comfort
                </span>
              </div>
            </div>
          </section>

          {/* What We Offer Section */}
          <section style={{
            backgroundColor: '#fff',
            padding: '80px 20px',
            borderTop: '1px solid #eee',
            borderBottom: '1px solid #eee'
          }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111', margin: '0 0 10px 0', textAlign: 'center' }}>
                WHAT WE OFFER
              </h2>
              <div style={{ width: '60px', height: '4px', backgroundColor: '#00b562', margin: '0 auto 60px auto', borderRadius: '2px' }} />

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '50px', marginBottom: '60px' }}>
                <div style={{ flex: '1 1 400px', display: 'flex', justifyContent: 'center' }}>
                  <svg width="280" height="200" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="200" height="150" rx="15" fill="#e8f5e9" />
                    <circle cx="100" cy="75" r="40" fill="#a5d6a7" />
                    <path d="M100 50 V75 H120" stroke="#1b5e20" strokeWidth="6" strokeLinecap="round" />
                    <circle cx="150" cy="40" r="12" fill="#00b562" />
                    <path d="M150 34 V46 M144 40 H156" stroke="#fff" strokeWidth="2" />
                  </svg>
                </div>
                <div style={{ flex: '1 1 400px' }}>
                  <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111', margin: '0 0 15px 0' }}>
                    Quick Pickup
                  </h3>
                  <p style={{ color: '#555', fontSize: '15px', lineHeight: '1.6', margin: 0 }}>
                    Pickups within minutes that help you save time on every ride. A RideNow is always nearby when you need to get moving.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap-reverse', alignItems: 'center', gap: '50px', marginBottom: '60px' }}>
                <div style={{ flex: '1 1 400px' }}>
                  <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111', margin: '0 0 15px 0' }}>
                    Best Fares
                  </h3>
                  <p style={{ color: '#555', fontSize: '15px', lineHeight: '1.6', margin: 0 }}>
                    Affordable prices designed for everyday rides. Travel more, spend less without compromising on comfort.
                  </p>
                </div>
                <div style={{ flex: '1 1 400px', display: 'flex', justifyContent: 'center' }}>
                  <svg width="280" height="200" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="200" height="150" rx="15" fill="#e8f5e9" />
                    <path d="M60 40 H140 V110 H60 Z" fill="#81c784" />
                    <circle cx="100" cy="75" r="20" fill="#fff" />
                    <text x="94" y="82" fill="#2e7d32" fontSize="20" fontWeight="bold">₹</text>
                  </svg>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '50px' }}>
                <div style={{ flex: '1 1 400px', display: 'flex', justifyContent: 'center' }}>
                  <svg width="280" height="200" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="200" height="150" rx="15" fill="#e8f5e9" />
                    <path d="M50 100 Q 100 30, 150 100 Z" fill="#a5d6a7" />
                    <circle cx="100" cy="65" r="10" fill="#00b562" />
                    <circle cx="65" cy="95" r="8" fill="#1b5e20" />
                    <circle cx="135" cy="95" r="8" fill="#1b5e20" />
                  </svg>
                </div>
                <div style={{ flex: '1 1 400px' }}>
                  <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111', margin: '0 0 15px 0' }}>
                    Never Too Far
                  </h3>
                  <p style={{ color: '#555', fontSize: '15px', lineHeight: '1.6', margin: 0 }}>
                    Present across 400+ cities and counting. Wherever you go, find a RideNow ride close by.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* About Us Section */}
          <section id="about" style={{
            padding: '80px 20px',
            maxWidth: '1000px',
            margin: '0 auto',
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111', margin: '0 0 10px 0' }}>
              ABOUT US
            </h2>
            <div style={{ width: '60px', height: '4px', backgroundColor: '#00b562', margin: '0 auto 30px auto', borderRadius: '2px' }} />
            <p style={{ color: '#555', fontSize: '16px', lineHeight: '1.7', maxWidth: '800px', margin: '0 auto' }}>
              At RideNow, we are building the future of urban mobility in India. Driven by technology, sustainability, and affordability, we connect customers with trusted drivers for bikes, autos, and cabs in real time. Our mission is to make daily commute stress-free, cost-effective, and safe for everyone.
            </p>
          </section>

          {/* Safety Section */}
          <section id="safety" style={{
            backgroundColor: '#e8f5e9',
            padding: '80px 20px'
          }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
              <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1b5e20', margin: '0 0 10px 0' }}>
                SAFETY FIRST
              </h2>
              <div style={{ width: '60px', height: '4px', backgroundColor: '#00b562', margin: '0 auto 30px auto', borderRadius: '2px' }} />
              <p style={{ color: '#2e7d32', fontSize: '16px', lineHeight: '1.7', maxWidth: '800px', margin: '0 auto 40px auto' }}>
                Your safety is our top priority. We verify every driver partner, ensure regular vehicle check-ups, and offer real-time ride tracking, sharing, and SOS button support to keep you safe and comfortable on every trip.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px' }}>
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', flex: '1 1 200px', maxWidth: '280px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <span style={{ fontSize: '28px' }}>🛡️</span>
                  <h4 style={{ fontWeight: 'bold', margin: '10px 0 5px 0' }}>Verified Drivers</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>All drivers undergo background and identity verification.</p>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', flex: '1 1 200px', maxWidth: '280px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <span style={{ fontSize: '28px' }}>📍</span>
                  <h4 style={{ fontWeight: 'bold', margin: '10px 0 5px 0' }}>Real-time Tracking</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>Track your ride in real-time or share details with family.</p>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', flex: '1 1 200px', maxWidth: '280px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <span style={{ fontSize: '28px' }}>💬</span>
                  <h4 style={{ fontWeight: 'bold', margin: '10px 0 5px 0' }}>24/7 Support</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>Reach our customer support center instantly from the app.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Contact Us Section */}
          <section id="contact" style={{
            padding: '80px 20px',
            maxWidth: '1000px',
            margin: '0 auto',
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111', margin: '0 0 10px 0' }}>
              CONTACT US
            </h2>
            <div style={{ width: '60px', height: '4px', backgroundColor: '#00b562', margin: '0 auto 30px auto', borderRadius: '2px' }} />
            <p style={{ color: '#555', fontSize: '16px', marginBottom: '30px' }}>
              Have questions, feedback, or need help? Get in touch with our team!
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '16px', color: '#333' }}>Email Support</strong>
                <span style={{ color: '#00b562', fontWeight: 'bold' }}>support@ridenow.com</span>
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '16px', color: '#333' }}>Phone Support</strong>
                <span style={{ color: '#00b562', fontWeight: 'bold' }}>+91 80 4930 2002</span>
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '16px', color: '#333' }}>Corporate Office</strong>
                <span style={{ color: '#555' }}>Indiranagar, Bangalore, Karnataka, India</span>
              </div>
            </div>
          </section>
        </>
      ) : step === 2 ? (
        /* STEP 3, 4, 5, 6, 7, 8: Map route displaying & Select Service panel */
        <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', boxSizing: 'border-box' }}>
          <button
            onClick={resetBooking}
            style={{
              backgroundColor: 'transparent',
              color: '#555',
              border: 'none',
              padding: '8px 0',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '20px'
            }}
          >
            &larr; Back to Route Inputs
          </button>

          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            border: '1px solid #e3e6f0',
            overflow: 'hidden'
          }}>
            {/* Address Summary Box */}
            <div style={{ padding: '20px', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '15px' }}>
                <span style={{ fontSize: '20px', lineHeight: 1 }}>🟢</span>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#00b562', textTransform: 'uppercase', marginBottom: '2px' }}>
                    Pickup Location
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#333' }}>
                    {pickup}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '20px', lineHeight: 1 }}>🔴</span>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#dc3545', textTransform: 'uppercase', marginBottom: '2px' }}>
                    Drop Location
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#333' }}>
                    {drop}
                  </div>
                </div>
              </div>
            </div>

            {/* MapLibre OpenStreetMap Container */}
            <div ref={mapContainerRef} style={{ width: '100%', height: '300px', backgroundColor: '#eef1f6' }} />

            {/* Distance and Estimated Time indicators */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-around',
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderBottom: '1px solid #eee',
              fontSize: '15px',
              fontWeight: 'bold',
              color: '#333'
            }}>
              <div>Distance: <span style={{ color: '#00b562' }}>{distanceText}</span></div>
              <div>Est. Travel Time: <span style={{ color: '#00b562' }}>{durationText}</span></div>
            </div>

            {bookingError && (
              <div style={{
                backgroundColor: '#ffebee',
                color: '#c62828',
                padding: '12px',
                margin: '20px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                {bookingError}
              </div>
            )}

            {/* Select Services container */}
            <div style={{ padding: '25px 20px 20px 20px' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                SELECT SERVICE
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* Bike card */}
                <div 
                  onClick={() => setSelectedService('BIKE')}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    borderRadius: '10px',
                    border: selectedService === 'BIKE' ? '2.5px solid #00b562' : '1px solid #e3e6f0',
                    backgroundColor: selectedService === 'BIKE' ? '#e8f5e9' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '32px' }}>🏍️</span>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Bike-Taxi</div>
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>Save time while you beat traffic</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', color: '#00b562', fontSize: '20px' }}>
                      ₹{estimates['BIKE']?.toFixed(0) || '0'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{durationText}</div>
                  </div>
                </div>

                {/* Auto card */}
                <div 
                  onClick={() => setSelectedService('AUTO')}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    borderRadius: '10px',
                    border: selectedService === 'AUTO' ? '2.5px solid #00b562' : '1px solid #e3e6f0',
                    backgroundColor: selectedService === 'AUTO' ? '#e8f5e9' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '32px' }}>🛺</span>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Auto</div>
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>Everyday rides, made easy</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', color: '#00b562', fontSize: '20px' }}>
                      ₹{estimates['AUTO']?.toFixed(0) || '0'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{durationText}</div>
                  </div>
                </div>

                {/* Cab card */}
                <div 
                  onClick={() => setSelectedService('CAB')}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    borderRadius: '10px',
                    border: selectedService === 'CAB' ? '2.5px solid #00b562' : '1px solid #e3e6f0',
                    backgroundColor: selectedService === 'CAB' ? '#e8f5e9' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '32px' }}>🚗</span>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Cab</div>
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>Comfort for every journey</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', color: '#00b562', fontSize: '20px' }}>
                      ₹{estimates['CAB']?.toFixed(0) || '0'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{durationText}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions button */}
            <div style={{ padding: '20px', backgroundColor: '#fafafa', borderTop: '1px solid #f0f0f0' }}>
              <button
                onClick={handleContinueToPayment}
                disabled={bookingLoading}
                style={{
                  width: '100%',
                  backgroundColor: '#00b562',
                  color: '#fff',
                  border: 'none',
                  padding: '16px 20px',
                  borderRadius: '30px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: bookingLoading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                  boxShadow: '0 4px 12px rgba(0, 181, 98, 0.25)',
                  textAlign: 'center'
                }}
              >
                {bookingLoading ? 'Verifying payment...' : 'Continue Booking'}
              </button>
            </div>

          </div>
        </div>
      ) : (
        /* STEP 9, 10, 11, 12: Payment & Booking confirmation summary page */
        <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px', boxSizing: 'border-box' }}>
          <button
            onClick={() => setStep(2)}
            style={{
              backgroundColor: 'transparent',
              color: '#555',
              border: 'none',
              padding: '8px 0',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '20px'
            }}
          >
            &larr; Back to Service Selection
          </button>

          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            border: '1px solid #e3e6f0',
            padding: '30px'
          }}>
            <h2 style={{ margin: '0 0 25px 0', fontSize: '24px', fontWeight: 'bold', color: '#111', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
              Payment / Booking Confirmation
            </h2>

            {bookingError && (
              <div style={{
                backgroundColor: '#ffebee',
                color: '#c62828',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                {bookingError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '30px', fontSize: '15px' }}>
              <div>
                <strong style={{ display: 'block', color: '#666', fontSize: '13px', textTransform: 'uppercase', marginBottom: '4px' }}>Route</strong>
                <div style={{ fontWeight: 'bold', color: '#333' }}>🟢 {pickup}</div>
                <div style={{ fontWeight: 'bold', color: '#333', marginTop: '6px' }}>🔴 {drop}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', borderTop: '1px solid #f9f9f9', paddingTop: '15px' }}>
                <div>
                  <strong style={{ display: 'block', color: '#666', fontSize: '13px', textTransform: 'uppercase', marginBottom: '4px' }}>Service Class</strong>
                  <span style={{ fontWeight: 'bold', color: '#333' }}>{getServiceLabel()}</span>
                </div>
                <div>
                  <strong style={{ display: 'block', color: '#666', fontSize: '13px', textTransform: 'uppercase', marginBottom: '4px' }}>Distance</strong>
                  <span style={{ fontWeight: 'bold', color: '#333' }}>{distanceText}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', borderTop: '1px solid #f9f9f9', paddingTop: '15px' }}>
                <div>
                  <strong style={{ display: 'block', color: '#666', fontSize: '13px', textTransform: 'uppercase', marginBottom: '4px' }}>Estimated Time</strong>
                  <span style={{ fontWeight: 'bold', color: '#333' }}>{durationText}</span>
                </div>
                <div>
                  <strong style={{ display: 'block', color: '#666', fontSize: '13px', textTransform: 'uppercase', marginBottom: '4px' }}>Total Fare</strong>
                  <span style={{ fontWeight: 'bold', color: '#00b562', fontSize: '20px' }}>
                    ₹{estimates[selectedService]?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #f9f9f9', paddingTop: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ color: '#666', fontSize: '13px', textTransform: 'uppercase' }}>Payment Method</strong>
                  <button 
                    onClick={() => setIsChangingMethod(!isChangingMethod)} 
                    style={{ background: 'none', border: 'none', color: '#3182ce', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                  >
                    {isChangingMethod ? 'Close' : 'Change'}
                  </button>
                </div>
                
                {isChangingMethod ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '8px', border: '1px solid #edf2f7' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        type="button"
                        onClick={() => {
                          setPaymentPreference('CARD');
                          setPaymentMethodName(savedCards.length > 0 ? `Payment via Card (${savedCards[0].brand.toUpperCase()} ****${savedCards[0].last4})` : 'Payment via Card (VISA ****4242)');
                        }}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: '6px',
                          border: paymentPreference === 'CARD' ? '2px solid #00b562' : '1px solid #cbd5e0',
                          backgroundColor: paymentPreference === 'CARD' ? '#e8f5e9' : '#fff',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        💳 Card
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setPaymentPreference('UPI');
                          setPaymentMethodName(upiId ? `UPI (${upiId})` : 'UPI (Not registered)');
                        }}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: '6px',
                          border: paymentPreference === 'UPI' ? '2px solid #00b562' : '1px solid #cbd5e0',
                          backgroundColor: paymentPreference === 'UPI' ? '#e8f5e9' : '#fff',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        📱 UPI
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setPaymentPreference('CASH');
                          setPaymentMethodName('Cash (Pay Captain directly)');
                        }}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: '6px',
                          border: paymentPreference === 'CASH' ? '2px solid #00b562' : '1px solid #cbd5e0',
                          backgroundColor: paymentPreference === 'CASH' ? '#e8f5e9' : '#fff',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        💵 Cash
                      </button>
                    </div>

                    {paymentPreference === 'UPI' && (
                      <div style={{ marginTop: '5px' }}>
                        <input 
                          type="text"
                          placeholder="Enter UPI ID (e.g. username@bank)"
                          value={upiId}
                          onChange={(e) => {
                            setUpiId(e.target.value);
                            setPaymentMethodName(`UPI (${e.target.value})`);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e0',
                            fontSize: '12px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#333' }}>
                    <span>{paymentPreference === 'CARD' ? '💳' : paymentPreference === 'UPI' ? '📱' : '💵'}</span>
                    <span>{paymentMethodName}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={confirmBooking}
              disabled={bookingLoading}
              style={{
                width: '100%',
                backgroundColor: '#00b562',
                color: '#fff',
                border: 'none',
                padding: '16px',
                borderRadius: '30px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: bookingLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(0, 181, 98, 0.25)',
                transition: 'background 0.2s'
              }}
            >
              {bookingLoading ? 'Authorizing Payment...' : 'Pay & Confirm Ride'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
