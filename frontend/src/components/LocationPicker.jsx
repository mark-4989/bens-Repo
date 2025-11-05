import React, { useState, useEffect, useRef } from 'react';

const LocationPicker = ({ onLocationSelect, onClose, initialLocation }) => {
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationType, setLocationType] = useState('pin');
  const [searchQuery, setSearchQuery] = useState('');
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const mapboxToken = 'pk.eyJ1IjoiY2hlZmRyZWR6IiwiYSI6ImNtaDRwY2JhZzFvYXFmMXNiOTVmYnQ5aHkifQ.wdXtoBRNl0xYhiPAZxDRjA'; // Replace with your Mapbox token

  useEffect(() => {
    loadMapbox();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const loadMapbox = async () => {
    // Load Mapbox CSS
    if (!document.querySelector('#mapbox-css')) {
      const link = document.createElement('link');
      link.id = 'mapbox-css';
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    // Load Mapbox JS
    if (!window.mapboxgl) {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
      script.onload = initializeMap;
      document.head.appendChild(script);
    } else {
      initializeMap();
    }
  };

  const initializeMap = () => {
    if (!window.mapboxgl || !mapContainerRef.current || mapRef.current) return;

    window.mapboxgl.accessToken = mapboxToken;

    const defaultCenter = initialLocation 
      ? [initialLocation.lng, initialLocation.lat]
      : [36.8219, -1.2921]; // Nairobi

    const map = new window.mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: defaultCenter,
      zoom: 14
    });

    map.addControl(new window.mapboxgl.NavigationControl(), 'top-right');
    map.addControl(new window.mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true
    }), 'top-right');

    map.on('load', () => {
      mapRef.current = map;

      // Add click handler for pin mode
      map.on('click', (e) => {
        if (locationType === 'pin') {
          const { lng, lat } = e.lngLat;
          handleLocationSelect({ lng, lat });
        }
      });

      // Set initial marker if location provided
      if (initialLocation) {
        updateMarker(initialLocation);
        reverseGeocode(initialLocation);
      }
    });
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    updateMarker(location);
    reverseGeocode(location);
  };

  const updateMarker = (location) => {
    if (!mapRef.current) return;

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Create custom marker element
    const el = document.createElement('div');
    el.innerHTML = '📍';
    el.style.fontSize = '40px';
    el.style.cursor = 'pointer';

    // Add new marker
    markerRef.current = new window.mapboxgl.Marker({
      element: el,
      draggable: locationType === 'pin'
    })
      .setLngLat([location.lng, location.lat])
      .addTo(mapRef.current);

    // Handle marker drag
    markerRef.current.on('dragend', () => {
      const lngLat = markerRef.current.getLngLat();
      handleLocationSelect({ lng: lngLat.lng, lat: lngLat.lat });
    });

    // Pan to location
    mapRef.current.flyTo({ center: [location.lng, location.lat], zoom: 15 });
  };

  const reverseGeocode = async (location) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${location.lng},${location.lat}.json?access_token=${mapboxToken}`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        setAddress(data.features[0].place_name);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      setAddress('Unable to get address');
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setLocationType('current');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lng: position.coords.longitude,
          lat: position.coords.latitude
        };
        handleLocationSelect(location);
        setLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to get your location. Please enable location services and try again.');
        setLoading(false);
        setLocationType('pin');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setLocationType('address');

    try {
      // Add Kenya bias to search
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?country=KE&proximity=36.8219,-1.2921&access_token=${mapboxToken}`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        const location = { lng, lat };
        handleLocationSelect(location);
        setAddress(data.features[0].place_name);
      } else {
        alert('Address not found. Please try a different search.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Failed to search address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedLocation) {
      alert('Please select a delivery location');
      return;
    }

    onLocationSelect({
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      address,
      type: locationType
    });
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}>×</button>

        <div style={styles.header}>
          <h2 style={styles.title}>📍 Select Delivery Location</h2>
          <p style={styles.subtitle}>Choose where you'd like your order delivered</p>
        </div>

        {/* Location Type Buttons */}
        <div style={styles.typeSelector}>
          <button
            style={{
              ...styles.typeBtn,
              ...(locationType === 'current' ? styles.typeBtnActive : {})
            }}
            onClick={handleUseCurrentLocation}
            disabled={loading}
          >
            <span style={styles.typeBtnIcon}>📱</span>
            <span>My Location</span>
          </button>
          <button
            style={{
              ...styles.typeBtn,
              ...(locationType === 'pin' ? styles.typeBtnActive : {})
            }}
            onClick={() => setLocationType('pin')}
          >
            <span style={styles.typeBtnIcon}>📌</span>
            <span>Pin on Map</span>
          </button>
        </div>

        {/* Address Search */}
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search for a place in Kenya..."
            style={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            style={styles.searchBtn}
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
          >
            {loading ? '⏳' : '🔍'} Search
          </button>
        </div>

        {/* Map */}
        <div ref={mapContainerRef} style={styles.map}></div>

        {/* Selected Address */}
        {selectedLocation && (
          <div style={styles.addressDisplay}>
            <div style={styles.addressHeader}>
              <span style={styles.addressIcon}>📍</span>
              <div style={styles.addressContent}>
                <div style={styles.addressLabel}>Selected Location</div>
                <div style={styles.addressText}>{address || 'Loading address...'}</div>
                <div style={styles.coordinates}>
                  {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div style={styles.instructions}>
          {locationType === 'pin' && (
            <p>💡 Tap anywhere on the map to set your delivery location, or drag the pin</p>
          )}
          {locationType === 'current' && (
            <p>✅ Using your current location for delivery</p>
          )}
          {locationType === 'address' && (
            <p>✅ Delivery location set from searched address</p>
          )}
        </div>

        {/* Action Buttons */}
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            style={styles.confirmBtn}
            onClick={handleConfirm}
            disabled={!selectedLocation || loading}
          >
            {loading ? '⏳ Loading...' : '✓ Confirm Location'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px',
    backdropFilter: 'blur(4px)'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '900px',
    maxHeight: '95vh',
    overflow: 'auto',
    position: 'relative',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
  },
  closeBtn: {
    position: 'absolute',
    top: '15px',
    right: '15px',
    background: 'white',
    border: 'none',
    fontSize: '28px',
    color: '#666',
    cursor: 'pointer',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
  },
  header: {
    padding: '24px',
    borderBottom: '2px solid #e9ecef'
  },
  title: {
    margin: 0,
    fontSize: '24px',
    color: '#212529',
    fontWeight: '600'
  },
  subtitle: {
    margin: '8px 0 0 0',
    fontSize: '14px',
    color: '#6c757d'
  },
  typeSelector: {
    display: 'flex',
    gap: '12px',
    padding: '20px',
    flexWrap: 'wrap'
  },
  typeBtn: {
    flex: 1,
    minWidth: '150px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px 20px',
    border: '2px solid #e9ecef',
    borderRadius: '12px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  typeBtnActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
    color: '#2e7d32'
  },
  typeBtnIcon: {
    fontSize: '20px'
  },
  searchContainer: {
    display: 'flex',
    gap: '12px',
    padding: '0 20px 20px'
  },
  searchInput: {
    flex: 1,
    padding: '14px 16px',
    border: '2px solid #e9ecef',
    borderRadius: '12px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  searchBtn: {
    padding: '14px 28px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  map: {
    width: '100%',
    height: '400px',
    borderTop: '2px solid #e9ecef',
    borderBottom: '2px solid #e9ecef'
  },
  addressDisplay: {
    padding: '20px',
    backgroundColor: '#f8f9fa'
  },
  addressHeader: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start'
  },
  addressIcon: {
    fontSize: '32px'
  },
  addressContent: {
    flex: 1
  },
  addressLabel: {
    fontSize: '12px',
    color: '#6c757d',
    marginBottom: '6px',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  addressText: {
    fontSize: '16px',
    color: '#212529',
    marginBottom: '8px',
    fontWeight: '500'
  },
  coordinates: {
    fontSize: '12px',
    color: '#6c757d',
    fontFamily: 'monospace'
  },
  instructions: {
    padding: '20px',
    backgroundColor: '#fff3cd',
    borderTop: '3px solid #ffc107',
    borderBottom: '3px solid #ffc107'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    padding: '20px',
    justifyContent: 'flex-end'
  },
  cancelBtn: {
    padding: '14px 32px',
    backgroundColor: '#f1f3f5',
    color: '#495057',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  confirmBtn: {
    padding: '14px 32px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s'
  }
};

export default LocationPicker;