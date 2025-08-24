import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { logout } from '../../features/auth/authSlice';

// Create base query with auth headers
const baseQuery = fetchBaseQuery({
  baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1',
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
