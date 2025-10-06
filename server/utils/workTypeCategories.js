// DSJ Company Work Type Categories
const WORK_TYPE_CATEGORIES = {
  painting: {
    label: 'Painting Services',
    subTypes: [
      { value: 'apartment_1_room', label: '1 Room Apartment Painting' },
      { value: 'apartment_2_room', label: '2 Room Apartment Painting' },
      { value: 'apartment_3_room', label: '3 Room Apartment Painting' },
      { value: 'doors', label: 'Door Painting' },
      { value: 'ceilings', label: 'Ceiling Painting' },
      { value: 'cabinets', label: 'Cabinet Painting' },
      { value: 'hallways', label: 'Hallway Painting' },
      { value: 'touch_up', label: 'Paint Touch-ups' },
      { value: 'exterior', label: 'Exterior Painting' },
      { value: 'trim_molding', label: 'Trim & Molding Painting' }
    ]
  },
  cleaning: {
    label: 'Cleaning Services',
    subTypes: [
      { value: 'apartment_1_bedroom', label: '1 Bedroom Apartment Cleaning' },
      { value: 'apartment_2_bedroom', label: '2 Bedroom Apartment Cleaning' },
      { value: 'apartment_3_bedroom', label: '3 Bedroom Apartment Cleaning' },
      { value: 'touch_up_cleaning', label: 'Touch-up Cleaning' },
      { value: 'heavy_cleaning', label: 'Heavy Cleaning' },
      { value: 'carpet_cleaning', label: 'Carpet Cleaning' },
      { value: 'gutter_cleaning', label: 'Gutter Cleaning' },
      { value: 'window_cleaning', label: 'Window Cleaning' },
      { value: 'deep_cleaning', label: 'Deep Cleaning' },
      { value: 'move_out_cleaning', label: 'Move-out Cleaning' }
    ]
  },
  repair: {
    label: 'Repair Services',
    subTypes: [
      { value: 'air_conditioning', label: 'Air Conditioning Repair' },
      { value: 'door_repair', label: 'Door Repair' },
      { value: 'ceiling_repair', label: 'Ceiling Repair' },
      { value: 'floor_repair', label: 'Floor Repair' },
      { value: 'plumbing', label: 'Plumbing Repair' },
      { value: 'electrical', label: 'Electrical Repair' },
      { value: 'drywall', label: 'Drywall Repair' },
      { value: 'tile_repair', label: 'Tile Repair' },
      { value: 'appliance_repair', label: 'Appliance Repair' },
      { value: 'general_maintenance', label: 'General Maintenance' }
    ]
  },
  maintenance: {
    label: 'Maintenance Services',
    subTypes: [
      { value: 'preventive', label: 'Preventive Maintenance' },
      { value: 'hvac_maintenance', label: 'HVAC Maintenance' },
      { value: 'plumbing_maintenance', label: 'Plumbing Maintenance' },
      { value: 'electrical_maintenance', label: 'Electrical Maintenance' },
      { value: 'landscaping', label: 'Landscaping Maintenance' },
      { value: 'safety_inspection', label: 'Safety Inspection' }
    ]
  },
  inspection: {
    label: 'Inspection Services',
    subTypes: [
      { value: 'move_in', label: 'Move-in Inspection' },
      { value: 'move_out', label: 'Move-out Inspection' },
      { value: 'routine', label: 'Routine Inspection' },
      { value: 'damage_assessment', label: 'Damage Assessment' },
      { value: 'safety_check', label: 'Safety Check' }
    ]
  },
  other: {
    label: 'Other Services',
    subTypes: [
      { value: 'emergency', label: 'Emergency Service' },
      { value: 'consultation', label: 'Consultation' },
      { value: 'estimate', label: 'Estimate/Quote' },
      { value: 'custom', label: 'Custom Service' }
    ]
  }
};

// Get sub-types for a specific work type
const getSubTypesForWorkType = (workType) => {
  return WORK_TYPE_CATEGORIES[workType]?.subTypes || [];
};

// Get all work types
const getAllWorkTypes = () => {
  return Object.keys(WORK_TYPE_CATEGORIES).map(key => ({
    value: key,
    label: WORK_TYPE_CATEGORIES[key].label
  }));
};

// Get label for work type
const getWorkTypeLabel = (workType) => {
  return WORK_TYPE_CATEGORIES[workType]?.label || workType;
};

// Get label for sub-type
const getSubTypeLabel = (workType, subType) => {
  const subTypes = getSubTypesForWorkType(workType);
  const subTypeObj = subTypes.find(st => st.value === subType);
  return subTypeObj?.label || subType;
};

module.exports = {
  WORK_TYPE_CATEGORIES,
  getSubTypesForWorkType,
  getAllWorkTypes,
  getWorkTypeLabel,
  getSubTypeLabel
};
