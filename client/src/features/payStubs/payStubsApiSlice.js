import { apiSlice } from '../../app/api/apiSlice';

export const payStubsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMyPayStubs: builder.query({
      query: () => ({
        url: '/pay-stubs/me',
      }),
      providesTags: ['PayStubs'],
    }),
    getPayStubsForWorker: builder.query({
      query: (workerId) => ({
        url: `/pay-stubs/worker/${workerId}`,
      }),
      providesTags: ['PayStubs'],
    }),
    uploadPayStub: builder.mutation({
      query: ({ workerId, periodStart, periodEnd, payDate, notes, file }) => {
        const formData = new FormData();
        formData.append('workerId', workerId);
        formData.append('periodStart', periodStart);
        formData.append('periodEnd', periodEnd);
        if (payDate) formData.append('payDate', payDate);
        if (notes) formData.append('notes', notes);
        formData.append('file', file);

        return {
          url: '/pay-stubs',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['PayStubs'],
    }),
    deletePayStub: builder.mutation({
      query: (id) => ({
        url: `/pay-stubs/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PayStubs'],
    }),
  }),
});

export const {
  useGetMyPayStubsQuery,
  useGetPayStubsForWorkerQuery,
  useUploadPayStubMutation,
  useDeletePayStubMutation,
} = payStubsApiSlice;
