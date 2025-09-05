import * as Yup from 'yup';

export const workOrderValidationSchema = Yup.object({
  title: Yup.string().required('Title is required'),
  building: Yup.string().required('Building is required'),
  description: Yup.string().required('Description is required'),
  startDate: Yup.date().required('Start date is required'),
  endDate: Yup.date()
    .required('End date is required')
    .when('startDate', (startDate, schema) => {
      return startDate ? schema.min(startDate, 'End date must be after start date') : schema;
    }),
  scheduledDate: Yup.date().required('Scheduled date is required'),
  priority: Yup.string()
    .oneOf(['low', 'medium', 'high', 'urgent'], 'Invalid priority')
    .required('Priority is required'),
  status: Yup.string()
    .oneOf(['pending', 'in_progress', 'on_hold', 'completed', 'cancelled'], 'Invalid status')
    .required('Status is required'),
  apartmentStatus: Yup.string()
    .oneOf(['vacant', 'occupied', 'under_renovation', 'reserved'], 'Invalid status')
    .required('Apartment status is required'),
  assignedTo: Yup.array().of(
    Yup.object({
      worker: Yup.string().required('Worker is required'),
      status: Yup.string()
        .oneOf(['pending', 'in_progress', 'completed', 'rejected'], 'Invalid status')
        .required('Status is required'),
    })
  ),
  services: Yup.array().of(
    Yup.object({
      type: Yup.string().required('Service type is required'),
      description: Yup.string().required('Description is required'),
      laborCost: Yup.number().min(0, 'Cost cannot be negative'),
      materialCost: Yup.number().min(0, 'Cost cannot be negative'),
      status: Yup.string()
        .oneOf(['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'], 'Invalid status')
        .required('Status is required'),
    })
  ),
});

export const serviceTypeOptions = [
  { value: 'painting', label: 'Painting' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'repair', label: 'Repair' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'other', label: 'Other' },
];

export const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const apartmentStatusOptions = [
  { value: 'vacant', label: 'Vacant' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'under_renovation', label: 'Under Renovation' },
  { value: 'reserved', label: 'Reserved' },
];

export const workerStatusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
];
