import { apiSlice } from '../../app/api/apiSlice';

export const timeTrackingApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Clock in worker
    clockIn: builder.mutation({
      query: (formData) => ({
        url: '/time-tracking/clock-in',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['TimeSession', 'WorkerStatus']
    }),

    // Clock out worker
    clockOut: builder.mutation({
      query: (formData) => ({
        url: '/time-tracking/clock-out',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['TimeSession', 'WorkerStatus']
    }),

    // Get worker status
    getWorkerStatus: builder.query({
      query: (workerId) => `/time-tracking/status/${workerId}`,
      providesTags: ['WorkerStatus']
    }),

    // Start break
    startBreak: builder.mutation({
      query: (data) => ({
        url: '/time-tracking/break/start',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['TimeSession', 'WorkerStatus']
    }),

    // End break
    endBreak: builder.mutation({
      query: (data) => ({
        url: '/time-tracking/break/end',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['TimeSession', 'WorkerStatus']
    }),

    // Add progress update
    addProgressUpdate: builder.mutation({
      query: ({ sessionId, data }) => ({
        url: `/time-tracking/sessions/${sessionId}/progress`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['TimeSession']
    }),

    // Get time sessions
    getTimeSessions: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
          if (params[key] !== undefined && params[key] !== '') {
            searchParams.append(key, params[key]);
          }
        });
        return `/time-tracking/sessions?${searchParams.toString()}`;
      },
      providesTags: ['TimeSession']
    }),

    // Get pending approvals (Admin/Manager only)
    getPendingApprovals: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
          if (params[key] !== undefined && params[key] !== '') {
            searchParams.append(key, params[key]);
          }
        });
        return `/time-tracking/pending-approvals?${searchParams.toString()}`;
      },
      providesTags: ['TimeSession', 'PendingApproval']
    }),

    // Approve time session
    approveTimeSession: builder.mutation({
      query: ({ sessionId, approved, rejectionReason }) => ({
        url: `/time-tracking/sessions/${sessionId}/approve`,
        method: 'PATCH',
        body: { approved, rejectionReason },
      }),
      invalidatesTags: ['TimeSession', 'PendingApproval']
    }),

    // Get time tracking statistics
    getTimeStats: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
          if (params[key] !== undefined && params[key] !== '') {
            searchParams.append(key, params[key]);
          }
        });
        return `/time-tracking/stats?${searchParams.toString()}`;
      },
      providesTags: ['TimeStats']
    }),

    // Delete time session
    deleteTimeSession: builder.mutation({
      query: (sessionId) => ({
        url: `/time-tracking/sessions/${sessionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['TimeSession', 'PendingApproval', 'TimeStats']
    }),
  })
});

export const {
  useClockInMutation,
  useClockOutMutation,
  useGetWorkerStatusQuery,
  useStartBreakMutation,
  useEndBreakMutation,
  useAddProgressUpdateMutation,
  useGetTimeSessionsQuery,
  useGetPendingApprovalsQuery,
  useApproveTimeSessionMutation,
  useGetTimeStatsQuery,
  useDeleteTimeSessionMutation,
} = timeTrackingApiSlice;
