import { apiSlice } from '../../app/api/apiSlice';

export const usersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: (params = {}) => {
        const cleanParams = {};
        Object.keys(params).forEach(key => {
          if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
            cleanParams[key] = params[key];
          }
        });
        
        return {
          url: '/users',
          params: cleanParams,
        };
      },
      providesTags: (result = {}, error, arg) => {
        if (result?.data?.users) {
          return [
            'User',
            ...result.data.users.map(({ _id }) => ({ type: 'User', id: _id })),
          ];
        }
        return ['User'];
      },
    }),
    getUser: builder.query({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
    createUser: builder.mutation({
      query: (userData) => ({
        url: '/users',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['User'],
    }),
    updateUser: builder.mutation({
      query: ({ id, ...userData }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body: userData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'User', id },
        'User',
      ],
    }),
    deleteUser: builder.mutation({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'User', id },
        'User',
      ],
    }),
    getWorkers: builder.query({
      query: () => '/users?role=worker&isActive=true',
      providesTags: ['User', 'Worker'],
    }),
    approveWorker: builder.mutation({
      query: ({ id, approved }) => ({
        url: `/users/${id}/approve`,
        method: 'PATCH',
        body: { approved },
      }),
      invalidatesTags: ['User', 'Worker'],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetWorkersQuery,
  useApproveWorkerMutation,
} = usersApiSlice;
