import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('token') || '';
};

// Create API slice
export const timeTrackingApi = createApi({
  reducerPath: 'timeTrackingApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/workers',
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['TimeTracking', 'LocationHistory'],
  endpoints: (builder) => ({
    // Check in worker
    checkInWorker: builder.mutation({
      query: ({ workerId, ...body }) => ({
        url: `${workerId}/check-in`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TimeTracking'],
    }),

    // Check out worker
    checkOutWorker: builder.mutation({
      query: ({ workerId, ...body }) => ({
        url: `${workerId}/check-out`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TimeTracking'],
    }),

    // Record worker location
    recordWorkerLocation: builder.mutation({
      query: ({ workerId, ...body }) => ({
        url: `${workerId}/location`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['LocationHistory'],
    }),

    // Get worker status
    getWorkerStatus: builder.query({
      query: (workerId) => `${workerId}/status`,
      providesTags: ['TimeTracking'],
    }),

    // Get worker location history
    getWorkerLocationHistory: builder.query({
      query: ({ workerId, startDate, endDate, limit = 1000 }) => ({
        url: `${workerId}/location-history`,
        params: { startDate, endDate, limit },
      }),
      providesTags: ['LocationHistory'],
      transformResponse: (response) => {
        // Transform the response to match the expected format
        if (!response || !response.data) return [];
        
        return response.data.map(item => ({
          id: item._id,
          timestamp: item.timestamp,
          latitude: item.location.coordinates[1],
          longitude: item.location.coordinates[0],
          accuracy: item.accuracy,
          activity: item.activity,
          address: item.address,
          deviceInfo: item.deviceInfo,
        }));
      },
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useCheckInWorkerMutation,
  useCheckOutWorkerMutation,
  useRecordWorkerLocationMutation,
  useGetWorkerStatusQuery,
  useGetWorkerLocationHistoryQuery,
} = timeTrackingApi;
