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
      query: (formData) => {
        // If formData is not a FormData instance, convert it
        const isFormData = formData instanceof FormData;
        
        if (!isFormData) {
          // Handle non-FormData (for backward compatibility or testing)
          const processedData = {
            ...formData,
            // Ensure arrays exist
            assignedTo: Array.isArray(formData.assignedTo) ? formData.assignedTo : [],
            services: Array.isArray(formData.services) ? formData.services : [],
            photos: Array.isArray(formData.photos) ? formData.photos : [],
            notes: Array.isArray(formData.notes) ? formData.notes : []
          };
          
          return {
            url: '/work-orders',
            method: 'POST',
            body: processedData,
            headers: { 'Content-Type': 'application/json' },
          };
        }
        
        // For FormData, let the browser set the content type with boundary
        return {
          url: '/work-orders',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['WorkOrder', 'DashboardStats'],
      transformResponse: (response, meta, arg) => {
        console.log('Create work order response:', response);
        // Handle both direct data and nested response.data
        const data = response.data || response;
        
        if (response && (response.status === 'success' || data)) {
          return { 
            success: true, 
            data: data,
            message: response.message || 'Work order created successfully!'
          };
        }
        return { 
          success: false, 
          message: response?.message || 'Failed to create work order',
          data: response?.data
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
        let fieldErrors = {};
        
        if (response.data) {
          // Handle field validation errors (new format)
          if (response.data.fieldErrors) {
            fieldErrors = response.data.fieldErrors;
            errorMessage = 'Please fix the validation errors below';
          } 
          // Handle legacy validation errors
          else if (response.data.errors) {
            // Convert errors object to fieldErrors format
            fieldErrors = {};
            Object.entries(response.data.errors).forEach(([field, error]) => {
              fieldErrors[field] = error.msg || error.message || error;
            });
            errorMessage = 'Please fix the validation errors below';
          }
          // Handle other error formats
          else if (response.data.message) {
            errorMessage = response.data.message;
          } else if (response.data.error) {
            errorMessage = response.data.error;
          }
        }
        
        if (response.status === 400 && response.data && response.data.fieldErrors) {
          return {
            ...response,
            data: {
              ...response.data,
              fieldErrors: response.data.fieldErrors
            }
          };
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
            fieldErrors: error.error?.data?.fieldErrors,
            message: error.error?.data?.message || error.message
          });
        }
      },
      invalidatesTags: ['WorkOrder'],
    }),
    updateWorkOrder: builder.mutation({
      query: ({ id, formData, ...rest }) => {
        // If formData is a FormData instance, send as multipart/form-data
        if (formData instanceof FormData) {
          return {
            url: `/work-orders/${id}`,
            method: 'PATCH',
            body: formData,
          };
        }
        
        // For backward compatibility
        return {
          url: `/work-orders/${id}`,
          method: 'PATCH',
          body: { ...formData, ...rest },
          headers: { 'Content-Type': 'application/json' },
        };
      },
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
        'DashboardStats',
      ],
      // Transform the response to handle different response formats
      transformResponse: (response, meta, id) => {
        console.log('Delete work order response:', response);
        
        // Handle different response formats
        if (response && (response.status === 'success' || response.data)) {
          return { 
            success: true, 
            message: response.message || 'Work order deleted successfully!',
            data: response.data || { _id: id }
          };
        }
        
        // If response is just the deleted work order
        if (response && response._id) {
          return {
            success: true,
            message: 'Work order deleted successfully!',
            data: response
          };
        }
        
        return response;
      },
      // Handle errors consistently
      transformErrorResponse: (response, meta, arg) => {
        console.error('Delete work order error:', response);
        
        let errorMessage = 'An error occurred while deleting the work order';
        let errorData = response.data;
        
        if (errorData) {
          // Handle different error response formats
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          }
        }
        
        // Handle specific status codes
        if (response.status === 404) {
          errorMessage = 'Work order not found. It may have already been deleted.';
        } else if (response.status === 403) {
          errorMessage = 'You do not have permission to delete this work order.';
        } else if (response.status === 401) {
          errorMessage = 'Your session has expired. Please log in again.';
        }
        
        return {
          status: response.status,
          data: errorData,
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
