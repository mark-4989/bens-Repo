import React, { useState, useEffect } from 'react';

const DriverTracking = () => {
  const [driverId, setDriverId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [watchId, setWatchId] = useState(null);

  const backendUrl = 'https://bens-repo-99lb.onrender.com';

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { message, type, timestamp }]);
    console.log(`${timestamp} ${type.toUpperCase()}: ${message}`);
  };

  const startTracking = () => {
    if (!driverId || !orderId) {
      setError('Please enter both Driver ID and Order ID');
      addLog('Missing Driver ID or Order ID', 'error');
      return;
    }

    if (!navigator.geolocation) {
      setError('❌ Geolocation is not supported by your browser');
      addLog('Geolocation not supported', 'error');
      return;
    }

    addLog('Requesting location permissions...', 'info');

    // Test if we can get location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        addLog('✅ Location permission granted', 'success');
        startWatchingPosition();
      },
      (err) => {
        let errorMessage = 'Failed to get location';
        
        switch(err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = "❌ Location permission denied. Please enable location access in your browser settings.";
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = "❌ Location unavailable. Make sure GPS is enabled on your device.";
            break;
          case err.TIMEOUT:
            errorMessage = "❌ Location request timed out. Please try again.";
            break;
          default:
            errorMessage = `❌ Location error: ${err.message}`;
        }
        
        setError(errorMessage);
        addLog(errorMessage, 'error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const startWatchingPosition = () => {
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, heading, accuracy } = position.coords;
        
        const locationData = {
          lat: latitude,
          lng: longitude,
          speed: speed ? Math.round(speed * 3.6) : 0, // Convert m/s to km/h
          heading: heading || 0,
          accuracy: accuracy,
          timestamp: new Date().toISOString()
        };

        setLocation(locationData);
        setIsTracking(true);
        setError(null);
        
        addLog(`📍 Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, 'success');
        
        // Send location to backend
        updateLocationOnServer(locationData);
      },
      (err) => {
        addLog(`❌ Watch position error: ${err.message}`, 'error');
        setError(`Location error: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
      }
    );

    setWatchId(id);
    addLog('🚀 Tracking started', 'success');
  };

  const updateLocationOnServer = async (locationData) => {
    try {
      // ✅ FIXED: Include orderId in URL path
      const url = `${backendUrl}/api/tracking/update/${orderId}`;
      
      addLog(`📡 Sending location to: ${url}`, 'info');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lat: locationData.lat,
          lng: locationData.lng,
          speed: locationData.speed,
          heading: locationData.heading,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error ${response.status}: ${errorText.substring(0, 100)}`);
      }

      const data = await response.json();
      
      if (data.success) {
        addLog('✅ Location updated on server', 'success');
      } else {
        addLog(`⚠️ Server response: ${data.message}`, 'warning');
      }
    } catch (err) {
      addLog(`❌ Failed to update server: ${err.message}`, 'error');
      console.error('Update error:', err);
    }
  };

  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
    setLocation(null);
    addLog('🛑 Tracking stopped', 'info');
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🚚 Driver Tracking App</h1>
        
        {/* Input Section */}
        <div style={styles.inputSection}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Driver ID</label>
            <input
              type="text"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              placeholder="Enter your Driver ID"
              style={styles.input}
              disabled={isTracking}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Order ID</label>
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="Enter Order ID"
              style={styles.input}
              disabled={isTracking}
            />
          </div>
        </div>

        {/* Buttons */}
        <div style={styles.buttonGroup}>
          {!isTracking ? (
            <button onClick={startTracking} style={{...styles.button, ...styles.startButton}}>
              🚀 Start Tracking
            </button>
          ) : (
            <button onClick={stopTracking} style={{...styles.button, ...styles.stopButton}}>
              🛑 Stop Tracking
            </button>
          )}
        </div>

        {/* Status Display */}
        {error && (
          <div style={{...styles.statusBox, ...styles.errorBox}}>
            {error}
          </div>
        )}

        {isTracking && location && (
          <div style={{...styles.statusBox, ...styles.successBox}}>
            <h3 style={styles.statusTitle}>📍 Current Location</h3>
            <p style={styles.statusText}>Latitude: {location.lat.toFixed(6)}</p>
            <p style={styles.statusText}>Longitude: {location.lng.toFixed(6)}</p>
            <p style={styles.statusText}>Speed: {location.speed} km/h</p>
            <p style={styles.statusText}>Accuracy: {location.accuracy?.toFixed(0)}m</p>
            <p style={styles.statusText}>Last Update: {new Date(location.timestamp).toLocaleTimeString()}</p>
          </div>
        )}

        {/* Activity Logs */}
        <div style={styles.logsSection}>
          <div style={styles.logsHeader}>
            <h3 style={styles.logsTitle}>📊 Activity Logs</h3>
            <button onClick={clearLogs} style={styles.clearButton}>Clear</button>
          </div>
          <div style={styles.logsContainer}>
            {logs.length === 0 ? (
              <p style={styles.noLogs}>No activity yet</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} style={{
                  ...styles.logItem,
                  ...(log.type === 'error' && styles.logError),
                  ...(log.type === 'success' && styles.logSuccess),
                  ...(log.type === 'warning' && styles.logWarning),
                }}>
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
            <li>Click "Start Tracking" to begin</li>
            <li>Allow location access when prompted</li>
            <li>Keep this page open during delivery</li>
            <li>Click "Stop Tracking" when delivery is complete</li>
          </ol>
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    maxWidth: '600px',
    margin: '0 auto',
    background: 'white',
    borderRadius: '20px',
    padding: '30px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  title: {
    textAlign: 'center',
    color: '#333',
    marginBottom: '30px',
    fontSize: '28px',
  },
  inputSection: {
    marginBottom: '20px',
  },
  inputGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#555',
    fontWeight: '600',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e0e0e0',
    borderRadius: '10px',
    fontSize: '16px',
    transition: 'border-color 0.3s',
    boxSizing: 'border-box',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
  },
  button: {
    flex: 1,
    padding: '14px',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  startButton: {
    background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
    color: 'white',
  },
  stopButton: {
    background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
    color: 'white',
  },
  statusBox: {
    padding: '20px',
    borderRadius: '10px',
    marginBottom: '20px',
  },
  errorBox: {
    background: '#ffebee',
    border: '2px solid #ef5350',
    color: '#c62828',
  },
  successBox: {
    background: '#e8f5e9',
    border: '2px solid #66bb6a',
    color: '#2e7d32',
  },
  statusTitle: {
    margin: '0 0 10px 0',
    fontSize: '18px',
  },
  statusText: {
    margin: '5px 0',
    fontSize: '14px',
  },
  logsSection: {
    marginTop: '20px',
  },
  logsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  logsTitle: {
    margin: 0,
    fontSize: '18px',
    color: '#333',
  },
  clearButton: {
    padding: '6px 12px',
    background: '#f5f5f5',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  logsContainer: {
    maxHeight: '200px',
    overflowY: 'auto',
    background: '#f9f9f9',
    borderRadius: '10px',
    padding: '10px',
  },
  noLogs: {
    textAlign: 'center',
    color: '#999',
    padding: '20px',
  },
  logItem: {
    padding: '8px 12px',
    marginBottom: '6px',
    borderRadius: '6px',
    background: 'white',
    fontSize: '13px',
  },
  logError: {
    borderLeft: '3px solid #f44336',
  },
  logSuccess: {
    borderLeft: '3px solid #4CAF50',
  },
  logWarning: {
    borderLeft: '3px solid #ff9800',
  },
  logTime: {
    color: '#666',
    marginRight: '10px',
    fontSize: '12px',
  },
  logMessage: {
    color: '#333',
  },
  instructions: {
    marginTop: '30px',
    padding: '20px',
    background: '#f5f5f5',
    borderRadius: '10px',
  },
  instructionsTitle: {
    margin: '0 0 15px 0',
    color: '#333',
    fontSize: '16px',
  },
  instructionsList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#666',
    fontSize: '14px',
    lineHeight: '1.8',
  },
};

export default DriverTracking;