import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const buildingRemindersApiSlice = createApi({
  reducerPath: 'buildingRemindersApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl: '/api/v1/buildings',
    credentials: 'include',
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`); 
      }
      return headers;
    },
  }),
  tagTypes: ['BuildingReminder'],
  endpoints: (builder) => ({
    getBuildingReminders: builder.query({
      query: ({ buildingId, apartmentId }) => {
        const params = new URLSearchParams();
        if (apartmentId) {
          params.append('apartmentId', apartmentId);
        }
        return {
          url: `/${buildingId}/reminders?${params.toString()}`,
          method: 'GET'
        };
      },
      providesTags: (result = [], error, args) => {
        const tags = ['BuildingReminder'];
        if (result) {
          tags.push(...result.map(({ _id }) => ({ type: 'BuildingReminder', id: _id })));
        }
        if (args?.buildingId) {
          tags.push({ type: 'BuildingReminder', id: `BUILDING_${args.buildingId}` });
        }
        if (args?.apartmentId) {
          tags.push({ type: 'BuildingReminder', id: `APARTMENT_${args.apartmentId}` });
        }
        return tags;
      }
    }),
  })
});

export const {
  useGetBuildingRemindersQuery,
} = buildingRemindersApiSlice;
