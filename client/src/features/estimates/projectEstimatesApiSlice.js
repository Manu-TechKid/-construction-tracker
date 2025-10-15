import { apiSlice } from '../../app/api/apiSlice';

export const projectEstimatesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProjectEstimates: builder.query({
      query: (params = {}) => ({
        url: '/project-estimates',
        params,
      }),
      providesTags: (result = {}, error, arg) => {
        if (result?.data?.projectEstimates) {
          return [
            'ProjectEstimate',
            ...result.data.projectEstimates.map(({ _id }) => ({ type: 'ProjectEstimate', id: _id })),
          ];
        }
        return ['ProjectEstimate'];
      },
    }),
    getProjectEstimate: builder.query({
      query: (id) => `/project-estimates/${id}`,
      providesTags: (result, error, id) => [{ type: 'ProjectEstimate', id }],
    }),
    createProjectEstimate: builder.mutation({
      query: (estimateData) => ({
        url: '/project-estimates',
        method: 'POST',
        body: estimateData,
      }),
      invalidatesTags: ['ProjectEstimate'],
    }),
    updateProjectEstimate: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/project-estimates/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'ProjectEstimate', id }],
    }),
    deleteProjectEstimate: builder.mutation({
      query: (id) => ({
        url: `/project-estimates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'ProjectEstimate', id }],
    }),
    approveProjectEstimate: builder.mutation({
      query: (id) => ({
        url: `/project-estimates/${id}/approve`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'ProjectEstimate', id }],
    }),
    sendToClient: builder.mutation({
      query: ({ id, clientEmail }) => ({
        url: `/project-estimates/${id}/send-to-client`,
        method: 'POST',
        body: { clientEmail },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'ProjectEstimate', id }],
    }),
    convertToInvoice: builder.mutation({
      query: (id) => ({
        url: `/project-estimates/${id}/convert-to-invoice`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'ProjectEstimate', id }, 'Invoice'],
    }),
    addLineItem: builder.mutation({
      query: ({ id, lineItem }) => ({
        url: `/project-estimates/${id}/line-items`,
        method: 'POST',
        body: lineItem,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'ProjectEstimate', id }],
    }),
    updateLineItem: builder.mutation({
      query: ({ id, lineItemId, ...patch }) => ({
        url: `/project-estimates/${id}/line-items/${lineItemId}`,
        method: 'PUT',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'ProjectEstimate', id }],
    }),
    removeLineItem: builder.mutation({
      query: ({ id, lineItemId }) => ({
        url: `/project-estimates/${id}/line-items/${lineItemId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'ProjectEstimate', id }],
    }),
    calculateTotals: builder.mutation({
      query: (id) => ({
        url: `/project-estimates/${id}/calculate-totals`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'ProjectEstimate', id }],
    }),
    getClientView: builder.query({
      query: (id) => `/project-estimates/${id}/client-view`,
      providesTags: (result, error, id) => [{ type: 'ProjectEstimate', id: `${id}-client` }],
    }),
    clientAccept: builder.mutation({
      query: ({ id, acceptedBy, signature }) => ({
        url: `/project-estimates/${id}/client-accept`,
        method: 'POST',
        body: { acceptedBy, signature },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'ProjectEstimate', id }],
    }),
    clientReject: builder.mutation({
      query: ({ id, reason }) => ({
        url: `/project-estimates/${id}/client-reject`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'ProjectEstimate', id }],
    }),
    markAsViewed: builder.mutation({
      query: (id) => ({
        url: `/project-estimates/${id}/mark-viewed`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'ProjectEstimate', id }],
    }),
  }),
});

export const {
  useGetProjectEstimatesQuery,
  useGetProjectEstimateQuery,
  useCreateProjectEstimateMutation,
  useUpdateProjectEstimateMutation,
  useDeleteProjectEstimateMutation,
  useApproveProjectEstimateMutation,
  useSendToClientMutation,
  useConvertToInvoiceMutation,
  useAddLineItemMutation,
  useUpdateLineItemMutation,
  useRemoveLineItemMutation,
  useCalculateTotalsMutation,
  useGetClientViewQuery,
  useClientAcceptMutation,
  useClientRejectMutation,
  useMarkAsViewedMutation,
} = projectEstimatesApiSlice;
