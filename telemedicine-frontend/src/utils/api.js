import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      // Log token presence (for debugging)
      console.log('Token found in localStorage, adding to request headers');
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('No authentication token found in localStorage');
    }
    return config;
  },
  (error) => {
    console.error('Error in request interceptor:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      console.error('Authentication error: Token expired or invalid');
      
      // Store the current path to redirect back after login
      const currentPath = window.location.pathname;
      if (currentPath !== '/') {
        localStorage.setItem('redirectPath', currentPath);
      }
      
      // Clear authentication data
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/') {
        // Show a brief message to the user
        alert('Your session has expired. Please login again.');
        window.location.href = '/';
      }
    }
    
    // Handle network errors
    if (error.message === 'Network Error') {
      console.error('Network error: Please check your connection');
    }
    
    return Promise.reject(error);
  }
);

// Enhanced get method with better error handling
api.safeGet = async (url, config = {}) => {
  try {
    return await api.get(url, config);
  } catch (error) {
    if (error.response) {
      // Server responded with a status code outside of 2xx range
      console.error(`Server error (${error.response.status}):`, error.response.data);
    } else if (error.request) {
      // Request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Error during request setup
      console.error('Request error:', error.message);
    }
    throw error;
  }
};

// Add utility function to check token validity
api.isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return !!token; // Return true if token exists, false otherwise
};

export default api;