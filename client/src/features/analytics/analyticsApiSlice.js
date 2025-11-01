import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const analyticsApiSlice = createApi({
  reducerPath: 'analyticsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.REACT_APP_API_URL || 'https://construction-tracker-webapp.onrender.com/api/v1',
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getDashboardStats: builder.query({
      query: (params) => ({
        url: '/analytics/dashboard',
        params
      }),
    }),
    getTimeTrackingAnalytics: builder.query({
      query: (params) => ({
        url: '/analytics/time-tracking',
        params
      }),
    }),
    getWorkOrderAnalytics: builder.query({
      query: (params) => ({
        url: '/analytics/work-orders',
        params
      }),
    }),
  }),
});

export const {
  useGetDashboardStatsQuery,
  useGetTimeTrackingAnalyticsQuery,
  useGetWorkOrderAnalyticsQuery,
} = analyticsApiSlice;