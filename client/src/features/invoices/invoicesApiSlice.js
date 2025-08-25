import { apiSlice } from '../app/api/apiSlice';

export const invoicesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInvoices: builder.query({
      query: (params = {}) => ({
        url: '/invoices',
        params,
      }),
      providesTags: (result = {}, error, arg) => {
        if (result?.data?.invoices) {
          return [
            'Invoice',
            ...result.data.invoices.map(({ _id }) => ({ type: 'Invoice', id: _id })),
          ];
        }
        return ['Invoice'];
      },
    }),
    getInvoice: builder.query({
      query: (id) => `/invoices/${id}`,
      providesTags: (result, error, id) => [{ type: 'Invoice', id }],
    }),
    createInvoice: builder.mutation({
      query: (invoiceData) => ({
        url: '/invoices',
        method: 'POST',
        body: invoiceData,
      }),
      invalidatesTags: ['Invoice', 'WorkOrder'],
    }),
    updateInvoice: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/invoices/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Invoice', id }],
    }),
    markInvoiceAsPaid: builder.mutation({
      query: (id) => ({
        url: `/invoices/${id}/mark-paid`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Invoice', id }, 'WorkOrder'],
    }),
    deleteInvoice: builder.mutation({
      query: (id) => ({
        url: `/invoices/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Invoice', 'WorkOrder'],
    }),
    getUnbilledWorkOrders: builder.query({
      query: (buildingId) => `/invoices/building/${buildingId}/unbilled`,
      providesTags: ['WorkOrder'],
    }),
  }),
});

export const {
  useGetInvoicesQuery,
  useGetInvoiceQuery,
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
  useMarkInvoiceAsPaidMutation,
  useDeleteInvoiceMutation,
  useGetUnbilledWorkOrdersQuery,
} = invoicesApiSlice;
