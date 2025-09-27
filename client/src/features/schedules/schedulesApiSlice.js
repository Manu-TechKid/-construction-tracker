import { apiSlice } from '../../app/api/apiSlice';

export const schedulesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSchedules: builder.query({
      query: (params = {}) => ({
        url: '/worker-schedules',
        params,
      }),
      providesTags: (result = {}, error, arg) => {
        if (result?.data?.schedules) {
          return [
            'Schedule',
            ...result.data.schedules.map(({ _id }) => ({ type: 'Schedule', id: _id })),
          ];
        }
        return ['Schedule'];
      },
    }),
    getSchedule: builder.query({
      query: (id) => `/worker-schedules/${id}`,
      providesTags: (result, error, id) => [{ type: 'Schedule', id }],
    }),
    getBuildingSchedules: builder.query({
      query: ({ buildingId, month, year }) => ({
        url: `/worker-schedules/building/${buildingId}`,
        params: { month, year },
      }),
      providesTags: (result, error, { buildingId }) => [
        { type: 'Schedule', id: `building-${buildingId}` }
      ],
    }),
    createSchedule: builder.mutation({
      query: (scheduleData) => ({
        url: '/worker-schedules',
        method: 'POST',
        body: scheduleData,
      }),
      invalidatesTags: ['Schedule'],
    }),
    updateSchedule: builder.mutation({
      query: ({ id, ...updates }) => ({
        url: `/worker-schedules/${id}`,
        method: 'PATCH',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Schedule', id },
        'Schedule',
      ],
    }),
    deleteSchedule: builder.mutation({
      query: (id) => ({
        url: `/worker-schedules/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Schedule'],
    }),
  }),
});

export const {
  useGetSchedulesQuery,
  useGetScheduleQuery,
  useGetBuildingSchedulesQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useDeleteScheduleMutation,
} = schedulesApiSlice;
