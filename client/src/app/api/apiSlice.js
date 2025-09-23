import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Compute API base URL
// - If REACT_APP_API_URL is provided, use it (useful for local dev)
// - For local development, use localhost
// - For production, use the deployed backend
const apiBaseUrl =
  process.env.REACT_APP_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api/v1'
    : (typeof window !== 'undefined' ? window.location.origin + '/api/v1' : ''));

console.log('API Base URL:', apiBaseUrl);
console.log('Environment:', process.env.NODE_ENV);
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);

// Create base query with auth headers
const baseQuery = fetchBaseQuery({
  baseUrl: apiBaseUrl,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const apiSlice = createApi({
  // Use baseQuery directly; avoid global auto-logout on any 401 to prevent
  // redirect flashes during app boot. Individual components can handle 401s.
  baseQuery,
  tagTypes: ['Building', 'WorkOrder', 'Worker', 'Reminder', 'Invoice', 'Schedule', 'Note'],
  endpoints: (builder) => ({}),
});
