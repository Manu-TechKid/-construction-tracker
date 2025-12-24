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
  }),
});

export const {
  useGetPayrollReportQuery,
} = reportsApiSlice;
