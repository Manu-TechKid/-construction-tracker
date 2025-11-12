import { apiSlice } from '../../app/api/apiSlice';

export const clientPricingApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getClientPricingList: builder.query({
      query: (params = {}) => ({
        url: '/client-pricing',
        params,
      }),
      providesTags: (result = {}, error, arg) => {
        const pricing = result?.data?.clientPricing || [];
        if (!pricing.length) {
          return ['ClientPricing'];
        }
        return [
          'ClientPricing',
          ...pricing.map(({ _id }) => ({ type: 'ClientPricing', id: _id })),
        ];
      },
    }),

    getClientPricingById: builder.query({
      query: (id) => `/client-pricing/${id}`,
      providesTags: (result, error, id) => [{ type: 'ClientPricing', id }],
    }),

    getBuildingClientPricing: builder.query({
      query: (buildingId) => `/client-pricing/building/${buildingId}`,
      providesTags: (result, error, buildingId) => [
        { type: 'ClientPricing', id: `building-${buildingId}` },
      ],
    }),

    getBuildingServices: builder.query({
      query: ({ buildingId, category, apartmentType } = {}) => ({
        url: `/client-pricing/building/${buildingId}/services`,
        params: {
          category,
          apartmentType,
        },
      }),
      providesTags: (result, error, arg) => [
        { type: 'ClientPricing', id: `building-services-${arg?.buildingId}` },
      ],
    }),

    calculatePricing: builder.mutation({
      query: (body) => ({
        url: '/client-pricing/calculate',
        method: 'POST',
        body,
      }),
    }),

    createClientPricing: builder.mutation({
      query: (body) => ({
        url: '/client-pricing',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ClientPricing'],
    }),

    updateClientPricing: builder.mutation({
      query: ({ id, ...updates }) => ({
        url: `/client-pricing/${id}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [
        'ClientPricing',
        { type: 'ClientPricing', id },
      ],
    }),

    deleteClientPricing: builder.mutation({
      query: (id) => ({
        url: `/client-pricing/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ClientPricing'],
    }),

    addPricingService: builder.mutation({
      query: ({ pricingId, service }) => ({
        url: `/client-pricing/${pricingId}/services`,
        method: 'POST',
        body: service,
      }),
      invalidatesTags: (result, error, { pricingId }) => [
        'ClientPricing',
        { type: 'ClientPricing', id: pricingId },
      ],
    }),

    updatePricingService: builder.mutation({
      query: ({ pricingId, serviceId, service }) => ({
        url: `/client-pricing/${pricingId}/services/${serviceId}`,
        method: 'PUT',
        body: service,
      }),
      invalidatesTags: (result, error, { pricingId }) => [
        'ClientPricing',
        { type: 'ClientPricing', id: pricingId },
      ],
    }),

    removePricingService: builder.mutation({
      query: ({ pricingId, serviceId }) => ({
        url: `/client-pricing/${pricingId}/services/${serviceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { pricingId }) => [
        'ClientPricing',
        { type: 'ClientPricing', id: pricingId },
      ],
    }),
  }),
});

export const {
  useGetClientPricingListQuery,
  useGetClientPricingByIdQuery,
  useGetBuildingClientPricingQuery,
  useGetBuildingServicesQuery,
  useCalculatePricingMutation,
  useCreateClientPricingMutation,
  useUpdateClientPricingMutation,
  useDeleteClientPricingMutation,
  useAddPricingServiceMutation,
  useUpdatePricingServiceMutation,
  useRemovePricingServiceMutation,
} = clientPricingApiSlice;
