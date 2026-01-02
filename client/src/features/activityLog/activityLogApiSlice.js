import { apiSlice } from '../../app/api/apiSlice';

export const activityLogApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getActivityLog: builder.query({
      query: () => '/activity-log',
      providesTags: ['ActivityLog'],
    }),
  }),
});

export const { useGetActivityLogQuery } = activityLogApiSlice;
