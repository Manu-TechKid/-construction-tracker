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
  }),
});

export const {
  useGetPayrollReportQuery,
  useGetHoursControlReportQuery,
} = reportsApiSlice;
