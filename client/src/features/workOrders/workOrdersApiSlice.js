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
        url: '/api/v1/work-orders',
        method: 'POST',
        body: workOrderData,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      transformResponse: (response, meta, arg) => {
        console.log('Create work order response:', response);
        if (response && response.status === 'success') {
          return { 
            success: true, 
            data: response.data,
            message: response.message || 'Work order created successfully!'
          };
        }
        return { 
          success: false, 
          message: response?.message || 'Failed to create work order',
          data: response.data
        };
      },
      transformErrorResponse: (response, meta, arg) => {
        console.error('Create work order error:', {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
          originalArgs: arg
        });
        
        let errorMessage = 'An error occurred while creating the work order';
        
        if (response.data) {
          // Handle validation errors
          if (response.data.errors) {
            const errorMessages = Object.values(response.data.errors)
              .map(err => err.msg || err.message || err)
              .join('\n');
            errorMessage = errorMessages || errorMessage;
          } 
          // Handle other error formats
          else if (response.data.message) {
            errorMessage = response.data.message;
          } else if (response.data.error) {
            errorMessage = response.data.error;
          }
        }
        
        return {
          status: response.status,
          data: response.data,
          message: errorMessage
        };
      },
      async onQueryStarted(workOrderData, { dispatch, queryFulfilled }) {
        console.log('Starting work order creation with data:', workOrderData);
        try {
          const { data } = await queryFulfilled;
          console.log('Work order created successfully:', data);
        } catch (error) {
          console.error('Work order creation failed:', {
            status: error.error?.status,
            data: error.error?.data,
            message: error.error?.data?.message || error.message
          });
        }
      },
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
      query: (id) => {
        console.log('Preparing DELETE request for work order:', id);
        return {
          url: `/work-orders/${id}`,
          method: 'DELETE'
        };
      },
      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        console.log('Starting delete work order query for ID:', arg);
        try {
          const { data } = await queryFulfilled;
          console.log('Delete work order successful:', data);
        } catch (error) {
          console.error('Delete work order failed:', {
            status: error.error?.status,
            data: error.error?.data,
            message: error.error?.data?.message || error.message
          });
        }
      },
      invalidatesTags: (result, error, id) => [
        { type: 'WorkOrder', id },
        'WorkOrder',
        'WorkOrderList'
      ],
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
    
    // Delete a work order
    deleteWorkOrder: builder.mutation({
      query: (id) => ({
        url: `/work-orders/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'WorkOrder', id },
        'WorkOrder',
      ],
      // Transform the response to handle different response formats
      transformResponse: (response, meta, arg) => {
        if (response && response.status === 'success') {
          return { 
            success: true, 
            message: response.message || 'Work order deleted successfully!',
            data: response.data
          };
        }
        return response;
      },
      // Handle errors consistently
      transformErrorResponse: (response, meta, arg) => {
        let errorMessage = 'An error occurred while deleting the work order';
        
        if (response.data) {
          if (response.data.message) {
            errorMessage = response.data.message;
          } else if (response.data.error) {
            errorMessage = response.data.error;
          }
        }
        
        return {
          status: response.status,
          data: response.data,
          message: errorMessage
        };
      },
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
