import { apiSlice } from '../../app/api/apiSlice';

export const workLogsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get work logs for a worker
    getWorkerWorkLogs: builder.query({
      query: ({ workerId, startDate, endDate, buildingId, status } = {}) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (buildingId) params.append('buildingId', buildingId);
        if (status) params.append('status', status);
        
        const url = workerId 
          ? `/work-logs/worker/${workerId}?${params}`
          : `/work-logs/worker?${params}`;
        
        return url;
      },
      providesTags: (result) =>
        result?.data?.workLogs
          ? [
              ...result.data.workLogs.map(({ _id }) => ({ type: 'WorkLog', id: _id })),
              { type: 'WorkLog', id: 'LIST' },
            ]
          : [{ type: 'WorkLog', id: 'LIST' }],
    }),

    // Get all work logs (admin/manager)
    getAllWorkLogs: builder.query({
      query: ({ startDate, endDate, buildingId, workerId, status } = {}) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (buildingId) params.append('buildingId', buildingId);
        if (workerId) params.append('workerId', workerId);
        if (status) params.append('status', status);
        
        return `/work-logs?${params}`;
      },
      providesTags: (result) =>
        result?.data?.workLogs
          ? [
              ...result.data.workLogs.map(({ _id }) => ({ type: 'WorkLog', id: _id })),
              { type: 'WorkLog', id: 'LIST' },
            ]
          : [{ type: 'WorkLog', id: 'LIST' }],
    }),

    // Create work log
    createWorkLog: builder.mutation({
      query: (formData) => ({
        url: '/work-logs',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [{ type: 'WorkLog', id: 'LIST' }],
    }),

    // Update work log
    updateWorkLog: builder.mutation({
      query: ({ id, formData }) => ({
        url: `/work-logs/${id}`,
        method: 'PATCH',
        body: formData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'WorkLog', id },
        { type: 'WorkLog', id: 'LIST' },
      ],
    }),

    // Add admin feedback
    addAdminFeedback: builder.mutation({
      query: ({ id, feedback, status }) => ({
        url: `/work-logs/${id}/feedback`,
        method: 'PATCH',
        body: { feedback, status },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'WorkLog', id },
        { type: 'WorkLog', id: 'LIST' },
      ],
    }),

    // Delete work log
    deleteWorkLog: builder.mutation({
      query: (id) => ({
        url: `/work-logs/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'WorkLog', id: 'LIST' }],
    }),

    // Get work log statistics
    getWorkLogStats: builder.query({
      query: ({ workerId, buildingId, startDate, endDate } = {}) => {
        const params = new URLSearchParams();
        if (workerId) params.append('workerId', workerId);
        if (buildingId) params.append('buildingId', buildingId);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        return `/work-logs/stats?${params}`;
      },
      providesTags: [{ type: 'WorkLog', id: 'STATS' }],
    }),
  }),
});

export const {
  useGetWorkerWorkLogsQuery,
  useGetAllWorkLogsQuery,
  useCreateWorkLogMutation,
  useUpdateWorkLogMutation,
  useAddAdminFeedbackMutation,
  useDeleteWorkLogMutation,
  useGetWorkLogStatsQuery,
} = workLogsApiSlice;
