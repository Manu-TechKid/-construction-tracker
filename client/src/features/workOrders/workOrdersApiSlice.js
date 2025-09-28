import { apiSlice } from '../../app/api/apiSlice';

export const workOrdersApiSlice = apiSlice.injectEndpoints({
  endpoints: builder => ({
    getWorkOrders: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
          if (params[key] !== undefined && params[key] !== '') {
            searchParams.append(key, params[key]);
          }
        });
        return `/work-orders?${searchParams.toString()}`;
      },
      providesTags: (result) => 
        result?.data?.workOrders ? [...result.data.workOrders.map(({ _id }) => ({ type: 'WorkOrder', id: _id })), { type: 'WorkOrder', id: 'LIST' }] : [{ type: 'WorkOrder', id: 'LIST' }],
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
      invalidatesTags: [
        { type: 'WorkOrder', id: 'LIST' },
        { type: 'WorkOrder', id: 'WORKER_ASSIGNMENTS' }
      ],
    }),
    updateWorkOrder: builder.mutation({
      query: ({ id, ...workOrder }) => ({
        url: `/work-orders/${id}`,
        method: 'PATCH',
        body: workOrder,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'WorkOrder', id },
        { type: 'WorkOrder', id: 'LIST' },
        { type: 'WorkOrder', id: 'WORKER_ASSIGNMENTS' },
        // Invalidate all user assignments since we don't know which workers are affected
        { type: 'User', id: 'LIST' }
      ],
    }),
    deleteWorkOrder: builder.mutation({
      query: (id) => ({
        url: `/work-orders/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'WorkOrder', id: 'LIST' }],
    }),
    getWorkerAssignments: builder.query({
      query: (workerId) => `/users/${workerId}/assignments`,
      providesTags: (result, error, workerId) => [
        { type: 'WorkOrder', id: 'WORKER_ASSIGNMENTS' },
        { type: 'User', id: workerId }
      ],
    }),
  }),
});

export const {
  useGetWorkOrdersQuery,
  useGetWorkOrderQuery,
  useCreateWorkOrderMutation,
  useUpdateWorkOrderMutation,
  useDeleteWorkOrderMutation,
  useGetWorkerAssignmentsQuery,
} = workOrdersApiSlice;
