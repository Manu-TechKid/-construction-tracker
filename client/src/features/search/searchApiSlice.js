import { apiSlice } from '../../app/api/apiSlice';

export const searchApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    searchApartment: builder.mutation({
      query: (searchParams) => ({
        url: '/search/apartment',
        method: 'POST',
        body: searchParams,
      }),
    }),
    searchGlobal: builder.mutation({
      query: (searchParams) => ({
        url: '/search/global',
        method: 'POST',
        body: searchParams,
      }),
    }),
    getApartmentHistory: builder.query({
      query: ({ apartmentNumber, buildingId }) => ({
        url: `/search/apartment-history`,
        params: { apartmentNumber, buildingId },
      }),
      providesTags: (result, error, { apartmentNumber, buildingId }) => [
        { type: 'ApartmentHistory', id: `${buildingId}-${apartmentNumber}` }
      ],
    }),
  }),
});

export const {
  useSearchApartmentMutation,
  useSearchGlobalMutation,
  useGetApartmentHistoryQuery,
} = searchApiSlice;
