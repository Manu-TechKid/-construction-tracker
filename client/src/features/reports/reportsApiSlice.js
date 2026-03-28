import { apiSlice } from '../../app/api/apiSlice';

export const reportsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPayrollReport: builder.query({
      query: ({ startDate, endDate }) => ({
        url: '/reports/payroll',
        params: { startDate, endDate },
      }),
      providesTags: ['PayrollReport'],
    }),
    getHoursControlReport: builder.query({
      query: ({ startDate, endDate, view }) => ({
        url: '/reports/hours-control',
        params: { startDate, endDate, view },
      }),
      providesTags: ['HoursControlReport'],
    }),
    getDailyScheduleReport: builder.query({
      query: ({ date, workerId, buildingId }) => ({
        url: '/reports/daily-schedule',
        params: { date, workerId, buildingId },
      }),
      providesTags: ['DailyScheduleReport'],
    }),
  }),
});

export const {
  useGetPayrollReportQuery,
  useGetHoursControlReportQuery,
  useGetDailyScheduleReportQuery,
} = reportsApiSlice;
