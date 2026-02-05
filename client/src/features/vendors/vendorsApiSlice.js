import { apiSlice } from '../../app/api/apiSlice';

export const vendorsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getVendors: builder.query({
      query: () => ({ url: '/vendors' }),
      providesTags: (result) => {
        const items = result?.data?.vendors || [];
        return [
          { type: 'Vendor', id: 'LIST' },
          ...items.map((v) => ({ type: 'Vendor', id: v._id })),
        ];
      },
    }),
    getVendorById: builder.query({
      query: (id) => ({ url: `/vendors/${id}` }),
      providesTags: (result, error, id) => [{ type: 'Vendor', id }],
    }),
    createVendor: builder.mutation({
      query: (body) => ({ url: '/vendors', method: 'POST', body }),
      invalidatesTags: [{ type: 'Vendor', id: 'LIST' }],
    }),
    updateVendor: builder.mutation({
      query: ({ id, ...patch }) => ({ url: `/vendors/${id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (r, e, { id }) => [{ type: 'Vendor', id }, { type: 'Vendor', id: 'LIST' }],
    }),
    deleteVendor: builder.mutation({
      query: (id) => ({ url: `/vendors/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Vendor', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetVendorsQuery,
  useGetVendorByIdQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
} = vendorsApiSlice;
