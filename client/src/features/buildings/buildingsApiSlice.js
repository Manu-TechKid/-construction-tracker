import { apiSlice } from '../../app/api/apiSlice';

export const buildingsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getBuildings: builder.query({
      query: ({ page, limit, search, status } = {}) => {
        const params = new URLSearchParams();
        if (page) params.append('page', page);
        if (limit) params.append('limit', limit);
        if (search) params.append('search', search);
        if (status) params.append('status', status);
        return {
          url: '/buildings',
          params: Object.fromEntries(params),
        };
      },
      providesTags: (result = {}, error, arg) => [
        'Building',
        ...(result?.data?.buildings || []).map(({ _id }) => ({ type: 'Building', id: _id })),
      ],
    }),
    getBuilding: builder.query({
      query: (id) => `/buildings/${id}`,
      providesTags: (result, error, id) => [{ type: 'Building', id }],
    }),
    createBuilding: builder.mutation({
      query: (buildingData) => ({
        url: '/buildings',
        method: 'POST',
        body: buildingData,
      }),
      invalidatesTags: ['Building'],
    }),
    updateBuilding: builder.mutation({
      query: ({ id, ...updates }) => ({
        url: `/buildings/${id}`,
        method: 'PATCH',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Building', id },
        'Building',
      ],
    }),
    deleteBuilding: builder.mutation({
      query: (id) => ({
        url: `/buildings/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Building'],
    }),
    addApartment: builder.mutation({
      query: ({ buildingId, apartmentData }) => ({
        url: `/buildings/${buildingId}/apartments`,
        method: 'POST',
        body: apartmentData,
      }),
      invalidatesTags: (result, error, { buildingId }) => [
        { type: 'Building', id: buildingId },
      ],
    }),
    updateApartment: builder.mutation({
      query: ({ buildingId, apartmentId, apartmentData }) => ({
        url: `/buildings/${buildingId}/apartments/${apartmentId}`,
        method: 'PATCH',
        body: apartmentData,
      }),
      invalidatesTags: (result, error, { buildingId }) => [
        { type: 'Building', id: buildingId },
      ],
    }),
    deleteApartment: builder.mutation({
      query: ({ buildingId, apartmentId }) => ({
        url: `/buildings/${buildingId}/apartments/${apartmentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { buildingId }) => [
        { type: 'Building', id: buildingId },
      ],
    }),
  }),
});

export const {
  useGetBuildingsQuery,
  useGetBuildingQuery,
  useCreateBuildingMutation,
  useUpdateBuildingMutation,
  useDeleteBuildingMutation,
  useAddApartmentMutation,
  useUpdateApartmentMutation,
  useDeleteApartmentMutation,
} = buildingsApiSlice;
