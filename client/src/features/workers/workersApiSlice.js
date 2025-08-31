import { apiSlice } from '../api/apiSlice';

export const workersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get all workers (users with role='worker')
    getWorkers: builder.query({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        
        // Add filters
        queryParams.append('role', 'worker');
        if (params.status) queryParams.append('status', params.status);
        if (params.approvalStatus) queryParams.append('approvalStatus', params.approvalStatus);
        if (params.skills) queryParams.append('skills', params.skills);
        
        return `/users/workers?${queryParams.toString()}`;
      },
      providesTags: ['Worker'],
    }),

    // Get available workers for assignment
    getAvailableWorkers: builder.query({
      query: () => '/users/workers/available',
      providesTags: ['Worker'],
    }),

    // Get single worker
    getWorker: builder.query({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'Worker', id }],
    }),

    // Create worker (by employer/admin)
    createWorker: builder.mutation({
      query: (workerData) => ({
        url: '/users/workers',
        method: 'POST',
        body: workerData,
      }),
      invalidatesTags: ['Worker'],
    }),

    // Update worker
    updateWorker: builder.mutation({
      query: ({ id, ...workerData }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body: workerData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Worker', id },
        'Worker',
      ],
    }),

    // Update worker approval status
    updateWorkerApproval: builder.mutation({
      query: ({ id, approvalStatus, notes }) => ({
        url: `/users/${id}/approval`,
        method: 'PATCH',
        body: { approvalStatus, notes },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Worker', id },
        'Worker',
      ],
    }),

    // Update worker skills
    updateWorkerSkills: builder.mutation({
      query: ({ id, skills }) => ({
        url: `/users/${id}/skills`,
        method: 'PATCH',
        body: { skills },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Worker', id },
        'Worker',
      ],
    }),

    // Update worker status
    updateWorkerStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/users/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Worker', id },
        'Worker',
      ],
    }),

    // Delete worker
    deleteWorker: builder.mutation({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Worker'],
    }),

    // Get worker assignments
    getWorkerAssignments: builder.query({
      query: (workerId) => `/users/${workerId}/assignments`,
      providesTags: (result, error, workerId) => [
        { type: 'WorkerAssignment', id: workerId },
      ],
    }),
  }),
});

export const {
  useGetWorkersQuery,
  useGetAvailableWorkersQuery,
  useGetWorkerQuery,
  useCreateWorkerMutation,
  useUpdateWorkerMutation,
  useUpdateWorkerApprovalMutation,
  useUpdateWorkerSkillsMutation,
  useUpdateWorkerStatusMutation,
  useDeleteWorkerMutation,
  useGetWorkerAssignmentsQuery,
} = workersApiSlice;
