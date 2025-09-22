import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: '/api/v1',
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const setupApiSlice = createApi({
  reducerPath: 'setupApi',
  baseQuery,
  tagTypes: ['WorkType', 'WorkSubType', 'DropdownConfig'],
  endpoints: (builder) => ({
    // Work Types
    getWorkTypes: builder.query({
      query: () => '/setup/work-types',
      providesTags: ['WorkType'],
    }),
    createWorkType: builder.mutation({
      query: (data) => ({
        url: '/setup/work-types',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['WorkType'],
    }),
    updateWorkType: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/setup/work-types/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['WorkType'],
    }),
    deleteWorkType: builder.mutation({
      query: (id) => ({
        url: `/setup/work-types/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['WorkType'],
    }),

    // Work Sub-Types
    getWorkSubTypes: builder.query({
      query: (workTypeId) => workTypeId ? `/setup/work-subtypes?workType=${workTypeId}` : '/setup/work-subtypes',
      providesTags: ['WorkSubType'],
    }),
    createWorkSubType: builder.mutation({
      query: (data) => ({
        url: '/setup/work-subtypes',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['WorkSubType'],
    }),
    updateWorkSubType: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/setup/work-subtypes/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['WorkSubType'],
    }),
    deleteWorkSubType: builder.mutation({
      query: (id) => ({
        url: `/setup/work-subtypes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['WorkSubType'],
    }),

    // Dropdown Configurations
    getDropdownConfigs: builder.query({
      query: () => '/setup/dropdown-configs',
      providesTags: ['DropdownConfig'],
    }),
    createDropdownConfig: builder.mutation({
      query: (data) => ({
        url: '/setup/dropdown-configs',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['DropdownConfig'],
    }),
    updateDropdownConfig: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/setup/dropdown-configs/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['DropdownConfig'],
    }),
    deleteDropdownConfig: builder.mutation({
      query: (id) => ({
        url: `/setup/dropdown-configs/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['DropdownConfig'],
    }),

    // Get dropdown options by category
    getDropdownOptions: builder.query({
      query: (category) => `/setup/dropdown-options/${category}`,
      providesTags: (result, error, category) => [{ type: 'DropdownConfig', id: category }],
    }),

    // Migration endpoints
    runSetupMigration: builder.mutation({
      query: () => ({
        url: '/setup/run-migration',
        method: 'POST',
      }),
      invalidatesTags: ['WorkType', 'WorkSubType', 'DropdownConfig'],
    }),
    getMigrationStatus: builder.query({
      query: () => '/setup/migration-status',
    }),
  }),
});

export const {
  useGetWorkTypesQuery,
  useCreateWorkTypeMutation,
  useUpdateWorkTypeMutation,
  useDeleteWorkTypeMutation,
  useGetWorkSubTypesQuery,
  useCreateWorkSubTypeMutation,
  useUpdateWorkSubTypeMutation,
  useDeleteWorkSubTypeMutation,
  useGetDropdownConfigsQuery,
  useCreateDropdownConfigMutation,
  useUpdateDropdownConfigMutation,
  useDeleteDropdownConfigMutation,
  useGetDropdownOptionsQuery,
  useRunSetupMigrationMutation,
  useGetMigrationStatusQuery,
} = setupApiSlice;
