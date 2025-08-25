import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

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
  // Use baseQuery directly; avoid global auto-logout on any 401 to prevent
  // redirect flashes during app boot. Individual components can handle 401s.
  baseQuery,
  tagTypes: ['Building', 'WorkOrder', 'Worker', 'Reminder', 'Invoice'],
  endpoints: (builder) => ({}),
});
