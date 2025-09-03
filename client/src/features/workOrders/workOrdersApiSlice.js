import { apiSlice } from '../../app/api/apiSlice';

export const workOrdersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getWorkOrders: builder.query({
      query: (params = {}) => {
        // Create a clean params object, removing any falsy values
        const cleanParams = {};
        Object.keys(params).forEach(key => {
          if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
            cleanParams[key] = params[key];
          }
        });
        
        return {
          url: '/work-orders',
          params: cleanParams,
        };
      },
      providesTags: (result = {}, error, arg) => {
        if (result?.data?.workOrders) {
          return [
            'WorkOrder',
            ...result.data.workOrders.map(({ _id }) => ({ type: 'WorkOrder', id: _id })),
          ];
        }
        return ['WorkOrder'];
      },
    }),
    getWorkOrder: builder.query({
      query: (id) => `/work-orders/${id}`,
      providesTags: (result, error, id) => [{ type: 'WorkOrder', id }],
    }),
    createWorkOrder: builder.mutation({
      query: (workOrderData) => ({
        url: '/work-orders',
        method: 'POST',
        body: workOrderData,
      }),
      invalidatesTags: ['WorkOrder'],
    }),
    updateWorkOrder: builder.mutation({
      query: ({ id, ...updates }) => ({
        url: `/work-orders/${id}`,
        method: 'PATCH',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'WorkOrder', id },
        'WorkOrder',
      ],
    }),
    deleteWorkOrder: builder.mutation({
      query: (id) => ({
        url: `/work-orders/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['WorkOrder'],
    }),
    assignWorkers: builder.mutation({
      query: ({ id, workers, scheduledDate }) => ({
        url: `/work-orders/${id}/assign`,
        method: 'PATCH',
        body: { workers, scheduledDate },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'WorkOrder', id },
        'WorkOrder',
      ],
    }),
    // Deprecated: use the addNoteToWorkOrder below which sends full note payload
    addNoteToWorkOrderLegacy: builder.mutation({
      query: ({ id, content }) => ({
        url: `/work-orders/${id}/notes`,
        method: 'POST',
        body: { content },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'WorkOrder', id },
      ],
    }),
    addNoteToWorkOrder: builder.mutation({
      query: ({ id, note }) => ({
        url: `/work-orders/${id}/notes`,
        method: 'POST',
        body: note,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'WorkOrder', id }],
    }),
    updateNoteInWorkOrder: builder.mutation({
      query: ({ id, noteId, note }) => ({
        url: `/work-orders/${id}/notes/${noteId}`,
        method: 'PATCH',
        body: note,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'WorkOrder', id }],
    }),
    deleteNoteFromWorkOrder: builder.mutation({
      query: ({ id, noteId }) => ({
        url: `/work-orders/${id}/notes/${noteId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'WorkOrder', id }],
    }),
    reportIssue: builder.mutation({
      query: ({ id, description }) => ({
        url: `/work-orders/${id}/issues`,
        method: 'POST',
        body: { description },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'WorkOrder', id },
      ],
    }),
    updateWorkOrderStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/work-orders/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'WorkOrder', id }],
    }),
  }),
});

export const {
  useGetWorkOrdersQuery,
  useGetWorkOrderQuery,
  useCreateWorkOrderMutation,
  useUpdateWorkOrderMutation,
  useDeleteWorkOrderMutation,
  useAssignWorkersMutation,
  useAddNoteToWorkOrderMutation,
  useUpdateNoteInWorkOrderMutation,
  useDeleteNoteFromWorkOrderMutation,
  useReportIssueMutation,
  useUpdateWorkOrderStatusMutation,
} = workOrdersApiSlice;
