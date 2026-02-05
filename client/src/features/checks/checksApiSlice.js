import { apiSlice } from '../../app/api/apiSlice';

export const checksApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getChecks: builder.query({
      query: (params = {}) => ({ url: '/checks', params }),
      providesTags: (result) => {
        const items = result?.data?.checks || [];
        return [
          { type: 'Check', id: 'LIST' },
          ...items.map((c) => ({ type: 'Check', id: c._id })),
        ];
      },
      keepUnusedDataFor: 60,
    }),
    getCheckById: builder.query({
      query: (id) => ({ url: `/checks/${id}` }),
      providesTags: (result, error, id) => [{ type: 'Check', id }],
    }),
    createCheck: builder.mutation({
      query: (body) => ({ url: '/checks', method: 'POST', body }),
      invalidatesTags: [{ type: 'Check', id: 'LIST' }],
    }),
    updateCheck: builder.mutation({
      query: ({ id, ...patch }) => ({ url: `/checks/${id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (r, e, { id }) => [{ type: 'Check', id }, { type: 'Check', id: 'LIST' }],
    }),
    deleteCheck: builder.mutation({
      query: (id) => ({ url: `/checks/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Check', id: 'LIST' }],
    }),
    voidCheck: builder.mutation({
      query: (id) => ({ url: `/checks/${id}/void`, method: 'PATCH' }),
      invalidatesTags: (r, e, id) => [{ type: 'Check', id }, { type: 'Check', id: 'LIST' }],
    }),
    markCheckPrinted: builder.mutation({
      query: (id) => ({ url: `/checks/${id}/mark-printed`, method: 'PATCH' }),
      invalidatesTags: (r, e, id) => [{ type: 'Check', id }, { type: 'Check', id: 'LIST' }],
    }),
    getCheckPdf: builder.mutation({
      query: ({ id, offsetX, offsetY }) => ({
        url: `/checks/${id}/pdf`,
        params: {
          offsetX: offsetX ?? 0,
          offsetY: offsetY ?? 0,
        },
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useGetChecksQuery,
  useGetCheckByIdQuery,
  useCreateCheckMutation,
  useUpdateCheckMutation,
  useDeleteCheckMutation,
  useVoidCheckMutation,
  useMarkCheckPrintedMutation,
  useGetCheckPdfMutation,
} = checksApiSlice;
