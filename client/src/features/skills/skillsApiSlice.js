import { apiSlice } from '../../app/api/apiSlice';

export const skillsApiSlice = apiSlice.injectEndpoints({
  endpoints: builder => ({
    getSkills: builder.query({
      query: () => '/skills',
      providesTags: ['Skill'],
    }),
    createSkill: builder.mutation({
      query: newSkill => ({
        url: '/skills',
        method: 'POST',
        body: newSkill,
      }),
      invalidatesTags: ['Skill'],
    }),
    updateSkill: builder.mutation({
      query: ({ id, ...updatedSkill }) => ({
        url: `/skills/${id}`,
        method: 'PATCH',
        body: updatedSkill,
      }),
      invalidatesTags: ['Skill'],
    }),
    deleteSkill: builder.mutation({
      query: (id) => ({
        url: `/skills/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Skill'],
    }),
  }),
});

export const {
  useGetSkillsQuery,
  useCreateSkillMutation,
  useUpdateSkillMutation,
  useDeleteSkillMutation,
} = skillsApiSlice;
