import { apiSlice } from '../../app/api/apiSlice';

export const scheduleApiSlice = apiSlice.injectEndpoints({
  endpoints: builder => ({
    // Get worker schedules
    getWorkerSchedules: builder.query({
      query: ({ workerId, status }) => ({
        url: `/api/workers/${workerId}/schedules`,
        method: 'GET',
        params: { status }
      }),
      providesTags: (result = [], error, { workerId }) => [
        { type: 'WorkerSchedules', id: workerId },
        ...result?.data?.schedules?.map(({ _id }) => ({
          type: 'Schedule',
          id: _id
        })) || []
      ]
    }),

    // Get worker location history
    getWorkerLocationHistory: builder.query({
      query: ({ workerId, startDate, endDate }) => ({
        url: `/api/workers/${workerId}/locations`,
        method: 'GET',
        params: { startDate, endDate }
      }),
      providesTags: (result = [], error, { workerId }) => [
        { type: 'LocationHistory', id: workerId }
      ]
    }),

    // Get schedule items
    getSchedule: builder.query({
      query: ({ startDate, endDate, worker, status }) => ({
        url: '/api/schedule',
        method: 'GET',
        params: { startDate, endDate, worker, status }
      }),
      providesTags: (result = []) => [
        'Schedule',
        ...result.data?.map(({ _id }) => ({ type: 'Schedule', id: _id })) || []
      ]
    }),

    // Get worker's schedule
    getWorkerSchedule: builder.query({
      query: ({ workerId, startDate, endDate, status }) => ({
        url: `/api/schedule/worker/${workerId || ''}`,
        method: 'GET',
        params: { startDate, endDate, status }
      }),
      providesTags: (result = [], error, { workerId }) => [
        { type: 'WorkerSchedule', id: workerId },
        ...result.data?.map(({ _id }) => ({ type: 'Schedule', id: _id })) || []
      ]
    }),

    // Get work order schedule
    getWorkOrderSchedule: builder.query({
      query: (workOrderId) => ({
        url: `/api/schedule/work-order/${workOrderId}`,
        method: 'GET'
      }),
      providesTags: (result, error, workOrderId) => [
        { type: 'WorkOrderSchedule', id: workOrderId }
      ]
    }),

    // Create schedule item
    createScheduleItem: builder.mutation({
      query: (data) => ({
        url: '/api/schedule',
        method: 'POST',
        body: data
      }),
      invalidatesTags: (result) => [
        'Schedule',
        { type: 'WorkerSchedule', id: result?.data?.assignedTo?.worker },
        { type: 'WorkerSchedules', id: result?.data?.assignedTo?.worker },
        { type: 'WorkOrderSchedule', id: result?.data?.workOrder }
      ]
    }),

    // Update schedule item
    updateScheduleItem: builder.mutation({
      query: ({ id, ...updates }) => ({
        url: `/api/schedule/${id}`,
        method: 'PATCH',
        body: updates
      }),
      invalidatesTags: (result, error, { id, ...updates }) => [
        { type: 'Schedule', id },
        { type: 'WorkerSchedule', id: updates.assignedTo?.worker },
        { type: 'WorkerSchedules', id: updates.assignedTo?.worker },
        { type: 'WorkOrderSchedule', id: updates.workOrder }
      ]
    }),

    // Delete schedule item
    deleteScheduleItem: builder.mutation({
      query: (id) => ({
        url: `/api/schedule/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Schedule', id },
        'WorkerSchedule',
        'WorkerSchedules',
        'WorkOrderSchedule'
      ]
    }),

    // Check in worker
    checkInWorker: builder.mutation({
      query: (data) => ({
        url: '/api/schedule/check-in',
        method: 'POST',
        body: data
      }),
      invalidatesTags: (result) => [
        'Schedule',
        { type: 'WorkerSchedule', id: result?.data?.worker },
        { type: 'WorkerSchedules', id: result?.data?.worker }
      ]
    }),

    // Check out worker
    checkOutWorker: builder.mutation({
      query: (data) => ({
        url: '/api/schedule/check-out',
        method: 'POST',
        body: data
      }),
      invalidatesTags: (result) => [
        'Schedule',
        { type: 'WorkerSchedule', id: result?.data?.worker },
        { type: 'WorkerSchedules', id: result?.data?.worker }
      ]
    })
  })
});

export const {
  useGetScheduleQuery,
  useGetWorkerScheduleQuery,
  useGetWorkerSchedulesQuery,
  useGetWorkOrderScheduleQuery,
  useCreateScheduleItemMutation,
  useUpdateScheduleItemMutation,
  useDeleteScheduleItemMutation,
  useCheckInWorkerMutation,
  useCheckOutWorkerMutation,
  useGetWorkerLocationHistoryQuery
} = scheduleApiSlice;
