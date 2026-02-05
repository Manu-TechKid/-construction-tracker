import { apiSlice } from '../../app/api/apiSlice';

export const employeeProfilesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMyEmployeeProfile: builder.query({
      query: () => ({ url: '/employee-profiles/me' }),
      providesTags: (result) => {
        const id = result?.data?.profile?._id;
        return id ? [{ type: 'EmployeeProfile', id }, { type: 'EmployeeProfile', id: 'ME' }] : [{ type: 'EmployeeProfile', id: 'ME' }];
      },
    }),
    upsertMyEmployeeProfile: builder.mutation({
      query: (body) => ({ url: '/employee-profiles/me', method: 'PUT', body }),
      invalidatesTags: [{ type: 'EmployeeProfile', id: 'ME' }],
    }),
    submitMyEmployeeProfile: builder.mutation({
      query: () => ({ url: '/employee-profiles/me/submit', method: 'POST' }),
      invalidatesTags: [{ type: 'EmployeeProfile', id: 'ME' }, { type: 'EmployeeProfile', id: 'LIST' }],
    }),

    getEmployeeProfiles: builder.query({
      query: (params = {}) => ({ url: '/employee-profiles', params }),
      providesTags: (result) => {
        const items = result?.data?.profiles || [];
        return [
          { type: 'EmployeeProfile', id: 'LIST' },
          ...items.map((p) => ({ type: 'EmployeeProfile', id: p._id })),
        ];
      },
    }),
    getEmployeeProfileById: builder.query({
      query: (id) => ({ url: `/employee-profiles/${id}` }),
      providesTags: (result, error, id) => [{ type: 'EmployeeProfile', id }],
    }),
    reviewEmployeeProfile: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/employee-profiles/${id}/review`, method: 'PATCH', body }),
      invalidatesTags: (r, e, { id }) => [{ type: 'EmployeeProfile', id }, { type: 'EmployeeProfile', id: 'LIST' }],
    }),

    deleteEmployeeProfile: builder.mutation({
      query: (id) => ({ url: `/employee-profiles/${id}`, method: 'DELETE' }),
      invalidatesTags: (r, e, id) => [{ type: 'EmployeeProfile', id }, { type: 'EmployeeProfile', id: 'LIST' }],
    }),
    restoreEmployeeProfile: builder.mutation({
      query: (id) => ({ url: `/employee-profiles/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: (r, e, id) => [{ type: 'EmployeeProfile', id }, { type: 'EmployeeProfile', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetMyEmployeeProfileQuery,
  useUpsertMyEmployeeProfileMutation,
  useSubmitMyEmployeeProfileMutation,
  useGetEmployeeProfilesQuery,
  useGetEmployeeProfileByIdQuery,
  useReviewEmployeeProfileMutation,
  useDeleteEmployeeProfileMutation,
  useRestoreEmployeeProfileMutation,
} = employeeProfilesApiSlice;
