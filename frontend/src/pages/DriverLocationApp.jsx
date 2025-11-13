import React, { useState, useEffect, useRef } from 'react';

const DriverLocationApp = () => {
  const [driverId, setDriverId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [heading, setHeading] = useState(0);
  const [logs, setLogs] = useState([]);
  const watchIdRef = useRef(null);
  const lastLocationRef = useRef(null);
  const lastTimeRef = useRef(null);

  const backendUrl = 'https://foreverecommerce-2.onrender.com';

  // Add log message
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{timestamp, message, type}, ...prev.slice(0, 20)]);
  };

  // Calculate speed between two points
  const calculateSpeed = (lat1, lng1, lat2, lng2, timeDiff) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    const timeInHours = timeDiff / 3600000; // Convert ms to hours
    return (distance / timeInHours).toFixed(2); // Speed in km/h
  };

  // Calculate heading
  const calculateHeading = (lat1, lng1, lat2, lng2) => {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng);
    let heading = Math.atan2(y, x) * 180 / Math.PI;
    return (heading + 360) % 360;
  };

  // Update location to backend
  const updateLocationToBackend = async (position) => {
    const currentLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy
    };

    setLocation(currentLocation);

    // Calculate speed and heading if we have previous location
    let calculatedSpeed = 0;
    let calculatedHeading = heading;

    if (lastLocationRef.current && lastTimeRef.current) {
      const timeDiff = Date.now() - lastTimeRef.current;
      if (timeDiff > 0) {
        calculatedSpeed = calculateSpeed(
          lastLocationRef.current.lat,
          lastLocationRef.current.lng,
          currentLocation.lat,
          currentLocation.lng,
          timeDiff
        );
        calculatedHeading = calculateHeading(
          lastLocationRef.current.lat,
          lastLocationRef.current.lng,
          currentLocation.lat,
          currentLocation.lng
        );
      }
    }

    setSpeed(calculatedSpeed);
    setHeading(calculatedHeading);

    lastLocationRef.current = currentLocation;
    lastTimeRef.current = Date.now();

    // Send to backend
    try {
      const response = await fetch(`${backendUrl}/api/tracking/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          driverId,
          currentLocation,
          speed: parseFloat(calculatedSpeed),
          heading: calculatedHeading,
          timestamp: new Date().toISOString()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        addLog(`✅ Location updated: ${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)} | Speed: ${calculatedSpeed} km/h`, 'success');
      } else {
        addLog(`❌ Update failed: ${data.message}`, 'error');
      }
    } catch (error) {
      addLog(`❌ Network error: ${error.message}`, 'error');
    }
  };

  // Start tracking
  const startTracking = () => {
    if (!driverId || !orderId) {
      alert('Please enter both Driver ID and Order ID');
      return;
    }

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    addLog('🚀 Starting location tracking...', 'info');
    setIsTracking(true);

    // Get initial location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateLocationToBackend(position);
        addLog('📍 Initial location obtained', 'success');
      },
      (error) => {
        addLog(`❌ Geolocation error: ${error.message}`, 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Watch position continuously
    watchIdRef.current = navigator.geolocation.watchPosition(
      updateLocationToBackend,
      (error) => {
        addLog(`❌ Watch position error: ${error.message}`, 'error');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000
      }
    );
  };

  // Stop tracking
  const stopTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    addLog('⏹️ Location tracking stopped', 'info');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🚗 Driver Location Tracker</h1>
        <p style={styles.subtitle}>Real-time GPS tracking for delivery drivers</p>

        {/* Input Section */}
        <div style={styles.inputSection}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>👤 Driver ID</label>
            <input
              type="text"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              placeholder="Enter your driver ID"
              style={styles.input}
              disabled={isTracking}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>📦 Order ID</label>
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="Enter order ID to track"
              style={styles.input}
              disabled={isTracking}
            />
          </div>
        </div>

        {/* Control Buttons */}
        <div style={styles.buttonGroup}>
          {!isTracking ? (
            <button
              onClick={startTracking}
              style={{...styles.button, ...styles.startButton}}
              disabled={!driverId || !orderId}
            >
              🚀 Start Tracking
            </button>
          ) : (
            <button
              onClick={stopTracking}
              style={{...styles.button, ...styles.stopButton}}
            >
              ⏹️ Stop Tracking
            </button>
          )}
        </div>

        {/* Status Display */}
        {isTracking && (
          <div style={styles.statusCard}>
            <div style={styles.statusHeader}>
              <span style={styles.liveIndicator}>
                <span style={styles.liveDot}></span>
                LIVE
              </span>
            </div>

            <div style={styles.statsGrid}>
              <div style={styles.statBox}>
                <div style={styles.statIcon}>📍</div>
                <div style={styles.statContent}>
                  <div style={styles.statLabel}>Latitude</div>
                  <div style={styles.statValue}>
                    {location?.lat.toFixed(6) || 'N/A'}
                  </div>
                </div>
              </div>

              <div style={styles.statBox}>
                <div style={styles.statIcon}>🌐</div>
                <div style={styles.statContent}>
                  <div style={styles.statLabel}>Longitude</div>
                  <div style={styles.statValue}>
                    {location?.lng.toFixed(6) || 'N/A'}
                  </div>
                </div>
              </div>

              <div style={styles.statBox}>
                <div style={styles.statIcon}>⚡</div>
                <div style={styles.statContent}>
                  <div style={styles.statLabel}>Speed</div>
                  <div style={styles.statValue}>{speed} km/h</div>
                </div>
              </div>

              <div style={styles.statBox}>
                <div style={styles.statIcon}>🧭</div>
                <div style={styles.statContent}>
                  <div style={styles.statLabel}>Heading</div>
                  <div style={styles.statValue}>{heading.toFixed(0)}°</div>
                </div>
              </div>

              <div style={styles.statBox}>
                <div style={styles.statIcon}>🎯</div>
                <div style={styles.statContent}>
                  <div style={styles.statLabel}>Accuracy</div>
                  <div style={styles.statValue}>
                    {location?.accuracy.toFixed(0) || 'N/A'}m
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Logs */}
        <div style={styles.logsSection}>
          <h3 style={styles.logsTitle}>📊 Activity Logs</h3>
          <div style={styles.logsContainer}>
            {logs.length === 0 ? (
              <p style={styles.noLogs}>No activity yet. Start tracking to see logs.</p>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  style={{
                    ...styles.logItem,
                    ...(log.type === 'error' ? styles.logError : {}),
                    ...(log.type === 'success' ? styles.logSuccess : {})
                  }}
                >
                  <span style={styles.logTime}>{log.timestamp}</span>
                  <span style={styles.logMessage}>{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div style={styles.instructions}>
          <h4 style={styles.instructionsTitle}>📋 Instructions</h4>
          <ol style={styles.instructionsList}>
            <li>Enter your Driver ID (provided by admin)</li>
            <li>Enter the Order ID you're delivering</li>
            <li>Click "Start Tracking" to begin GPS tracking</li>
            <li>Keep this page open while delivering</li>
            <li>Your location updates automatically every few seconds</li>
            <li>Click "Stop Tracking" when delivery is complete</li>
          </ol>
          <p style={styles.note}>
            ⚠️ Note: This app needs location permissions. Make sure GPS is enabled on your device.
          </p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  card: {
    maxWidth: '800px',
    margin: '0 auto',
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '20px',
    padding: '32px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '32px',
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center'
  },
  subtitle: {
    margin: '0 0 32px 0',
    fontSize: '16px',
    color: '#666',
    textAlign: 'center'
  },
  inputSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '24px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333'
  },
  input: {
    padding: '14px 16px',
    border: '2px solid #e0e0e0',
    borderRadius: '12px',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px'
  },
  button: {
    flex: 1,
    padding: '16px 24px',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  startButton: {
    background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
    color: 'white'
  },
  stopButton: {
    background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
    color: 'white'
  },
  statusCard: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    color: 'white'
  },
  statusHeader: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px'
  },
  liveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255, 255, 255, 0.2)',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '700'
  },
  liveDot: {
    width: '10px',
    height: '10px',
    background: '#ff4444',
    borderRadius: '50%',
    animation: 'pulse 2s infinite'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px'
  },
  statBox: {
    background: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  statIcon: {
    fontSize: '32px'
  },
  statContent: {
    flex: 1
  },
  statLabel: {
    fontSize: '11px',
    opacity: 0.9,
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statValue: {
    fontSize: '16px',
    fontWeight: '700'
  },
  logsSection: {
    marginBottom: '24px'
  },
  logsTitle: {
    margin: '0 0 12px 0',
    fontSize: '18px',
    fontWeight: '700',
    color: '#1a1a1a'
  },
  logsContainer: {
    background: '#f5f5f5',
    borderRadius: '12px',
    padding: '16px',
    maxHeight: '300px',
    overflowY: 'auto'
  },
  noLogs: {
    textAlign: 'center',
    color: '#999',
    fontSize: '14px',
    fontStyle: 'italic'
  },
  logItem: {
    padding: '10px 12px',
    marginBottom: '8px',
    background: 'white',
    borderRadius: '8px',
    fontSize: '13px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    borderLeft: '3px solid #667eea'
  },
  logError: {
    borderLeftColor: '#f44336',
    background: '#ffebee'
  },
  logSuccess: {
    borderLeftColor: '#4CAF50',
    background: '#e8f5e9'
  },
  logTime: {
    fontSize: '11px',
    color: '#666',
    fontFamily: 'monospace',
    whiteSpace: 'nowrap'
  },
  logMessage: {
    flex: 1,
    color: '#333'
  },
  instructions: {
    background: '#fff3cd',
    border: '2px solid #ffc107',
    borderRadius: '12px',
    padding: '20px'
  },
  instructionsTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: '700',
    color: '#856404'
  },
  instructionsList: {
    margin: '0 0 12px 0',
    paddingLeft: '24px',
    color: '#856404'
  },
  note: {
    margin: 0,
    fontSize: '13px',
    color: '#856404',
    fontStyle: 'italic'
  }
};

// Add pulse animation
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  `;
  if (!document.querySelector('#driver-tracker-animations')) {
    styleSheet.id = 'driver-tracker-animations';
    document.head.appendChild(styleSheet);
  }
}

export default DriverLocationApp;