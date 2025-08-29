import { apiSlice } from '../../app/api/apiSlice';

export const notesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getNotes: builder.query({
      query: (params = {}) => ({
        url: '/notes',
        params,
      }),
      providesTags: (result = {}, error, arg) => {
        if (result?.data?.notes) {
          return [
            'Note',
            ...result.data.notes.map(({ _id }) => ({ type: 'Note', id: _id })),
          ];
        }
        return ['Note'];
      },
    }),
    getNote: builder.query({
      query: (id) => `/notes/${id}`,
      providesTags: (result, error, id) => [{ type: 'Note', id }],
    }),
    getBuildingNotes: builder.query({
      query: ({ buildingId, status, type }) => ({
        url: `/notes/building/${buildingId}`,
        params: { status, type },
      }),
      providesTags: (result, error, { buildingId }) => [
        { type: 'Note', id: `building-${buildingId}` }
      ],
    }),
    searchBuildings: builder.query({
      query: (searchTerm) => ({
        url: '/notes/search-buildings',
        params: { q: searchTerm },
      }),
      providesTags: ['Building'],
    }),
    createNote: builder.mutation({
      query: (noteData) => ({
        url: '/notes',
        method: 'POST',
        body: noteData,
      }),
      invalidatesTags: ['Note'],
    }),
    updateNote: builder.mutation({
      query: ({ id, ...updates }) => ({
        url: `/notes/${id}`,
        method: 'PATCH',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Note', id },
        'Note',
      ],
    }),
    deleteNote: builder.mutation({
      query: (id) => ({
        url: `/notes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Note'],
    }),
  }),
});

export const {
  useGetNotesQuery,
  useGetNoteQuery,
  useGetBuildingNotesQuery,
  useSearchBuildingsQuery,
  useCreateNoteMutation,
  useUpdateNoteMutation,
  useDeleteNoteMutation,
} = notesApiSlice;
