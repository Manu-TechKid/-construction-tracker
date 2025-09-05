export const formatDate = (dateString) => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch (e) {
    return null;
  }
};

export const getInitialValues = (initialValues = {}) => {
  const now = new Date();
  const defaultStartDate = new Date(now);
  defaultStartDate.setHours(9, 0, 0, 0); // Set to 9 AM
  
  const defaultEndDate = new Date(defaultStartDate);
  defaultEndDate.setHours(17, 0, 0, 0); // Set to 5 PM
  
  return {
    _id: initialValues._id || undefined,
    title: initialValues.title || '',
    building: initialValues.building || '',
    apartmentNumber: initialValues.apartmentNumber || '',
    block: initialValues.block || '',
    floor: initialValues.floor || '',
    apartmentStatus: initialValues.apartmentStatus || 'vacant',
    description: initialValues.description || '',
    priority: initialValues.priority || 'medium',
    status: initialValues.status || 'pending',
    assignedTo: Array.isArray(initialValues.assignedTo) 
      ? initialValues.assignedTo.map(worker => ({
          worker: worker.worker?._id || worker.worker || '',
          status: worker.status || 'pending',
          notes: worker.notes || '',
          timeSpent: worker.timeSpent || { hours: 0, minutes: 0 },
          materials: Array.isArray(worker.materials) ? worker.materials : []
        }))
      : [],
    services: Array.isArray(initialValues.services) 
      ? initialValues.services.map(service => ({
          ...service,
          type: service.type || '',
          description: service.description || '',
          status: service.status || 'pending',
          laborCost: service.laborCost || 0,
          materialCost: service.materialCost || 0,
          notes: Array.isArray(service.notes) ? service.notes : []
        }))
      : [{
          type: '',
          description: '',
          status: 'pending',
          laborCost: 0,
          materialCost: 0,
          notes: []
        }],
    startDate: formatDate(initialValues.startDate) || defaultStartDate,
    endDate: formatDate(initialValues.endDate) || defaultEndDate,
    scheduledDate: formatDate(initialValues.scheduledDate) || defaultStartDate,
    estimatedCompletionDate: formatDate(initialValues.estimatedCompletionDate) || defaultEndDate,
    estimatedCost: initialValues.estimatedCost || 0,
    actualCost: initialValues.actualCost || 0,
    notes: initialValues.notes || '',
    photos: Array.isArray(initialValues.photos) ? initialValues.photos : [],
    createdAt: formatDate(initialValues.createdAt) || now.toISOString(),
    updatedAt: formatDate(initialValues.updatedAt) || now.toISOString(),
    createdBy: initialValues.createdBy || '',
    updatedBy: initialValues.updatedBy || '',
    completedBy: initialValues.completedBy || '',
    completedAt: formatDate(initialValues.completedAt)
  };
};

export const formatFormDataForSubmit = (values, totalEstimatedCost) => {
  // Ensure dates are properly formatted
  const formatDate = (date) => {
    if (!date) return null;
    try {
      const d = new Date(date);
      return isNaN(d.getTime()) ? null : d.toISOString();
    } catch (e) {
      console.error('Error formatting date:', e);
      return null;
    }
  };

  return {
    ...values,
    // Format dates
    startDate: formatDate(values.startDate),
    endDate: formatDate(values.endDate),
    scheduledDate: formatDate(values.scheduledDate),
    estimatedCompletionDate: formatDate(values.estimatedCompletionDate),
    
    // Calculate and set estimated cost
    estimatedCost: totalEstimatedCost,
    
    // Process worker assignments
    assignedTo: Array.isArray(values.assignedTo)
      ? values.assignedTo
          .filter(assignment => assignment.worker) // Only include valid assignments
          .map(assignment => ({
            worker: assignment.worker._id || assignment.worker,
            status: assignment.status || 'pending',
            notes: assignment.notes || '',
            timeSpent: assignment.timeSpent || { hours: 0, minutes: 0 },
            materials: Array.isArray(assignment.materials) ? assignment.materials : [],
            assignedAt: assignment.assignedAt || new Date().toISOString(),
            assignedBy: assignment.assignedBy || 'system'
          }))
      : [],
    
    // Process services
    services: Array.isArray(values.services)
      ? values.services.map(service => ({
          type: service.type || 'other',
          description: service.description || '',
          laborCost: Number(service.laborCost) || 0,
          materialCost: Number(service.materialCost) || 0,
          estimatedHours: Number(service.estimatedHours) || 1,
          status: service.status || 'pending',
          notes: Array.isArray(service.notes) ? service.notes : [],
          completedAt: service.completedAt ? formatDate(service.completedAt) : null,
          completedBy: service.completedBy || null
        }))
      : [],
    
    // Handle photos
    photos: Array.isArray(values.photos) ? values.photos : [],
    
    // Ensure notes is an array
    notes: Array.isArray(values.notes) ? values.notes : []
  };
};

export const calculateTotalEstimatedCost = (services) => {
  return services.reduce((sum, service) => {
    return sum + (Number(service.laborCost) || 0) + (Number(service.materialCost) || 0);
  }, 0);
};
