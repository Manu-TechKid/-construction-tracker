import { apiSlice } from '../../app/api/apiSlice';

export const analyticsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardStats: builder.query({
      query: (params = {}) => {
        const cleanParams = {};
        Object.keys(params || {}).forEach((key) => {
          const value = params[key];
          if (value !== undefined && value !== null && value !== '') {
            cleanParams[key] = value;
          }
        });

        return {
          url: '/analytics/dashboard',
          params: cleanParams,
        };
      },
      keepUnusedDataFor: 60,
    }),
    getTimeTrackingAnalytics: builder.query({
      query: (params = {}) => ({
        url: '/analytics/time-tracking',
        params,
      }),
    }),
    getWorkOrderAnalytics: builder.query({
      query: (params = {}) => ({
        url: '/analytics/work-orders',
        params,
      }),
    }),
  }),
});

export const {
  useGetDashboardStatsQuery,
  useGetTimeTrackingAnalyticsQuery,
  useGetWorkOrderAnalyticsQuery,
} = analyticsApiSlice;