import React, { useState, useEffect, useRef } from "react";

const LiveTracking = ({ orderId, onClose, getToken }) => {
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);

  const backendUrl = "https://foreverecommerce-2.onrender.com";
  const mapboxToken =
    "pk.eyJ1IjoiY2hlZmRyZWR6IiwiYSI6ImNtaDRwY2JhZzFvYXFmMXNiOTVmYnQ5aHkifQ.wdXtoBRNl0xYhiPAZxDRjA"; // Replace with your token

  // Load Mapbox
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const loadMapbox = async () => {
      // Load Mapbox CSS
      if (!document.querySelector("#mapbox-css")) {
        const link = document.createElement("link");
        link.id = "mapbox-css";
        link.href = "https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css";
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }

      // Load Mapbox JS
      if (!window.mapboxgl) {
        const script = document.createElement("script");
        script.src = "https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js";
        script.onload = initializeMap;
        document.head.appendChild(script);
      } else {
        initializeMap();
      }
    };

    loadMapbox();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const initializeMap = () => {
    if (!window.mapboxgl || mapRef.current) return;

    window.mapboxgl.accessToken = mapboxToken;

    const map = new window.mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [36.8219, -1.2921], // Nairobi [lng, lat]
      zoom: 13,
      attributionControl: false,
    });

    map.addControl(new window.mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      mapRef.current = map;
      fetchTrackingData();
    });
  };

  const fetchTrackingData = async () => {
    try {
      const token = await getToken({ template: "MilikiAPI" });
      const response = await fetch(`${backendUrl}/api/tracking/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      console.log("📍 Tracking response:", data); // Debug log

      if (data.success) {
        setTrackingData(data.tracking);
        updateMapMarkers(data.tracking);
        setLoading(false);
      } else {
        // ✅ If tracking not available, show helpful error
        console.error("Tracking error:", data.message);

        // Check if it's because order is not in transit
        if (data.message && data.message.includes("not currently in transit")) {
          setError(
            `This order is currently "${
              data.status || "being processed"
            }". Live tracking will be available once the order is "Cargo on Route".`
          );
        } else {
          setError(data.message || "Tracking not available for this order");
        }
        setLoading(false);
      }
    } catch (err) {
      console.error("Tracking fetch error:", err);

      // ✅ Better error message based on error type
      if (err.message.includes("404")) {
        setError("Tracking system not configured. Please contact support.");
      } else if (err.message.includes("Failed to fetch")) {
        setError(
          "Unable to connect to tracking service. Please check your internet connection."
        );
      } else {
        setError("Failed to load tracking data. Please try again later.");
      }
      setLoading(false);
    }
  };

  const updateMapMarkers = (tracking) => {
    if (!mapRef.current || !window.mapboxgl) return;

    const map = mapRef.current;

    // Remove existing markers
    if (driverMarkerRef.current) driverMarkerRef.current.remove();
    if (destinationMarkerRef.current) destinationMarkerRef.current.remove();

    // Create driver marker (green car icon)
    const driverEl = document.createElement("div");
    driverEl.innerHTML = "🚗";
    driverEl.style.fontSize = "32px";
    driverEl.style.cursor = "pointer";
    driverEl.style.transform = `rotate(${tracking.heading || 0}deg)`;

    driverMarkerRef.current = new window.mapboxgl.Marker({
      element: driverEl,
      anchor: "center",
    })
      .setLngLat([tracking.currentLocation.lng, tracking.currentLocation.lat])
      .setPopup(
        new window.mapboxgl.Popup({ offset: 25 }).setHTML(
          `<strong>Driver: ${tracking.driver.name}</strong><br/>Vehicle: ${tracking.driver.vehicle}`
        )
      )
      .addTo(map);

    // Create destination marker (red house icon)
    const destEl = document.createElement("div");
    destEl.innerHTML = "🏠";
    destEl.style.fontSize = "32px";
    destEl.style.cursor = "pointer";

    destinationMarkerRef.current = new window.mapboxgl.Marker({
      element: destEl,
      anchor: "bottom",
    })
      .setLngLat([tracking.destination.lng, tracking.destination.lat])
      .setPopup(
        new window.mapboxgl.Popup({ offset: 25 }).setHTML(
          "<strong>📍 Your Delivery Location</strong>"
        )
      )
      .addTo(map);

    // Draw route line
    const routeGeoJSON = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [tracking.currentLocation.lng, tracking.currentLocation.lat],
          [tracking.destination.lng, tracking.destination.lat],
        ],
      },
    };

    if (map.getSource("route")) {
      map.getSource("route").setData(routeGeoJSON);
    } else {
      map.addSource("route", {
        type: "geojson",
        data: routeGeoJSON,
      });

      map.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#4CAF50",
          "line-width": 4,
          "line-opacity": 0.8,
        },
      });
    }

    // Fit map to show both markers
    const bounds = new window.mapboxgl.LngLatBounds();
    bounds.extend([tracking.currentLocation.lng, tracking.currentLocation.lat]);
    bounds.extend([tracking.destination.lng, tracking.destination.lat]);
    map.fitBounds(bounds, { padding: 80, maxZoom: 15 });
  };

  // Poll for updates every 5 seconds
  useEffect(() => {
    if (!orderId || loading) return;

    const interval = setInterval(() => {
      fetchTrackingData();
    }, 5000);

    return () => clearInterval(interval);
  }, [orderId, loading]);

  const formatETA = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const callDriver = () => {
    if (trackingData?.driver?.phone) {
      window.location.href = `tel:${trackingData.driver.phone}`;
    }
  };

  if (loading) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.loader}>
            <div style={styles.spinner}></div>
            <p style={styles.loaderText}>Loading live tracking...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button style={styles.closeBtn} onClick={onClose}>
            ×
          </button>
          <div style={styles.errorContainer}>
            <div style={styles.errorIcon}>⚠️</div>
            <h3 style={styles.errorTitle}>Unable to Load Tracking</h3>
            <p style={styles.errorMessage}>{error}</p>
            <button style={styles.retryBtn} onClick={fetchTrackingData}>
              🔄 Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}>
          ×
        </button>

        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h2 style={styles.title}>🚚 Live Tracking</h2>
            <p style={styles.orderId}>
              Order #{orderId.slice(-8).toUpperCase()}
            </p>
          </div>
          <div style={styles.liveIndicator}>
            <span style={styles.liveDot}></span>
            LIVE
          </div>
        </div>

        {/* Map Container */}
        <div ref={mapContainerRef} style={styles.map}></div>

        {/* Tracking Info Panel */}
        {trackingData && (
          <div style={styles.infoPanel}>
            {/* ETA Card */}
            <div style={{ ...styles.infoCard, ...styles.etaCard }}>
              <div style={styles.etaIcon}>⏱️</div>
              <div>
                <div style={styles.etaLabel}>Estimated Arrival</div>
                <div style={styles.etaValue}>{formatETA(trackingData.eta)}</div>
              </div>
            </div>

            {/* Driver Info Grid */}
            <div style={styles.infoGrid}>
              <div style={styles.infoCard}>
                <span style={styles.cardIcon}>👤</span>
                <div>
                  <div style={styles.cardLabel}>Driver</div>
                  <div style={styles.cardValue}>{trackingData.driver.name}</div>
                </div>
              </div>

              <div style={styles.infoCard}>
                <span style={styles.cardIcon}>🚗</span>
                <div>
                  <div style={styles.cardLabel}>Vehicle</div>
                  <div style={styles.cardValue}>
                    {trackingData.driver.vehicle}
                  </div>
                </div>
              </div>

              {trackingData.speed > 0 && (
                <div style={styles.infoCard}>
                  <span style={styles.cardIcon}>⚡</span>
                  <div>
                    <div style={styles.cardLabel}>Speed</div>
                    <div style={styles.cardValue}>
                      {Math.round(trackingData.speed)} km/h
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Call Driver Button */}
            <button style={styles.callBtn} onClick={callDriver}>
              📞 Call Driver - {trackingData.driver.phone}
            </button>

            <div style={styles.lastUpdate}>
              🔄 Last updated:{" "}
              {new Date(trackingData.lastUpdated).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: "20px",
    backdropFilter: "blur(4px)",
  },
  modal: {
    backgroundColor: "white",
    borderRadius: "20px",
    width: "100%",
    maxWidth: "900px",
    maxHeight: "95vh",
    overflow: "hidden",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
  },
  closeBtn: {
    position: "absolute",
    top: "15px",
    right: "15px",
    background: "white",
    border: "none",
    fontSize: "28px",
    color: "#666",
    cursor: "pointer",
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    transition: "all 0.2s",
    fontWeight: "300",
  },
  header: {
    padding: "24px",
    background: "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)",
    color: "white",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
  },
  title: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "600",
  },
  orderId: {
    margin: "8px 0 0 0",
    fontSize: "14px",
    opacity: 0.9,
  },
  liveIndicator: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
  },
  liveDot: {
    width: "8px",
    height: "8px",
    backgroundColor: "#ff4444",
    borderRadius: "50%",
    animation: "pulse 2s infinite",
  },
  map: {
    width: "100%",
    height: "400px",
    flexShrink: 0,
  },
  infoPanel: {
    padding: "24px",
    backgroundColor: "#f8f9fa",
    overflowY: "auto",
    flexGrow: 1,
  },
  etaCard: {
    backgroundColor: "#4CAF50",
    color: "white",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "20px",
  },
  etaIcon: {
    fontSize: "36px",
  },
  etaLabel: {
    fontSize: "13px",
    opacity: 0.9,
    marginBottom: "4px",
  },
  etaValue: {
    fontSize: "28px",
    fontWeight: "700",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "12px",
    marginBottom: "16px",
  },
  infoCard: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px",
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
  },
  cardIcon: {
    fontSize: "28px",
  },
  cardLabel: {
    fontSize: "12px",
    color: "#6c757d",
    marginBottom: "4px",
  },
  cardValue: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#212529",
  },
  callBtn: {
    width: "100%",
    padding: "16px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
    marginBottom: "12px",
  },
  lastUpdate: {
    textAlign: "center",
    fontSize: "12px",
    color: "#6c757d",
  },
  loader: {
    padding: "60px 40px",
    textAlign: "center",
  },
  spinner: {
    width: "50px",
    height: "50px",
    margin: "0 auto 20px",
    border: "4px solid #f3f3f3",
    borderTop: "4px solid #4CAF50",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loaderText: {
    color: "#6c757d",
    fontSize: "16px",
  },
  errorContainer: {
    padding: "40px 20px",
    textAlign: "center",
  },
  errorIcon: {
    fontSize: "48px",
    marginBottom: "16px",
  },
  errorTitle: {
    color: "#212529",
    marginBottom: "8px",
  },
  errorMessage: {
    color: "#dc3545",
    marginBottom: "20px",
  },
  retryBtn: {
    padding: "12px 32px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
  },
};

// Add animations
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  `;
  if (!document.querySelector("#tracking-animations")) {
    styleSheet.id = "tracking-animations";
    document.head.appendChild(styleSheet);
  }
}

export default LiveTracking;
