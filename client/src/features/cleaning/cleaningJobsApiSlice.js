import { apiSlice } from '../../app/api/apiSlice';

export const cleaningJobsApiSlice = apiSlice.injectEndpoints({
  endpoints: builder => ({
    getCleaningJobs: builder.query({
      query: (params = {}) => {
        const normalizeQueryValue = (value) => {
          if (value === undefined || value === null) return null;
          if (value === '') return null;
          if (value === 'null' || value === 'undefined') return null;

          if (value instanceof Date) return value.toISOString();
          if (typeof value === 'object' && typeof value.toISOString === 'function') return value.toISOString();
          if (typeof value === 'object' && value?.$d instanceof Date) return value.$d.toISOString();

          return String(value);
        };

        const searchParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
          const normalizedValue = normalizeQueryValue(params[key]);
          if (normalizedValue !== null) searchParams.append(key, normalizedValue);
        });
        return `/cleaning-jobs?${searchParams.toString()}`;
      },
      providesTags: (result) =>
        result?.data?.cleaningJobs ? [...result.data.cleaningJobs.map(({ _id }) => ({ type: 'CleaningJob', id: _id })), { type: 'CleaningJob', id: 'LIST' }] : [{ type: 'CleaningJob', id: 'LIST' }],
    }),
    createCleaningJob: builder.mutation({
      query: (cleaningJob) => ({
        url: '/cleaning-jobs',
        method: 'POST',
        body: cleaningJob,
      }),
      invalidatesTags: [{ type: 'CleaningJob', id: 'LIST' }],
    }),
    updateCleaningJob: builder.mutation({
      query: ({ id, ...cleaningJob }) => ({
        url: `/cleaning-jobs/${id}`,
        method: 'PATCH',
        body: cleaningJob,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'CleaningJob', id }, { type: 'CleaningJob', id: 'LIST' }],
    }),
    deleteCleaningJob: builder.mutation({
      query: (id) => ({
        url: `/cleaning-jobs/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'CleaningJob', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetCleaningJobsQuery,
  useCreateCleaningJobMutation,
  useUpdateCleaningJobMutation,
  useDeleteCleaningJobMutation,
} = cleaningJobsApiSlice;
