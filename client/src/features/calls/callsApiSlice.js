import { apiSlice } from '../../app/api/apiSlice';

export const callsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCalls: builder.query({
      query: (params = {}) => ({
        url: '/calls',
        params,
      }),
      providesTags: (result = {}, error, arg) => {
        const items = result?.data?.callLogs || [];
        return [
          'CallLog',
          ...items.map((c) => ({ type: 'CallLog', id: c._id })),
        ];
      },
      keepUnusedDataFor: 60,
    }),
    getCallById: builder.query({
      query: (id) => `/calls/${id}`,
      providesTags: (result, error, id) => [{ type: 'CallLog', id }],
    }),
    getCallStats: builder.query({
      query: (params = {}) => ({ url: '/calls/stats', params }),
    }),
    createCall: builder.mutation({
      query: (body) => ({
        url: '/calls',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CallLog'],
    }),
    updateCall: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/calls/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (r, e, { id }) => [{ type: 'CallLog', id }],
    }),
    deleteCall: builder.mutation({
      query: (id) => ({ url: `/calls/${id}`, method: 'DELETE' }),
      invalidatesTags: ['CallLog'],
    }),
  }),
});

export const {
  useGetCallsQuery,
  useGetCallByIdQuery,
  useGetCallStatsQuery,
  useCreateCallMutation,
  useUpdateCallMutation,
  useDeleteCallMutation,
} = callsApiSlice;
