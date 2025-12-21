import { apiSlice } from '../../app/api/apiSlice';

export const timeLogsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    clockIn: builder.mutation({
      query: (data) => ({
        url: '/time-logs/clock-in',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['TimeLogStatus', { type: 'TimeLog', id: 'LIST' }],
    }),
    clockOut: builder.mutation({
      query: (data) => ({
        url: '/time-logs/clock-out',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['TimeLogStatus', { type: 'TimeLog', id: 'LIST' }],
    }),
    getUserTimeLogStatus: builder.query({
      query: () => '/time-logs/status',
      providesTags: ['TimeLogStatus'],
    }),
    getMyTimeLogs: builder.query({
      query: () => '/time-logs/my-logs',
      providesTags: (result) =>
        result
          ? [
              ...result.data.timeLogs.map(({ id }) => ({ type: 'TimeLog', id })),
              { type: 'TimeLog', id: 'LIST' },
            ]
          : [{ type: 'TimeLog', id: 'LIST' }],
    }),
    getAllTimeLogs: builder.query({
      query: () => '/time-logs',
      providesTags: (result) =>
        result
          ? [
              ...result.data.timeLogs.map(({ id }) => ({ type: 'TimeLog', id })),
              { type: 'TimeLog', id: 'LIST' },
            ]
          : [{ type: 'TimeLog', id: 'LIST' }],
    }),
  }),
});

export const {
  useClockInMutation,
  useClockOutMutation,
  useGetUserTimeLogStatusQuery,
  useGetMyTimeLogsQuery,
  useGetAllTimeLogsQuery,
} = timeLogsApiSlice;
