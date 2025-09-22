import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: '/api/v1/setup',
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
      query: () => '/work-types',
      providesTags: ['WorkType'],
    }),
    createWorkType: builder.mutation({
      query: (data) => ({
        url: '/work-types',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['WorkType'],
    }),
    updateWorkType: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/work-types/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['WorkType'],
    }),
    deleteWorkType: builder.mutation({
      query: (id) => ({
        url: `/work-types/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['WorkType'],
    }),

    // Work Sub-Types
    getWorkSubTypes: builder.query({
      query: (workTypeId) => workTypeId ? `/work-subtypes?workType=${workTypeId}` : '/work-subtypes',
      providesTags: ['WorkSubType'],
    }),
    createWorkSubType: builder.mutation({
      query: (data) => ({
        url: '/work-subtypes',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['WorkSubType'],
    }),
    updateWorkSubType: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/work-subtypes/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['WorkSubType'],
    }),
    deleteWorkSubType: builder.mutation({
      query: (id) => ({
        url: `/work-subtypes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['WorkSubType'],
    }),

    // Dropdown Configurations
    getDropdownConfigs: builder.query({
      query: () => '/dropdown-configs',
      providesTags: ['DropdownConfig'],
    }),
    createDropdownConfig: builder.mutation({
      query: (data) => ({
        url: '/dropdown-configs',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['DropdownConfig'],
    }),
    updateDropdownConfig: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/dropdown-configs/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['DropdownConfig'],
    }),

    // Get dropdown options by category
    getDropdownOptions: builder.query({
      query: (category) => `/dropdown-options/${category}`,
      providesTags: (result, error, category) => [{ type: 'DropdownConfig', id: category }],
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
  useGetDropdownOptionsQuery,
} = setupApiSlice;
