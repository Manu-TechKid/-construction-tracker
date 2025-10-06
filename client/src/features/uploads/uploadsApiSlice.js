import { apiSlice } from '../../app/api/apiSlice';

export const uploadsApiSlice = apiSlice.injectEndpoints({
  endpoints: builder => ({
    uploadPhoto: builder.mutation({
      query: ({ workOrderId, photo }) => {
        const formData = new FormData();
        formData.append('workOrderId', workOrderId);
        formData.append('photo', photo);
        return {
          url: '/uploads/photo',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: (result, error, { workOrderId }) => [{ type: 'WorkOrder', id: workOrderId }],
    }),
    deletePhoto: builder.mutation({
      query: ({ workOrderId, photoId }) => ({
        url: `/uploads/photo/${workOrderId}/${photoId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { workOrderId }) => [{ type: 'WorkOrder', id: workOrderId }],
    }),
  }),
});

export const {
  useUploadPhotoMutation,
  useDeletePhotoMutation,
} = uploadsApiSlice;
