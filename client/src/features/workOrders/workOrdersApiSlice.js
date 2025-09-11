import { apiSlice } from '../../app/api/apiSlice';

export const workOrdersApiSlice = apiSlice.injectEndpoints({
  endpoints: builder => ({
    getWorkOrders: builder.query({
      query: () => '/work-orders',
      providesTags: (result) => 
        result ? [...result.data.map(({ _id }) => ({ type: 'WorkOrder', id: _id })), { type: 'WorkOrder', id: 'LIST' }] : [{ type: 'WorkOrder', id: 'LIST' }],
    }),
    getWorkOrder: builder.query({
      query: (id) => `/work-orders/${id}`,
      providesTags: (result, error, id) => [{ type: 'WorkOrder', id }],
    }),
    createWorkOrder: builder.mutation({
      query: (workOrder) => ({
        url: '/work-orders',
        method: 'POST',
        body: workOrder,
      }),
      invalidatesTags: [{ type: 'WorkOrder', id: 'LIST' }],
    }),
    updateWorkOrder: builder.mutation({
      query: ({ id, ...workOrder }) => ({
        url: `/work-orders/${id}`,
        method: 'PATCH',
        body: workOrder,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'WorkOrder', id }],
    }),
    deleteWorkOrder: builder.mutation({
      query: (id) => ({
        url: `/work-orders/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'WorkOrder', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetWorkOrdersQuery,
  useGetWorkOrderQuery,
  useCreateWorkOrderMutation,
  useUpdateWorkOrderMutation,
  useDeleteWorkOrderMutation,
} = workOrdersApiSlice;
