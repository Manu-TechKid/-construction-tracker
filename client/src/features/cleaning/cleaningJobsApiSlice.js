import { apiSlice } from '../../app/api/apiSlice';

export const cleaningJobsApiSlice = apiSlice.injectEndpoints({
  endpoints: builder => ({
    getCleaningJobs: builder.query({
      query: (params = {}) => {
        const formatLocalDateOnly = (dateValue) => {
          const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
          if (Number.isNaN(d.getTime())) return null;
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        };

        const normalizeQueryValue = (value) => {
          if (value === undefined || value === null) return null;
          if (value === '') return null;
          if (value === 'all') return null;
          if (value === 'null' || value === 'undefined') return null;

          if (value instanceof Date) return formatLocalDateOnly(value);
          if (typeof value === 'object' && typeof value.toISOString === 'function') return formatLocalDateOnly(value);
          if (typeof value === 'object' && value?.$d instanceof Date) return formatLocalDateOnly(value.$d);

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
    getCleaningJobSubcategories: builder.query({
      query: () => '/cleaning-jobs/subcategories',
    }),
  }),
});

export const {
  useGetCleaningJobsQuery,
  useCreateCleaningJobMutation,
  useUpdateCleaningJobMutation,
  useDeleteCleaningJobMutation,
  useGetCleaningJobSubcategoriesQuery,
} = cleaningJobsApiSlice;
