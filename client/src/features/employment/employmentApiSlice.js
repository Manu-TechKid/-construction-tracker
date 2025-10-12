import { apiSlice } from '../../app/api/apiSlice';

export const employmentApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get employment letter for current user
    getMyEmploymentLetter: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
          if (params[key] !== undefined && params[key] !== '') {
            searchParams.append(key, params[key]);
          }
        });
        return `/employment/my-letter?${searchParams.toString()}`;
      },
      providesTags: ['EmploymentLetter']
    }),

    // Generate employment letter for a specific worker (admin/manager)
    generateEmploymentLetter: builder.query({
      query: ({ workerId, ...params }) => {
        const searchParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
          if (params[key] !== undefined && params[key] !== '') {
            searchParams.append(key, params[key]);
          }
        });
        return `/employment/${workerId}/letter?${searchParams.toString()}`;
      },
      providesTags: ['EmploymentLetter']
    }),

    // Request employment letter
    requestEmploymentLetter: builder.mutation({
      query: (data) => ({
        url: '/employment/request-letter',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['EmploymentRequest']
    }),

    // Get employment letter requests (admin/manager only)
    getEmploymentRequests: builder.query({
      query: () => '/employment/requests',
      providesTags: ['EmploymentRequest']
    }),

    // Update employment letter request status (admin/manager only)
    updateEmploymentRequest: builder.mutation({
      query: ({ requestId, ...data }) => ({
        url: `/employment/requests/${requestId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['EmploymentRequest']
    }),
  }),
});

export const {
  useGetMyEmploymentLetterQuery,
  useGenerateEmploymentLetterQuery,
  useLazyGenerateEmploymentLetterQuery,
  useRequestEmploymentLetterMutation,
  useGetEmploymentRequestsQuery,
  useUpdateEmploymentRequestMutation,
} = employmentApiSlice;
