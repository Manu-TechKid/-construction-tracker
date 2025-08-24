import { apiSlice } from '../../app/api/apiSlice';

export const remindersApiSlice = apiSlice.injectEndpoints({
  tagTypes: ['Reminder'],
  endpoints: (builder) => ({
    getReminders: builder.query({
      query: ({ page = 1, limit = 10, status, priority, building, search }) => {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', limit);
        
        if (status) params.append('status', status);
        if (priority) params.append('priority', priority);
        if (building) params.append('building', building);
        if (search) params.append('search', search);
        
        return {
          url: '/reminders',
          params: Object.fromEntries(params),
        };
      },
      providesTags: (result = [], error, arg) => [
        'Reminder',
        ...result.data.reminders.map(({ _id }) => ({ type: 'Reminder', id: _id })),
      ],
    }),
    
    getReminder: builder.query({
      query: (id) => `/reminders/${id}`,
      providesTags: (result, error, id) => [{ type: 'Reminder', id }],
    }),
    
    createReminder: builder.mutation({
      query: (reminderData) => ({
        url: '/reminders',
        method: 'POST',
        body: reminderData,
      }),
      invalidatesTags: ['Reminder'],
    }),
    
    updateReminder: builder.mutation({
      query: ({ id, ...updates }) => ({
        url: `/reminders/${id}`,
        method: 'PATCH',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Reminder', id },
        'Reminder',
      ],
    }),
    
    deleteReminder: builder.mutation({
      query: (id) => ({
        url: `/reminders/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Reminder'],
    }),
    
    addNoteToReminder: builder.mutation({
      query: ({ reminderId, text }) => ({
        url: `/reminders/${reminderId}/notes`,
        method: 'POST',
        body: { text },
      }),
      invalidatesTags: (result, error, { reminderId }) => [
        { type: 'Reminder', id: reminderId },
      ],
    }),
    
    getUpcomingReminders: builder.query({
      query: () => '/reminders/upcoming',
      providesTags: ['Reminder'],
    }),
  }),
});

export const {
  useGetRemindersQuery,
  useGetReminderQuery,
  useCreateReminderMutation,
  useUpdateReminderMutation,
  useDeleteReminderMutation,
  useAddNoteToReminderMutation,
  useGetUpcomingRemindersQuery,
} = remindersApiSlice;
