import { apiSlice } from '../../app/api/apiSlice';

export const skillsApiSlice = apiSlice.injectEndpoints({
  endpoints: builder => ({
    getSkills: builder.query({
      query: () => '/skills',
      providesTags: (result) =>
        result
          ? [
              ...result.data.skills.map(({ _id }) => ({ type: 'Skill', id: _id })),
              { type: 'Skill', id: 'LIST' },
            ]
          : [{ type: 'Skill', id: 'LIST' }],
    }),
    createSkill: builder.mutation({
      query: newSkill => ({
        url: '/skills',
        method: 'POST',
        body: newSkill,
      }),
      invalidatesTags: [{ type: 'Skill', id: 'LIST' }],
    }),
    updateSkill: builder.mutation({
      query: ({ id, ...updatedSkill }) => ({
        url: `/skills/${id}`,
        method: 'PATCH',
        body: updatedSkill,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Skill', id }, { type: 'Skill', id: 'LIST' }],
    }),
    deleteSkill: builder.mutation({
      query: (id) => ({
        url: `/skills/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Skill', id }, { type: 'Skill', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetSkillsQuery,
  useCreateSkillMutation,
  useUpdateSkillMutation,
  useDeleteSkillMutation,
} = skillsApiSlice;
