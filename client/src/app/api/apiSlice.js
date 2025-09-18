import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// API configuration
const API_BASE_URL = 'https://construction-tracker-webapp.onrender.com';

// Create base query with auth headers
const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
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
