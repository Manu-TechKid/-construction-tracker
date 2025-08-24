import { apiSlice } from '../../app/api/apiSlice';

export const buildingRemindersApiSlice = apiSlice.injectEndpoints({
  tagTypes: ['BuildingReminder'],
  endpoints: (builder) => ({
    getBuildingReminders: builder.query({
      query: ({ buildingId, apartmentId }) => {
        const params = new URLSearchParams();
        if (apartmentId) {
          params.append('apartmentId', apartmentId);
        }
        return {
          url: `/buildings/${buildingId}/reminders?${params.toString()}`,
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
