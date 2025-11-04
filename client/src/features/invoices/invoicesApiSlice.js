import { apiSlice } from '../../app/api/apiSlice';

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
    getFilteredWorkOrders: builder.query({
      query: (filters) => {
        const params = new URLSearchParams();
        
        if (filters.buildingId) params.append('buildingId', filters.buildingId);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.workType) params.append('workType', filters.workType);
        if (filters.workSubType) params.append('workSubType', filters.workSubType);
        if (filters.status) params.append('status', filters.status);
        
        return `/invoices/work-orders/filtered?${params.toString()}`;
      },
      providesTags: ['WorkOrder'],
    }),
    // NEW: Add work orders to invoice
    addWorkOrdersToInvoice: builder.mutation({
      query: ({ id, workOrderIds }) => ({
        url: `/invoices/${id}/add-work-orders`,
        method: 'POST',
        body: { workOrderIds },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Invoice', id },
        'Invoice',
        'WorkOrder',
      ],
    }),
    // NEW: Remove work orders from invoice
    removeWorkOrdersFromInvoice: builder.mutation({
      query: ({ id, workOrderIds }) => ({
        url: `/invoices/${id}/remove-work-orders`,
        method: 'POST',
        body: { workOrderIds },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Invoice', id },
        'Invoice',
        'WorkOrder',
      ],
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
  useGetFilteredWorkOrdersQuery,
  useAddWorkOrdersToInvoiceMutation,
  useRemoveWorkOrdersFromInvoiceMutation,
} = invoicesApiSlice;
