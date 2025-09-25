import { apiSlice } from '../../app/api/apiSlice';

export const photosApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get site photos for a building
    getSitePhotos: builder.query({
      query: (buildingId) => `/photos/site/${buildingId}`,
      providesTags: (result, error, buildingId) => [
        { type: 'SitePhoto', id: 'LIST' },
        { type: 'SitePhoto', id: buildingId }
      ]
    }),

    // Get a specific site photo
    getSitePhotoById: builder.query({
      query: (photoId) => `/photos/site/photo/${photoId}`,
      providesTags: (result, error, photoId) => [
        { type: 'SitePhoto', id: photoId }
      ]
    }),

    // Create new site photo with annotations
    createSitePhoto: builder.mutation({
      query: (photoData) => {
        const formData = new FormData();

        // Convert base64 images to blobs
        if (photoData.originalPhoto) {
          const originalBlob = dataURLtoBlob(photoData.originalPhoto);
          formData.append('originalPhoto', originalBlob, 'original.jpg');
        }

        if (photoData.annotatedPhoto) {
          const annotatedBlob = dataURLtoBlob(photoData.annotatedPhoto);
          formData.append('annotatedPhoto', annotatedBlob, 'annotated.jpg');
        }

        // Add other data
        formData.append('buildingId', photoData.buildingId);
        formData.append('mode', photoData.mode);
        formData.append('notes', photoData.notes || '');
        formData.append('annotations', JSON.stringify(photoData.annotations || []));
        formData.append('timestamp', photoData.timestamp);

        if (photoData.zoom) {
          formData.append('zoom', photoData.zoom.toString());
        }

        if (photoData.panOffset) {
          formData.append('panOffset', JSON.stringify(photoData.panOffset));
        }

        return {
          url: '/photos/site',
          method: 'POST',
          body: formData,
          headers: {
            // Don't set Content-Type - let browser set it with boundary for FormData
          }
        };
      },
      invalidatesTags: (result, error, { buildingId }) => [
        { type: 'SitePhoto', id: 'LIST' },
        { type: 'SitePhoto', id: buildingId }
      ]
    }),

    // Update site photo
    updateSitePhoto: builder.mutation({
      query: ({ id, ...photoData }) => {
        const formData = new FormData();
        
        // Convert base64 images to blobs if they exist
        if (photoData.originalPhoto && photoData.originalPhoto.startsWith('data:')) {
          const originalBlob = dataURLtoBlob(photoData.originalPhoto);
          formData.append('originalPhoto', originalBlob, 'original.jpg');
        }
        
        if (photoData.annotatedPhoto && photoData.annotatedPhoto.startsWith('data:')) {
          const annotatedBlob = dataURLtoBlob(photoData.annotatedPhoto);
          formData.append('annotatedPhoto', annotatedBlob, 'annotated.jpg');
        }
        
        // Add other data
        if (photoData.buildingId) formData.append('buildingId', photoData.buildingId);
        if (photoData.mode) formData.append('mode', photoData.mode);
        if (photoData.notes !== undefined) formData.append('notes', photoData.notes);
        if (photoData.annotations) formData.append('annotations', JSON.stringify(photoData.annotations));
        if (photoData.timestamp) formData.append('timestamp', photoData.timestamp);
        if (photoData.zoom) formData.append('zoom', photoData.zoom.toString());
        if (photoData.panOffset) formData.append('panOffset', JSON.stringify(photoData.panOffset));

        return {
          url: `/photos/site/${id}`,
          method: 'PUT',
          body: formData
        };
      },
      invalidatesTags: (result, error, { id, buildingId }) => [
        { type: 'SitePhoto', id },
        { type: 'SitePhoto', id: 'LIST' },
        { type: 'SitePhoto', id: buildingId }
      ]
    }),

    // Delete site photo
    deleteSitePhoto: builder.mutation({
      query: (photoId) => ({
        url: `/photos/site/${photoId}`,
        method: 'DELETE'
      }),
      invalidatesTags: (result, error, photoId) => [
        { type: 'SitePhoto', id: photoId },
        { type: 'SitePhoto', id: 'LIST' }
      ]
    }),

    // Get photos by building and type
    getPhotosByType: builder.query({
      query: ({ buildingId, type }) => `/photos/site/${buildingId}/type/${type}`,
      providesTags: (result, error, { buildingId, type }) => [
        { type: 'SitePhoto', id: `${buildingId}-${type}` }
      ]
    }),

    // Get photo statistics for a building
    getPhotoStats: builder.query({
      query: (buildingId) => `/photos/site/${buildingId}/stats`,
      providesTags: (result, error, buildingId) => [
        { type: 'PhotoStats', id: buildingId }
      ]
    }),

    // Bulk upload photos
    bulkUploadPhotos: builder.mutation({
      query: ({ buildingId, photos }) => {
        const formData = new FormData();
        formData.append('buildingId', buildingId);
        
        photos.forEach((photo, index) => {
          if (photo.file) {
            formData.append(`photos`, photo.file);
            formData.append(`photoData_${index}`, JSON.stringify({
              mode: photo.mode,
              notes: photo.notes,
              annotations: photo.annotations,
              timestamp: photo.timestamp
            }));
          }
        });

        return {
          url: '/photos/site/bulk',
          method: 'POST',
          body: formData
        };
      },
      invalidatesTags: (result, error, { buildingId }) => [
        { type: 'SitePhoto', id: 'LIST' },
        { type: 'SitePhoto', id: buildingId }
      ]
    }),

    // Export photos for a building
    exportBuildingPhotos: builder.mutation({
      query: ({ buildingId, format = 'pdf', includeAnnotations = true }) => ({
        url: `/photos/site/${buildingId}/export`,
        method: 'POST',
        body: { format, includeAnnotations },
        responseHandler: 'blob'
      })
    })
  })
});

// Helper function to convert data URL to blob
const dataURLtoBlob = (dataURL) => {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mime });
};

export const {
  useGetSitePhotosQuery,
  useGetSitePhotoByIdQuery,
  useCreateSitePhotoMutation,
  useUpdateSitePhotoMutation,
  useDeleteSitePhotoMutation,
  useGetPhotosByTypeQuery,
  useGetPhotoStatsQuery,
  useBulkUploadPhotosMutation,
  useExportBuildingPhotosMutation
} = photosApiSlice;
