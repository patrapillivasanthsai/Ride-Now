import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  MapPin, Navigation, ArrowRight, ShieldCheck, 
  Clock, CreditCard, Banknote, Smartphone, CheckCircle, Navigation2
} from 'lucide-react';

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
  const [paymentPreference, setPaymentPreference] = useState<'RAZORPAY' | 'CARD' | 'UPI' | 'CASH'>('RAZORPAY');
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

  // Handle direct anchor hash navigation on page load / hash change (#about, #safety, #contact)
  useEffect(() => {
    if (window.location.hash) {
      const targetId = window.location.hash.replace('#', '');
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    }
  }, [step]);

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
      if (paymentPreference === 'RAZORPAY') {
        setPaymentMethodName('Razorpay Online (UPI, Cards, Netbanking)');
        setStep(3);
        return;
      }

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

      // Card method (Stripe)
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

      let paymentMethodId = 'RAZORPAY';
      if (paymentPreference === 'CARD') {
        paymentMethodId = selectedCardId || 'pm_mock_visa';
      } else if (paymentPreference === 'UPI') {
        paymentMethodId = upiId ? `upi:${upiId}` : 'UPI';
      } else if (paymentPreference === 'CASH') {
        paymentMethodId = 'CASH';
      }

      // 1. Create ride request in backend
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
      if (!bookData.success) {
        throw new Error(bookData.error?.message || 'Failed to book the ride.');
      }

      const rideId = bookData.data.id;

      // 2. If Razorpay selected, create Razorpay Order & launch Razorpay Checkout Modal
      if (paymentPreference === 'RAZORPAY') {
        const orderRes = await fetch(`${API_URL}/api/payments/razorpay/create-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ rideId })
        });
        const orderJson = await orderRes.json();
        
        if (orderJson.success && orderJson.data && (window as any).Razorpay) {
          const orderData = orderJson.data;
          const options = {
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency || 'INR',
            name: 'RideNow',
            description: `Payment for ${selectedService} Ride`,
            order_id: orderData.orderId,
            handler: async function (response: any) {
              try {
                const verifyRes = await fetch(`${API_URL}/api/payments/razorpay/verify`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    rideId,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature
                  })
                });
                const verifyJson = await verifyRes.json();
                if (verifyJson.success) {
                  navigate(`/rides/${rideId}`);
                } else {
                  setBookingError(verifyJson.error?.message || 'Payment verification failed.');
                  navigate(`/rides/${rideId}`);
                }
              } catch (err) {
                navigate(`/rides/${rideId}`);
              }
            },
            modal: {
              ondismiss: function () {
                setBookingLoading(false);
                navigate(`/rides/${rideId}`);
              }
            },
            prefill: {
              name: orderData.customerName,
              contact: orderData.customerPhone
            },
            theme: { color: '#00b562' }
          };
          const rzp = new (window as any).Razorpay(options);
          rzp.open();
          return;
        } else {
          // If Razorpay script or order fails, fallback smoothly to ride detail
          navigate(`/rides/${rideId}`);
          return;
        }
      }

      // Non-Razorpay methods
      navigate(`/rides/${rideId}`);
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
      case 'BIKE': return 'Bike-Taxi';
      case 'AUTO': return 'Auto';
      case 'CAB': return 'Cab';
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      
      {step === 1 ? (
        <>
          {/* STEP 1: Hero & Search */}
          <section className="bg-gradient-to-br from-green-50 to-white dark:from-slate-900 dark:to-slate-950 py-16 px-4 md:px-8 border-b border-green-100 dark:border-slate-800">
            <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12">
              
              {/* Left Side: Booking Form */}
              <div className="flex-1 w-full max-w-lg">
                <div className="inline-block bg-brand-green/10 text-brand-green px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border border-brand-green/20">
                  RideNow Booking
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 leading-tight tracking-tight">
                  Next-Gen Commute Platform
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 font-medium">
                  Quick, Affordable rides at your doorstep.
                </p>

                {/* Booking Card */}
                <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 relative z-10">
                  {bookingError && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-semibold flex items-start gap-3">
                      <div className="mt-0.5">⚠️</div>
                      <div>{bookingError}</div>
                    </div>
                  )}

                  <form onSubmit={handleFindFares} className="flex flex-col gap-5">
                    
                    {/* Pickup Input */}
                    <div className="relative">
                      <label className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-brand-green"></div> Pickup Location
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-green w-5 h-5" />
                        <input
                          type="text"
                          placeholder="Enter pickup location"
                          value={pickupInput}
                          onChange={(e) => handlePickupChange(e.target.value)}
                          onFocus={() => pickupSuggestions.length > 0 && setShowPickupSuggestions(true)}
                          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green transition shadow-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                          required
                        />
                      </div>
                      
                      {showPickupSuggestions && pickupSuggestions.length > 0 && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowPickupSuggestions(false)} />
                          <ul className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto overflow-x-hidden">
                            {pickupSuggestions.map((s) => (
                              <li 
                                key={s.place_id} 
                                onClick={() => handleSelectPickup(s)}
                                className="px-4 py-3 cursor-pointer border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                              >
                                <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">{s.main_text || s.description}</div>
                                {s.secondary_text && (
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{s.secondary_text}</div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>

                    {/* Drop Location */}
                    <div className="relative">
                      <label className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div> Drop Location
                      </label>
                      <div className="relative">
                        <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500 w-5 h-5" />
                        <input
                          type="text"
                          placeholder="Enter drop location"
                          value={dropInput}
                          onChange={(e) => handleDropChange(e.target.value)}
                          onFocus={() => dropSuggestions.length > 0 && setShowDropSuggestions(true)}
                          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition shadow-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                          required
                        />
                      </div>

                      {showDropSuggestions && dropSuggestions.length > 0 && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowDropSuggestions(false)} />
                          <ul className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto overflow-x-hidden">
                            {dropSuggestions.map((s) => (
                              <li 
                                key={s.place_id} 
                                onClick={() => handleSelectDrop(s)}
                                className="px-4 py-3 cursor-pointer border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                              >
                                <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">{s.main_text || s.description}</div>
                                {s.secondary_text && (
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{s.secondary_text}</div>
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
                      className="w-full bg-brand-green hover:bg-green-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-brand-green/30 transition disabled:opacity-70 disabled:cursor-not-allowed mt-2 flex justify-center items-center gap-2"
                    >
                      {loadingEstimates ? (
                        <>
                          <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                          Calculating fares...
                        </>
                      ) : (
                        <>
                          Book a Ride <ArrowRight size={20} />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Side: Hero Graphic */}
              <div className="hidden lg:flex flex-1 justify-center relative">
                <div className="absolute inset-0 bg-brand-green/10 rounded-full blur-3xl transform scale-110"></div>
                <div className="relative z-10 w-full max-w-md bg-gradient-to-br from-emerald-500/10 to-brand-green/20 dark:from-emerald-500/5 dark:to-slate-800 p-8 rounded-3xl border border-brand-green/20 dark:border-slate-700/50 shadow-2xl flex flex-col items-center justify-center text-center gap-4">
                  <div className="w-24 h-24 rounded-2xl bg-brand-green text-white flex items-center justify-center text-5xl shadow-lg shadow-brand-green/30">
                    ⚡
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Fast & Reliable</h3>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Book Bike-Taxi, Auto & Cabs instantly near you with zero surge pricing.</p>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <span className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold shadow-sm border border-slate-200 dark:border-slate-700">🏍️ Bike</span>
                    <span className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold shadow-sm border border-slate-200 dark:border-slate-700">🛺 Auto</span>
                    <span className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold shadow-sm border border-slate-200 dark:border-slate-700">🚗 Cab</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features / Offers Section */}
          <section className="py-20 px-4 md:px-8 bg-white dark:bg-slate-950">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">Our Services</h2>
                <div className="w-16 h-1.5 bg-brand-green mx-auto rounded-full"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-8 border border-slate-100 dark:border-slate-800 hover:shadow-xl hover:shadow-brand-green/5 transition group">
                  <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-3xl">🏍️</div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Bike-Taxi</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed">Beat the traffic and arrive quicker with our speedy bike-taxi service. Perfect for solo commuters.</p>
                  <span className="text-brand-green text-xs font-bold uppercase tracking-wider bg-brand-green/10 px-3 py-1 rounded-full">⚡ Speedy Transit</span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-8 border border-slate-100 dark:border-slate-800 hover:shadow-xl hover:shadow-brand-green/5 transition group">
                  <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-3xl">🛺</div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Auto</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed">Everyday rides made easy. Affordable auto-rickshaws for you and your companions.</p>
                  <span className="text-brand-green text-xs font-bold uppercase tracking-wider bg-brand-green/10 px-3 py-1 rounded-full">✨ Pocket Friendly</span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-8 border border-slate-100 dark:border-slate-800 hover:shadow-xl hover:shadow-brand-green/5 transition group">
                  <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-3xl">🚗</div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Cab</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed">Premium comfort for every journey. Travel in style with our well-maintained cabs.</p>
                  <span className="text-brand-green text-xs font-bold uppercase tracking-wider bg-brand-green/10 px-3 py-1 rounded-full">⭐ Premium Comfort</span>
                </div>
              </div>
            </div>
          </section>

          {/* About Us Section */}
          <section id="about" className="py-20 px-4 md:px-8 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <span className="text-brand-green text-xs font-bold uppercase tracking-wider bg-brand-green/10 px-4 py-1.5 rounded-full border border-brand-green/20">
                  Who We Are
                </span>
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-4 mb-3 tracking-tight">About RideNow</h2>
                <div className="w-16 h-1.5 bg-brand-green mx-auto rounded-full"></div>
                <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mt-4 text-base leading-relaxed">
                  RideNow is India’s next-generation urban mobility platform connecting millions of riders with verified bike-taxi, auto-rickshaw, and cab captains for fast, affordable, and safe daily commutes.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md transition">
                  <div className="w-12 h-12 bg-brand-green/10 text-brand-green rounded-xl flex items-center justify-center font-bold text-xl mb-6">🚀</div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Our Mission</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">To make everyday urban commuting seamless, ultra-affordable, and accessible for everyone across cities.</p>
                </div>

                <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md transition">
                  <div className="w-12 h-12 bg-brand-green/10 text-brand-green rounded-xl flex items-center justify-center font-bold text-xl mb-6">⚡</div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Zero Surges</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">Fair & transparent pricing algorithms without unpredictable surge multipliers during peak hours.</p>
                </div>

                <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md transition">
                  <div className="w-12 h-12 bg-brand-green/10 text-brand-green rounded-xl flex items-center justify-center font-bold text-xl mb-6">🤝</div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Empowering Captains</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">Providing competitive earnings, instant payouts, and flexible work opportunities for our driver partners.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Safety Section */}
          <section id="safety" className="py-20 px-4 md:px-8 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <span className="text-brand-green text-xs font-bold uppercase tracking-wider bg-brand-green/10 px-4 py-1.5 rounded-full border border-brand-green/20">
                  Your Protection First
                </span>
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-4 mb-3 tracking-tight">Safety & Security</h2>
                <div className="w-16 h-1.5 bg-brand-green mx-auto rounded-full"></div>
                <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mt-4 text-base leading-relaxed">
                  Your safety is our highest priority on every single trip. We implement end-to-end security measures from booking to dropoff.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 bg-brand-green text-white rounded-lg flex items-center justify-center mb-4 font-bold">🛡️</div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1">Verified Captains</h4>
                  <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">Background checks, driving record verifications, and police verification for every driver.</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 bg-brand-green text-white rounded-lg flex items-center justify-center mb-4 font-bold">📍</div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1">Live GPS Tracking</h4>
                  <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">Share your real-time ride location with family & trusted contacts anytime during the ride.</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 bg-brand-green text-white rounded-lg flex items-center justify-center mb-4 font-bold">🔐</div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1">Secure OTP Verification</h4>
                  <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">Ride starts only after sharing your unique start OTP with your assigned captain.</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 bg-red-500 text-white rounded-lg flex items-center justify-center mb-4 font-bold">🚨</div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1">24/7 SOS Emergency</h4>
                  <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">Instant emergency button to alert our rapid safety response team and local emergency services.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Contact Us Section */}
          <section id="contact" className="py-20 px-4 md:px-8 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <span className="text-brand-green text-xs font-bold uppercase tracking-wider bg-brand-green/10 px-4 py-1.5 rounded-full border border-brand-green/20">
                  Get In Touch
                </span>
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-4 mb-3 tracking-tight">Contact Support</h2>
                <div className="w-16 h-1.5 bg-brand-green mx-auto rounded-full"></div>
                <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mt-4 text-base leading-relaxed">
                  Have questions or need assistance with a ride? Our support team is here to help 24/7.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm text-center">
                  <div className="w-12 h-12 bg-brand-green/10 text-brand-green rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">📞</div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1">Call Us</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mb-3">24/7 Customer Care Helpline</p>
                  <p className="text-brand-green font-bold text-base">+91 1800-RIDENOW</p>
                </div>

                <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm text-center">
                  <div className="w-12 h-12 bg-brand-green/10 text-brand-green rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">✉️</div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1">Email Support</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mb-3">For ride queries & feedback</p>
                  <p className="text-brand-green font-bold text-base">support@ridenow.app</p>
                </div>

                <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm text-center">
                  <div className="w-12 h-12 bg-brand-green/10 text-brand-green rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">📍</div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1">Headquarters</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mb-3">Corporate Office</p>
                  <p className="text-slate-800 dark:text-slate-200 font-semibold text-sm">RideNow Tech Park, Visakhapatnam, AP, India</p>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : step === 2 ? (
        /* STEP 2: Service Selection & Map */
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12">
          <button
            onClick={resetBooking}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-semibold mb-6 transition"
          >
            <ArrowRight className="w-4 h-4 rotate-180" /> Back to Search
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Map & Route Info */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[500px] lg:h-[600px]">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-brand-green mt-1.5 shrink-0 shadow-sm"></div>
                  <div className="truncate">
                    <p className="text-[10px] font-bold text-brand-green uppercase tracking-wider">Pickup</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{pickup}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0 shadow-sm"></div>
                  <div className="truncate">
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Drop</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{drop}</p>
                  </div>
                </div>
              </div>

              <div ref={mapContainerRef} className="flex-1 w-full bg-slate-100 dark:bg-slate-800 relative">
                {/* Map renders here */}
                <div className="absolute top-4 left-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-md rounded-xl p-3 flex justify-around z-10 text-sm font-bold border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                  <div className="flex items-center gap-2">
                    <Navigation2 className="w-4 h-4 text-brand-green" />
                    <span>{distanceText}</span>
                  </div>
                  <div className="w-px bg-slate-300 dark:bg-slate-700"></div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-brand-green" />
                    <span>{durationText}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Service Selection */}
            <div className="flex flex-col h-[500px] lg:h-[600px]">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 flex-1 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Select Service</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Choose the ride that fits your needs</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-slate-50/30 dark:bg-slate-900/30">
                  {/* Bike */}
                  <label className={`cursor-pointer rounded-xl border-2 transition-all p-4 flex items-center justify-between ${selectedService === 'BIKE' ? 'border-brand-green bg-green-50/50 dark:bg-green-950/30' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-brand-green/30'}`}>
                    <input type="radio" name="service" className="hidden" checked={selectedService === 'BIKE'} onChange={() => setSelectedService('BIKE')} />
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">🏍️</div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">Bike</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Quick & affordable</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-slate-900 dark:text-white">₹{estimates['BIKE']?.toFixed(0) || '---'}</div>
                      <p className="text-xs text-brand-green font-semibold">{durationText}</p>
                    </div>
                  </label>

                  {/* Auto */}
                  <label className={`cursor-pointer rounded-xl border-2 transition-all p-4 flex items-center justify-between ${selectedService === 'AUTO' ? 'border-brand-green bg-green-50/50 dark:bg-green-950/30' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-brand-green/30'}`}>
                    <input type="radio" name="service" className="hidden" checked={selectedService === 'AUTO'} onChange={() => setSelectedService('AUTO')} />
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">🛺</div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">Auto</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Everyday rides</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-slate-900 dark:text-white">₹{estimates['AUTO']?.toFixed(0) || '---'}</div>
                      <p className="text-xs text-brand-green font-semibold">{durationText}</p>
                    </div>
                  </label>

                  {/* Cab */}
                  <label className={`cursor-pointer rounded-xl border-2 transition-all p-4 flex items-center justify-between ${selectedService === 'CAB' ? 'border-brand-green bg-green-50/50 dark:bg-green-950/30' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-brand-green/30'}`}>
                    <input type="radio" name="service" className="hidden" checked={selectedService === 'CAB'} onChange={() => setSelectedService('CAB')} />
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">🚗</div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">Cab</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Premium comfort</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-slate-900 dark:text-white">₹{estimates['CAB']?.toFixed(0) || '---'}</div>
                      <p className="text-xs text-brand-green font-semibold">{durationText}</p>
                    </div>
                  </label>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={handleContinueToPayment}
                    disabled={bookingLoading}
                    className="w-full bg-brand-green hover:bg-green-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-brand-green/20 transition disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {bookingLoading ? 'Processing...' : 'Continue to Payment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* STEP 3: Payment & Confirmation */
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 md:py-16">
          <button
            onClick={() => setStep(2)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-semibold mb-6 transition"
          >
            <ArrowRight className="w-4 h-4 rotate-180" /> Back to Vehicles
          </button>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 p-6 md:p-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-100 dark:border-slate-800 pb-4 flex items-center gap-3">
              <ShieldCheck className="text-brand-green w-8 h-8" />
              Confirm Booking
            </h2>

            {bookingError && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-semibold flex items-start gap-3">
                ⚠️ {bookingError}
              </div>
            )}

            <div className="space-y-6">
              {/* Route Summary */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full bg-brand-green mt-1"></div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pickup</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{pickup}</p>
                    </div>
                  </div>
                  <div className="w-0.5 h-6 bg-slate-300 ml-1.5 -my-2"></div>
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500 mt-1"></div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dropoff</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{drop}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trip Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Service</p>
                  <p className="font-bold text-slate-900 text-lg">{getServiceLabel()}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Total Fare</p>
                  <p className="font-bold text-brand-green text-xl">₹{estimates[selectedService]?.toFixed(2) || '0.00'}</p>
                </div>
              </div>

              {/* Payment Section */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Payment Method</h4>
                  <button 
                    onClick={() => setIsChangingMethod(!isChangingMethod)} 
                    className="text-sm font-bold text-brand-green hover:text-green-700 transition"
                  >
                    {isChangingMethod ? 'Cancel' : 'Change'}
                  </button>
                </div>

                <div className="p-4 bg-white">
                  {isChangingMethod ? (
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          type="button"
                          onClick={() => {
                            setPaymentPreference('RAZORPAY');
                            setPaymentMethodName('Razorpay Online (UPI, Cards, Netbanking)');
                          }}
                          className={`py-3 flex flex-col items-center gap-1.5 rounded-xl border-2 transition ${paymentPreference === 'RAZORPAY' ? 'border-brand-green bg-green-50' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                          <CreditCard className={paymentPreference === 'RAZORPAY' ? 'text-brand-green' : 'text-slate-500'} />
                          <span className={`text-xs font-bold ${paymentPreference === 'RAZORPAY' ? 'text-brand-green' : 'text-slate-600'}`}>Razorpay Online</span>
                        </button>

                        <button 
                          type="button"
                          onClick={() => {
                            setPaymentPreference('CARD');
                            setPaymentMethodName(savedCards.length > 0 ? `Card (${savedCards[0].brand.toUpperCase()} ****${savedCards[0].last4})` : 'Card (VISA ****4242)');
                          }}
                          className={`py-3 flex flex-col items-center gap-1.5 rounded-xl border-2 transition ${paymentPreference === 'CARD' ? 'border-brand-green bg-green-50' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                          <CreditCard className={paymentPreference === 'CARD' ? 'text-brand-green' : 'text-slate-500'} />
                          <span className={`text-xs font-bold ${paymentPreference === 'CARD' ? 'text-brand-green' : 'text-slate-600'}`}>Stripe Card</span>
                        </button>
                        
                        <button 
                          type="button"
                          onClick={() => {
                            setPaymentPreference('UPI');
                            setPaymentMethodName(upiId ? `UPI (${upiId})` : 'UPI (Registered)');
                          }}
                          className={`py-3 flex flex-col items-center gap-1.5 rounded-xl border-2 transition ${paymentPreference === 'UPI' ? 'border-brand-green bg-green-50' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                          <Smartphone className={paymentPreference === 'UPI' ? 'text-brand-green' : 'text-slate-500'} />
                          <span className={`text-xs font-bold ${paymentPreference === 'UPI' ? 'text-brand-green' : 'text-slate-600'}`}>Direct UPI</span>
                        </button>

                        <button 
                          type="button"
                          onClick={() => {
                            setPaymentPreference('CASH');
                            setPaymentMethodName('Cash (Pay Captain)');
                          }}
                          className={`py-3 flex flex-col items-center gap-1.5 rounded-xl border-2 transition ${paymentPreference === 'CASH' ? 'border-brand-green bg-green-50' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                          <Banknote className={paymentPreference === 'CASH' ? 'text-brand-green' : 'text-slate-500'} />
                          <span className={`text-xs font-bold ${paymentPreference === 'CASH' ? 'text-brand-green' : 'text-slate-600'}`}>Cash</span>
                        </button>
                      </div>

                      {paymentPreference === 'UPI' && (
                        <div>
                          <input 
                            type="text"
                            placeholder="Enter UPI ID (e.g. username@bank)"
                            value={upiId}
                            onChange={(e) => {
                              setUpiId(e.target.value);
                              setPaymentMethodName(`UPI (${e.target.value})`);
                            }}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {paymentPreference === 'CARD' ? <CreditCard className="text-brand-green" /> : paymentPreference === 'UPI' ? <Smartphone className="text-brand-green" /> : <Banknote className="text-brand-green" />}
                      <span className="font-bold text-slate-800">{paymentMethodName}</span>
                      <CheckCircle className="ml-auto text-brand-green w-5 h-5" />
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={confirmBooking}
                disabled={bookingLoading}
                className="w-full bg-brand-navy hover:bg-slate-800 text-white py-4 rounded-xl font-bold text-lg shadow-lg transition disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-4"
              >
                {bookingLoading ? (
                  <><span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span> Confirming...</>
                ) : (
                  'Pay & Confirm Ride'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
