// secureNetworking.js - Enforces HTTPS for all network requests

import { Platform } from 'react-native';

// Function to ensure all URLs use HTTPS
export const enforceHttps = (url) => {
  if (!url) return url;
  
  // If the URL starts with http://, replace it with https://
  if (url.startsWith('http://')) {
    console.warn('Insecure URL detected, upgrading to HTTPS');
    return url.replace('http://', 'https://');
  }
  
  return url;
};

// Create a secure fetch wrapper that enforces HTTPS
export const secureFetch = async (url, options = {}) => {
  const secureUrl = enforceHttps(url);
  
  // Add security headers
  const secureOptions = {
    ...options,
    headers: {
      ...options.headers,
      'Content-Security-Policy': "default-src 'self' https:",
    },
  };
  
  return fetch(secureUrl, secureOptions);
};

// Initialize secure networking
export const initSecureNetworking = () => {
  // Override the global fetch to use our secure version
  // This is a bit hacky but ensures all fetch calls are secure
  if (typeof global.originalFetch === 'undefined') {
    global.originalFetch = global.fetch;
    global.fetch = secureFetch;
    
    console.log('Secure networking initialized - HTTPS enforced for all requests');
  }
};
