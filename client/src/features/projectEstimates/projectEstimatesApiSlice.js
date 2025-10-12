import { apiSlice } from '../../app/api/apiSlice';

export const projectEstimatesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get all project estimates
    getProjectEstimates: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
          if (params[key] !== undefined && params[key] !== '') {
            searchParams.append(key, params[key]);
          }
        });
        return `/project-estimates?${searchParams.toString()}`;
      },
      providesTags: (result) => 
        result?.data?.projectEstimates ? [
          ...result.data.projectEstimates.map(({ _id }) => ({ type: 'ProjectEstimate', id: _id })), 
          { type: 'ProjectEstimate', id: 'LIST' }
        ] : [{ type: 'ProjectEstimate', id: 'LIST' }],
    }),

    // Get single project estimate
    getProjectEstimate: builder.query({
      query: (id) => `/project-estimates/${id}`,
      providesTags: (result, error, id) => [{ type: 'ProjectEstimate', id }],
    }),

    // Create project estimate
    createProjectEstimate: builder.mutation({
      query: (formData) => ({
        url: '/project-estimates',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [
        { type: 'ProjectEstimate', id: 'LIST' },
        { type: 'ProjectEstimate', id: 'STATS' }
      ],
    }),

    // Update project estimate
    updateProjectEstimate: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/project-estimates/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'ProjectEstimate', id },
        { type: 'ProjectEstimate', id: 'LIST' },
        { type: 'ProjectEstimate', id: 'STATS' }
      ],
    }),

    // Delete project estimate
    deleteProjectEstimate: builder.mutation({
      query: (id) => ({
        url: `/project-estimates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'ProjectEstimate', id: 'LIST' },
        { type: 'ProjectEstimate', id: 'STATS' }
      ],
    }),

    // Get pending approvals
    getPendingProjectApprovals: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
          if (params[key] !== undefined && params[key] !== '') {
            searchParams.append(key, params[key]);
          }
        });
        return `/project-estimates/pending-approvals?${searchParams.toString()}`;
      },
      providesTags: ['ProjectEstimate', 'PendingApproval']
    }),

    // Approve project estimate
    approveProjectEstimate: builder.mutation({
      query: ({ id, approved, rejectionReason }) => ({
        url: `/project-estimates/${id}/approve`,
        method: 'PATCH',
        body: { approved, rejectionReason },
      }),
      invalidatesTags: [
        { type: 'ProjectEstimate', id: 'LIST' },
        { type: 'ProjectEstimate', id: 'STATS' },
        'PendingApproval'
      ]
    }),

    // Convert to work order
    convertToWorkOrder: builder.mutation({
      query: (id) => ({
        url: `/project-estimates/${id}/convert`,
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'ProjectEstimate', id: 'LIST' },
        { type: 'WorkOrder', id: 'LIST' },
        { type: 'ProjectEstimate', id: 'STATS' }
      ]
    }),

    // Convert to invoice
    convertToInvoice: builder.mutation({
      query: ({ id, invoiceData }) => ({
        url: `/project-estimates/${id}/convert-to-invoice`,
        method: 'POST',
        body: invoiceData,
      }),
      invalidatesTags: [
        { type: 'ProjectEstimate', id: 'LIST' },
        { type: 'ProjectEstimate', id: 'STATS' },
        'Invoice',
      ],
    }),

    // Get statistics
    getProjectEstimateStats: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
          if (params[key] !== undefined && params[key] !== '') {
            searchParams.append(key, params[key]);
          }
        });
        return `/project-estimates/stats?${searchParams.toString()}`;
      },
      providesTags: [{ type: 'ProjectEstimate', id: 'STATS' }]
    }),
  })
});

export const {
  useGetProjectEstimatesQuery,
  useGetProjectEstimateQuery,
  useCreateProjectEstimateMutation,
  useUpdateProjectEstimateMutation,
  useDeleteProjectEstimateMutation,
  useGetPendingProjectApprovalsQuery,
  useApproveProjectEstimateMutation,
  useConvertToWorkOrderMutation,
  useConvertToInvoiceMutation,
  useGetProjectEstimateStatsQuery,
} = projectEstimatesApiSlice;
