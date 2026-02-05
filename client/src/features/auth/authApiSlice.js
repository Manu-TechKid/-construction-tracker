import { apiSlice } from '../../app/api/apiSlice';
import { setCredentials, logout } from './authSlice';

export const authApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: { ...credentials },
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // API response shape: { status, token, data: { user } }
          const token = data.token;
          const user = data.data?.user;
          if (token && user) {
            dispatch(setCredentials({ user, token }));
          } else {
            console.warn('Unexpected login payload shape', data);
          }
        } catch (err) {
          console.error('Login failed:', err);
        }
      },
    }),
    register: builder.mutation({
      query: (userData) => ({
        url: '/auth/signup',
        method: 'POST',
        body: { ...userData },
      }),
    }),
    getCurrentUser: builder.query({
      query: () => '/auth/me',
      providesTags: ['User'],
      async onQueryStarted(arg, { dispatch, queryFulfilled, getState }) {
        try {
          const { data } = await queryFulfilled;
          const user = data?.data?.user;
          const token = getState()?.auth?.token;
          if (user && token) {
            dispatch(setCredentials({ user, token }));
          }
        } catch (err) {
        }
      },
    }),
    updateMyProfile: builder.mutation({
      query: (payload) => ({
        url: '/users/updateMe',
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: ['User'],
      async onQueryStarted(arg, { dispatch, queryFulfilled, getState }) {
        try {
          const { data } = await queryFulfilled;
          const user = data?.data?.user;
          const token = getState()?.auth?.token;
          if (user && token) {
            dispatch(setCredentials({ user, token }));
          }
        } catch (err) {
        }
      },
    }),
    logout: builder.mutation({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(logout());
        } catch (err) {
          // Even if logout fails on server, clear local state
          dispatch(logout());
        }
      },
    }),
    forgotPassword: builder.mutation({
      query: (email) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: email,
      }),
    }),
    resetPassword: builder.mutation({
      query: ({ token, password, passwordConfirm }) => ({
        url: `/auth/reset-password/${token}`,
        method: 'PATCH',
        body: { password, passwordConfirm },
      }),
    }),
    changePassword: builder.mutation({
      query: ({ currentPassword, newPassword, confirmPassword }) => ({
        url: '/auth/change-password',
        method: 'PATCH',
        body: { currentPassword, newPassword, confirmPassword },
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetCurrentUserQuery,
  useUpdateMyProfileMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,
} = authApiSlice;
