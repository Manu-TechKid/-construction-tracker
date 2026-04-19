import { apiSlice } from '../../app/api/apiSlice';

export const buildingActivityApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get all building activity logs
    getBuildingActivities: builder.query({
      query: (params = {}) => ({
        url: '/building-activities',
        params
      }),
      providesTags: ['BuildingActivity']
    }),

    // Get single activity log
    getBuildingActivity: builder.query({
      query: (id) => `/building-activities/${id}`,
      providesTags: (result, error, id) => [{ type: 'BuildingActivity', id }]
    }),

    // Create new activity log
    createBuildingActivity: builder.mutation({
      query: (data) => ({
        url: '/building-activities',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['BuildingActivity']
    }),

    // Update activity log
    updateBuildingActivity: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/building-activities/${id}`,
        method: 'PATCH',
        body: data
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'BuildingActivity', id },
        'BuildingActivity'
      ]
    }),

    // Delete activity log
    deleteBuildingActivity: builder.mutation({
      query: (id) => ({
        url: `/building-activities/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['BuildingActivity']
    }),

    // Get activity stats
    getBuildingActivityStats: builder.query({
      query: (params = {}) => ({
        url: '/building-activities/stats',
        params
      })
    })
  })
});

export const {
  useGetBuildingActivitiesQuery,
  useGetBuildingActivityQuery,
  useCreateBuildingActivityMutation,
  useUpdateBuildingActivityMutation,
  useDeleteBuildingActivityMutation,
  useGetBuildingActivityStatsQuery
} = buildingActivityApiSlice;
