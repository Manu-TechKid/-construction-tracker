import { apiSlice } from '../../app/api/apiSlice';

export const workContactsApiSlice = apiSlice.injectEndpoints({
  endpoints: builder => ({
    getWorkContacts: builder.query({
      query: () => '/work-contacts',
      providesTags: (result) => 
        result ? [...result.data.map(({ _id }) => ({ type: 'WorkContact', id: _id })), { type: 'WorkContact', id: 'LIST' }] : [{ type: 'WorkContact', id: 'LIST' }],
    }),
    getWorkContact: builder.query({
      query: (id) => `/work-contacts/${id}`,
      providesTags: (result, error, id) => [{ type: 'WorkContact', id }],
    }),
    createWorkContact: builder.mutation({
      query: (workContact) => ({
        url: '/work-contacts',
        method: 'POST',
        body: workContact,
      }),
      invalidatesTags: [{ type: 'WorkContact', id: 'LIST' }],
    }),
    updateWorkContact: builder.mutation({
      query: ({ id, ...workContact }) => ({
        url: `/work-contacts/${id}`,
        method: 'PATCH',
        body: workContact,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'WorkContact', id }, { type: 'WorkContact', id: 'LIST' }],
    }),
    deleteWorkContact: builder.mutation({
      query: (id) => ({
        url: `/work-contacts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'WorkContact', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetWorkContactsQuery,
  useGetWorkContactQuery,
  useCreateWorkContactMutation,
  useUpdateWorkContactMutation,
  useDeleteWorkContactMutation,
} = workContactsApiSlice;
