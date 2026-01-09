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
      invalidatesTags: (result, error, id) => [
        { type: 'WorkOrder', id: 'LIST' },
        { type: 'WorkOrder', id },
      ],
    }),

    getCleaningWorkOrdersForWeek: builder.query({
      query: () => 'work-orders/cleaning-for-week',
      providesTags: (result) =>
        result?.data?.workOrders
          ? [
              ...result.data.workOrders.map(({ _id }) => ({ type: 'WorkOrder', id: _id })),
              { type: 'WorkOrder', id: 'CLEANING_LIST' },
            ]
          : [{ type: 'WorkOrder', id: 'CLEANING_LIST' }],
    }),

    getDetailedCleaningJobs: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.buildingId) searchParams.append('buildingId', params.buildingId);
        if (params.startDate) searchParams.append('startDate', params.startDate);
        if (params.endDate) searchParams.append('endDate', params.endDate);
        return `work-orders/cleaning-detailed?${searchParams.toString()}`;
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...(result.data || []).map(({ _id }) => ({ type: 'WorkOrder', id: _id })),
              { type: 'WorkOrder', id: 'CLEANING_DETAILED' },
            ]
          : [{ type: 'WorkOrder', id: 'CLEANING_DETAILED' }],
    }),
  }),
});

export const {
  useGetWorkOrdersQuery,
  useGetWorkOrderQuery,
  useCreateWorkOrderMutation,
  useUpdateWorkOrderMutation,
  useDeleteWorkOrderMutation,
  useGetCleaningWorkOrdersForWeekQuery,
  useGetDetailedCleaningJobsQuery,
} = workOrdersApiSlice;
