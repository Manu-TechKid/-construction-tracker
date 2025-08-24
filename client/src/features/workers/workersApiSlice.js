import { apiSlice } from '../../app/api/apiSlice';

export const workersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getWorkers: builder.query({
      query: (params = {}) => ({
        url: '/workers',
        params,
      }),
      providesTags: (result = {}, error, arg) => [
        'Worker',
        ...(result?.data?.workers || []).map(({ _id }) => ({ type: 'Worker', id: _id })),
      ],
    }),
    getWorker: builder.query({
      query: (id) => `/workers/${id}`,
      providesTags: (result, error, id) => [{ type: 'Worker', id }],
    }),
    createWorker: builder.mutation({
      query: (workerData) => ({
        url: '/workers',
        method: 'POST',
        body: workerData,
      }),
      invalidatesTags: ['Worker'],
    }),
    updateWorker: builder.mutation({
      query: ({ id, ...updates }) => ({
        url: `/workers/${id}`,
        method: 'PATCH',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Worker', id },
        'Worker',
      ],
    }),
    deleteWorker: builder.mutation({
      query: (id) => ({
        url: `/workers/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Worker'],
    }),
    getWorkerAssignments: builder.query({
      query: (workerId) => `/workers/${workerId}/assignments`,
      providesTags: (result = [], error, workerId) => [
        { type: 'Worker', id: workerId },
        ...result.map(({ _id }) => ({ type: 'WorkOrder', id: _id })),
      ],
    }),
    updateWorkerSkills: builder.mutation({
      query: ({ id, skills }) => ({
        url: `/workers/${id}/skills`,
        method: 'PATCH',
        body: { skills },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Worker', id },
      ],
    }),
    updateWorkerStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/workers/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Worker', id },
      ],
    }),
  }),
});

export const {
  useGetWorkersQuery,
  useGetWorkerQuery,
  useCreateWorkerMutation,
  useUpdateWorkerMutation,
  useDeleteWorkerMutation,
  useGetWorkerAssignmentsQuery,
  useUpdateWorkerSkillsMutation,
  useUpdateWorkerStatusMutation,
} = workersApiSlice;
