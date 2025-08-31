import { apiSlice } from '../../app/api/apiSlice';

export const scheduleApiSlice = apiSlice.injectEndpoints({
  endpoints: builder => ({
    // Get worker location history
    getWorkerLocationHistory: builder.query({
      query: ({ workerId, startDate, endDate }) => ({
        url: `/workers/${workerId}/locations`,
        method: 'GET',
        params: { startDate, endDate }
      }),
      providesTags: ['LocationHistory']
    }),

    // Get schedule items
    getSchedule: builder.query({
      query: ({ startDate, endDate, worker, status }) => ({
        url: '/schedule',
        method: 'GET',
        params: { startDate, endDate, worker, status }
      }),
      providesTags: ['Schedule']
    }),

    // Get worker's schedule
    getWorkerSchedule: builder.query({
      query: ({ workerId, startDate, endDate, status }) => ({
        url: `/schedule/worker/${workerId || ''}`,
        method: 'GET',
        params: { startDate, endDate, status }
      }),
      providesTags: ['WorkerSchedule']
    }),

    // Get work order schedule
    getWorkOrderSchedule: builder.query({
      query: (workOrderId) => ({
        url: `/schedule/work-order/${workOrderId}`,
        method: 'GET'
      }),
      providesTags: ['WorkOrderSchedule']
    }),

    // Create schedule item
    createScheduleItem: builder.mutation({
      query: (data) => ({
        url: '/schedule',
        method: 'POST',
        body: { ...data }
      }),
      invalidatesTags: ['Schedule', 'WorkerSchedule', 'WorkOrderSchedule']
    }),

    // Update schedule item
    updateScheduleItem: builder.mutation({
      query: ({ id, ...updates }) => ({
        url: `/schedule/${id}`,
        method: 'PATCH',
        body: updates
      }),
      invalidatesTags: ['Schedule', 'WorkerSchedule', 'WorkOrderSchedule']
    }),

    // Delete schedule item
    deleteScheduleItem: builder.mutation({
      query: (id) => ({
        url: `/schedule/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Schedule', 'WorkerSchedule', 'WorkOrderSchedule']
    }),

    // Check in worker
    checkInWorker: builder.mutation({
      query: ({ id, ...checkInData }) => ({
        url: `/schedule/${id}/check-in`,
        method: 'POST',
        body: checkInData
      }),
      invalidatesTags: ['Schedule', 'WorkerSchedule', 'WorkOrderSchedule']
    }),

    // Check out worker
    checkOutWorker: builder.mutation({
      query: ({ id, ...checkOutData }) => ({
        url: `/schedule/${id}/check-out`,
        method: 'POST',
        body: checkOutData
      }),
      invalidatesTags: ['Schedule', 'WorkerSchedule', 'WorkOrderSchedule']
    })
  })
});

export const {
  useGetScheduleQuery,
  useGetWorkerScheduleQuery,
  useGetWorkOrderScheduleQuery,
  useCreateScheduleItemMutation,
  useUpdateScheduleItemMutation,
  useDeleteScheduleItemMutation,
  useCheckInWorkerMutation,
  useCheckOutWorkerMutation,
  useGetWorkerLocationHistoryQuery
} = scheduleApiSlice;
