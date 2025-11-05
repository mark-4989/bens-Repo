// frontend/src/config.js

// Check if we're in development or production
const isDevelopment = import.meta.env.DEV;

// Use environment variable or fallback
export const backendUrl = import.meta.env.VITE_BACKEND_URL || 
  (isDevelopment 
    ? 'http://localhost:4000' 
    : 'https://foreverecommerce-2.onrender.com'
  );

console.log('🔗 Backend URL:', backendUrl);