import { getInitialValues, formatFormDataForSubmit, calculateTotalEstimatedCost } from './formHelpers';

describe('formHelpers', () => {
  describe('getInitialValues', () => {
    it('returns default values when no work order is provided', () => {
      const result = getInitialValues();
      
      expect(result.title).toBe('');
      expect(result.building).toBe('');
      expect(result.apartmentNumber).toBe('');
      expect(result.description).toBe('');
      expect(result.priority).toBe('medium');
      expect(result.status).toBe('pending');
      expect(Array.isArray(result.assignedTo)).toBe(true);
      expect(Array.isArray(result.services)).toBe(true);
      expect(Array.isArray(result.photos)).toBe(true);
      expect(result.notes).toBe('');
    });

    it('returns work order values when provided', () => {
      const workOrder = {
        _id: '1',
        title: 'Test Work Order',
        building: { _id: 'building-1', name: 'Building 1' },
        apartmentNumber: '101',
        description: 'Test description',
        priority: 'high',
        status: 'in_progress',
        assignedTo: [
          { 
            _id: 'assignment-1',
            worker: { _id: 'user-1', name: 'John Doe' },
            status: 'assigned',
            notes: 'Test notes',
            timeSpent: { hours: 2, minutes: 30 },
            materials: []
          }
        ],
        services: [
          {
            _id: 'service-1',
            type: 'painting',
            description: 'Paint walls',
            status: 'pending',
            laborCost: 100,
            materialCost: 50,
            estimatedHours: 2,
            notes: ['Wall color: White']
          }
        ],
        startDate: '2023-01-01T09:00:00.000Z',
        endDate: '2023-01-01T17:00:00.000Z',
        scheduledDate: '2023-01-01T09:00:00.000Z',
        estimatedCompletionDate: '2023-01-01T17:00:00.000Z',
        estimatedCost: 150,
        actualCost: 0,
        notes: 'Initial notes',
        photos: ['photo1.jpg', 'photo2.jpg'],
        createdAt: '2023-01-01T09:00:00.000Z',
        updatedAt: '2023-01-01T09:00:00.000Z',
        createdBy: 'user-1',
        updatedBy: 'user-1',
        completedBy: null,
        completedAt: null
      };

      const result = getInitialValues(workOrder);
      
      expect(result.title).toBe('Test Work Order');
      expect(result.building).toEqual({ _id: 'building-1', name: 'Building 1' });
      expect(result.status).toBe('in_progress');
      expect(Array.isArray(result.assignedTo)).toBe(true);
      expect(result.assignedTo[0].worker).toBe('user-1');
      expect(result.assignedTo[0].status).toBe('assigned');
    });
  });

  describe('formatFormDataForSubmit', () => {
    it('formats form data for API submission with all fields', () => {
      const startDate = new Date('2023-05-15T09:00:00.000Z');
      const endDate = new Date('2023-05-15T17:00:00.000Z');
      const scheduledDate = new Date('2023-05-14T09:00:00.000Z');
      
      const formData = {
        title: 'Test Work Order',
        building: { _id: 'building-1', name: 'Test Building' },
        apartmentNumber: 'A101',
        block: 'B',
        floor: '2',
        apartmentStatus: 'occupied',
        description: 'Test description',
        priority: 'high',
        status: 'pending',
        assignedTo: [
          { 
            _id: 'assignment-1',
            worker: { _id: 'user-1', name: 'John Doe' }, 
            status: 'pending', 
            notes: 'Test notes',
            timeSpent: { hours: 2, minutes: 30 },
            materials: [{ name: 'Paint', quantity: 2 }],
            assignedAt: '2023-05-10T10:00:00.000Z',
            assignedBy: 'admin-1'
          },
          // Test with string worker ID
          'user-2'
        ],
        services: [
          {
            type: 'painting',
            description: 'Paint living room',
            laborCost: 150,
            materialCost: 100,
            estimatedHours: 2,
            status: 'pending',
            notes: ['Wall color: Beige'],
            completedAt: null,
            completedBy: null
          },
          // Test minimal service object
          {
            type: 'cleaning',
            description: 'Clean after painting'
          }
        ],
        startDate,
        endDate,
        scheduledDate,
        estimatedCompletionDate: endDate,
        estimatedCost: 250,
        actualCost: 0,
        notes: ['Initial inspection required'],
        photos: ['photo1.jpg', 'photo2.jpg'],
        createdAt: '2023-05-10T09:00:00.000Z',
        updatedAt: '2023-05-10T09:00:00.000Z',
        createdBy: 'admin-1',
        updatedBy: 'admin-1',
        completedBy: '',
        completedAt: null
      };
      
      const result = formatFormDataForSubmit(formData, 250);
      
      // Check basic fields
      expect(result).toHaveProperty('title', 'Test Work Order');
      expect(result).toHaveProperty('building._id', 'building-1');
      expect(result).toHaveProperty('apartmentNumber', 'A101');
      expect(result).toHaveProperty('block', 'B');
      expect(result).toHaveProperty('floor', '2');
      expect(result).toHaveProperty('apartmentStatus', 'occupied');
      expect(result).toHaveProperty('description', 'Test description');
      expect(result).toHaveProperty('priority', 'high');
      expect(result).toHaveProperty('status', 'pending');
      expect(result).toHaveProperty('estimatedCost', 250);
      
      // Check dates are properly formatted as ISO strings
      expect(result.startDate).toBe(startDate.toISOString());
      expect(result.endDate).toBe(endDate.toISOString());
      expect(result.scheduledDate).toBe(scheduledDate.toISOString());
      expect(result.estimatedCompletionDate).toBe(endDate.toISOString());
      
      // Check assignedTo array
      expect(Array.isArray(result.assignedTo)).toBe(true);
      expect(result.assignedTo.length).toBe(2);
      
      // First assignment (full object)
      const firstAssignment = result.assignedTo[0];
      expect(firstAssignment).toHaveProperty('worker', 'user-1');
      expect(firstAssignment).toHaveProperty('status', 'pending');
      expect(firstAssignment).toHaveProperty('notes', 'Test notes');
      expect(firstAssignment.timeSpent).toEqual({ hours: 2, minutes: 30 });
      expect(Array.isArray(firstAssignment.materials)).toBe(true);
      expect(firstAssignment.materials).toEqual([{ name: 'Paint', quantity: 2 }]);
      expect(firstAssignment).toHaveProperty('assignedAt', '2023-05-10T10:00:00.000Z');
      expect(firstAssignment).toHaveProperty('assignedBy', 'admin-1');
      
      // Second assignment (string ID)
      const secondAssignment = result.assignedTo[1];
      expect(secondAssignment).toHaveProperty('worker', 'user-2');
      expect(secondAssignment).toHaveProperty('status', 'pending');
      expect(secondAssignment).toHaveProperty('notes', '');
      expect(secondAssignment.timeSpent).toEqual({ hours: 0, minutes: 0 });
      expect(Array.isArray(secondAssignment.materials)).toBe(true);
      expect(secondAssignment.materials).toEqual([]);
      expect(secondAssignment).toHaveProperty('assignedAt');
      expect(secondAssignment).toHaveProperty('assignedBy', 'system');
      
      // Check services array
      expect(Array.isArray(result.services)).toBe(true);
      expect(result.services.length).toBe(2);
      
      // First service (full object)
      const firstService = result.services[0];
      expect(firstService).toHaveProperty('type', 'painting');
      expect(firstService).toHaveProperty('description', 'Paint living room');
      expect(firstService).toHaveProperty('laborCost', 150);
      expect(firstService).toHaveProperty('materialCost', 100);
      expect(firstService).toHaveProperty('estimatedHours', 2);
      expect(firstService).toHaveProperty('status', 'pending');
      expect(Array.isArray(firstService.notes)).toBe(true);
      expect(firstService.notes).toEqual(['Wall color: Beige']);
      
      // Second service (minimal object)
      const secondService = result.services[1];
      expect(secondService).toHaveProperty('type', 'cleaning');
      expect(secondService).toHaveProperty('description', 'Clean after painting');
      expect(secondService).toHaveProperty('laborCost', 0);
      expect(secondService).toHaveProperty('materialCost', 0);
      expect(secondService).toHaveProperty('estimatedHours', 1);
      expect(secondService).toHaveProperty('status', 'pending');
      expect(Array.isArray(secondService.notes)).toBe(true);
      expect(secondService.notes).toEqual([]);
      
      // Check arrays are always arrays
      expect(Array.isArray(result.notes)).toBe(true);
      expect(Array.isArray(result.photos)).toBe(true);
      
      // Check audit fields are preserved
      expect(result).toHaveProperty('createdAt', '2023-05-10T09:00:00.000Z');
      expect(result).toHaveProperty('updatedAt', '2023-05-10T09:00:00.000Z');
      expect(result).toHaveProperty('createdBy', 'admin-1');
      expect(result).toHaveProperty('updatedBy', 'admin-1');
      expect(result).toHaveProperty('completedBy', '');
      expect(result).toHaveProperty('completedAt', null);
    });

    it('handles empty and null values correctly', () => {
      const result = formatFormDataForSubmit({}, 0);
      
      // Check default values for empty object
      expect(result).toHaveProperty('title', '');
      expect(result).toHaveProperty('building', undefined);
      expect(result).toHaveProperty('apartmentNumber', '');
      expect(result).toHaveProperty('description', '');
      expect(result).toHaveProperty('priority', 'medium');
      expect(result).toHaveProperty('status', 'pending');
      expect(result).toHaveProperty('estimatedCost', 0);
      
      // Check arrays are empty but defined
      expect(Array.isArray(result.assignedTo)).toBe(true);
      expect(result.assignedTo.length).toBe(0);
      
      expect(Array.isArray(result.services)).toBe(true);
      expect(result.services.length).toBe(0);
      
      expect(Array.isArray(result.notes)).toBe(true);
      expect(result.notes.length).toBe(0);
      
      expect(Array.isArray(result.photos)).toBe(true);
      expect(result.photos.length).toBe(0);
      
      // Check dates are properly initialized
      expect(result.startDate).toBeDefined();
      expect(result.endDate).toBeDefined();
      expect(result.scheduledDate).toBeDefined();
      expect(result.estimatedCompletionDate).toBeDefined();
    });
    
    it('handles partial data correctly', () => {
      const partialData = {
        title: 'Partial Work Order',
        building: 'building-1',
        assignedTo: [
          { worker: 'user-1' },
          { worker: { _id: 'user-2' }}
        ],
        services: [
          { type: 'cleaning' }
        ]
      };
      
      const result = formatFormDataForSubmit(partialData, 0);
      
      // Check basic fields
      expect(result).toHaveProperty('title', 'Partial Work Order');
      expect(result).toHaveProperty('building', 'building-1');
      
      // Check assignedTo with partial data
      expect(Array.isArray(result.assignedTo)).toBe(true);
      expect(result.assignedTo.length).toBe(2);
      
      // First assignment (string worker ID)
      expect(result.assignedTo[0]).toHaveProperty('worker', 'user-1');
      expect(result.assignedTo[0]).toHaveProperty('status', 'pending');
      expect(result.assignedTo[0]).toHaveProperty('notes', '');
      expect(result.assignedTo[0].timeSpent).toEqual({ hours: 0, minutes: 0 });
      
      // Second assignment (object worker ID)
      expect(result.assignedTo[1]).toHaveProperty('worker', 'user-2');
      
      // Check service with partial data
      expect(Array.isArray(result.services)).toBe(true);
      expect(result.services.length).toBe(1);
      expect(result.services[0]).toHaveProperty('type', 'cleaning');
      expect(result.services[0]).toHaveProperty('description', '');
      expect(result.services[0]).toHaveProperty('laborCost', 0);
      expect(result.services[0]).toHaveProperty('materialCost', 0);
      expect(result.services[0]).toHaveProperty('estimatedHours', 1);
      expect(result.services[0]).toHaveProperty('status', 'pending');
      expect(Array.isArray(result.services[0].notes)).toBe(true);
      expect(result.services[0].notes).toEqual([]);
    });
  });

  describe('calculateTotalEstimatedCost', () => {
    it('calculates total cost correctly', () => {
      const services = [
        { laborCost: 100, materialCost: 50 },
        { laborCost: 200, materialCost: 75 }
      ];
      
      const result = calculateTotalEstimatedCost(services);
      expect(result).toBe(425); // 100 + 50 + 200 + 75 = 425
    });
    
    it('returns 0 for empty services array', () => {
      const result = calculateTotalEstimatedCost([]);
      expect(result).toBe(0);
    });
    
    it('handles missing cost values', () => {
      const services = [
        { laborCost: 100 },
        { materialCost: 50 },
        {}
      ];
      
      const result = calculateTotalEstimatedCost(services);
      expect(result).toBe(150); // 100 + 50 + 0 + 0 = 150
    });
  });
});
