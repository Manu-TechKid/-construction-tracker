import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { logout } from '../../features/auth/authSlice';

// Compute API base URL
// - If REACT_APP_API_URL is provided, use it (useful for local dev)
// - Otherwise, default to same-origin '/api/v1' so the built client on Render calls the backend it was served from
const apiBaseUrl =
  process.env.REACT_APP_API_URL ||
  (typeof window !== 'undefined' ? `${window.location.origin}/api/v1` : '/api/v1');

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
  baseQuery: async (args, api, extraOptions) => {
    const result = await baseQuery(args, api, extraOptions);
    
    // Handle 401 Unauthorized errors (e.g., token expired)
    if (result.error?.status === 401) {
      // You could add token refresh logic here if needed
      console.log('Unauthorized - logging out...');
      // Dispatch logout action
      api.dispatch(logout());
    }
    
    return result;
  },
  tagTypes: ['Building', 'WorkOrder', 'Worker', 'User'],
  endpoints: (builder) => ({}),
});
