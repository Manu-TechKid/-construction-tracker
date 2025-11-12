// Photo upload service for work orders
export const photoService = {
  // Upload photos to work order
  uploadWorkOrderPhotos: async (workOrderId, files, description = '') => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('photos', file);
    });
    formData.append('description', description);

    try {
      const response = await fetch(`/api/v1/work-orders/${workOrderId}/photos`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to upload photos');
      }

      return await response.json();
    } catch (error) {
      console.error('Photo upload error:', error);
      throw error;
    }
  },

  // Upload photos to reminder
  uploadReminderPhotos: async (reminderId, files, description = '') => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('photos', file);
    });
    formData.append('description', description);

    try {
      const response = await fetch(`/api/v1/reminders/${reminderId}/photos`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to upload photos');
      }

      return await response.json();
    } catch (error) {
      console.error('Photo upload error:', error);
      throw error;
    }
  },

  // Delete photo from work order
  deleteWorkOrderPhoto: async (workOrderId, photoId) => {
    try {
      const response = await fetch(`/api/v1/work-orders/${workOrderId}/photos/${photoId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete photo');
      }

      return await response.json();
    } catch (error) {
      console.error('Photo delete error:', error);
      throw error;
    }
  },

  // Delete photo from reminder
  deleteReminderPhoto: async (reminderId, photoId) => {
    try {
      const response = await fetch(`/api/v1/reminders/${reminderId}/photos/${photoId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete photo');
      }

      return await response.json();
    } catch (error) {
      console.error('Photo delete error:', error);
      throw error;
    }
  },

  // Validate file before upload
  validateFile: (file) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload JPEG, PNG, GIF, or WebP images.');
    }

    if (file.size > maxSize) {
      throw new Error('File size too large. Maximum size is 5MB.');
    }

    return true;
  },

  // Convert file to base64 for preview
  fileToBase64: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }
};

export default photoService;
