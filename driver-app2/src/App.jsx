// App.jsx - Main Driver App Router
import React, { useState } from 'react';
import EcommerceDriverApp from './pages/Ecommercedriverapp';
import LiveTracking from './components/Livetracking';
import { ToastContainer } from 'react-toastify';



function App() {
  const [currentView, setCurrentView] = useState('driver'); // 'driver' or 'tracking'
  const [trackingOrderId, setTrackingOrderId] = useState(null);

  // Function to switch to live tracking view
  const openLiveTracking = (orderId) => {
    setTrackingOrderId(orderId);
    setCurrentView('tracking');
  };

  // Function to go back to driver app
  const closeLiveTracking = () => {
    setCurrentView('driver');
    setTrackingOrderId(null);
  };

  // Mock getToken function for LiveTracking (replace with actual Clerk implementation if needed)
  const getToken = async ({ template } = {}) => {
    // If using Clerk, replace with: return await clerk.session.getToken({ template });
    // For now, return the driver token from sessionStorage
    const session = sessionStorage.getItem('ecommerceDriverSession');
    if (session) {
      const { token } = JSON.parse(session);
      return token;
    }
    return null;
  };

  return (
    <div className="app-container">
      {currentView === 'driver' ? (
        <EcommerceDriverApp onOpenTracking={openLiveTracking} />
      ) : (
        <LiveTracking 
          orderId={trackingOrderId} 
          onClose={closeLiveTracking}
          getToken={getToken}
        />
      )}
      
      {/* Toast notifications - global */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  );
}

export default App;