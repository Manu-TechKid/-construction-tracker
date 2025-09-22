const mongoose = require('mongoose');
const WorkType = require('../models/WorkType');
const WorkSubType = require('../models/WorkSubType');
const DropdownConfig = require('../models/DropdownConfig');
const User = require('../models/User');

// Migration script to populate setup data
const migrateSetupData = async () => {
  try {
    console.log('Starting setup data migration...');

    // Find an admin user or create a default one
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      // If no admin exists, find any user and use their ID
      adminUser = await User.findOne();
      if (!adminUser) {
        // Create a default admin user ID if no users exist
        adminUser = { _id: new mongoose.Types.ObjectId() };
      }
    }
    const adminUserId = adminUser._id;

    // 1. Create Work Types
    const workTypesData = [
      {
        name: 'Maintenance',
        code: 'maintenance',
        description: 'General maintenance and upkeep tasks',
        color: '#2196f3',
        icon: 'build',
        sortOrder: 1,
        createdBy: adminUserId
      },
      {
        name: 'Repair',
        code: 'repair',
        description: 'Repair and fix existing issues',
        color: '#f44336',
        icon: 'handyman',
        sortOrder: 2,
        createdBy: adminUserId
      },
      {
        name: 'Installation',
        code: 'installation',
        description: 'Install new equipment or fixtures',
        color: '#4caf50',
        icon: 'construction',
        sortOrder: 3,
        createdBy: adminUserId
      },
      {
        name: 'Inspection',
        code: 'inspection',
        description: 'Inspection and assessment tasks',
        color: '#ff9800',
        icon: 'search',
        sortOrder: 4,
        createdBy: adminUserId
      },
      {
        name: 'Cleaning',
        code: 'cleaning',
        description: 'Cleaning and sanitation tasks',
        color: '#9c27b0',
        icon: 'cleaning_services',
        sortOrder: 5,
        createdBy: adminUserId
      },
      {
        name: 'Renovation',
        code: 'renovation',
        description: 'Renovation and improvement projects',
        color: '#607d8b',
        icon: 'home_repair_service',
        sortOrder: 6,
        createdBy: adminUserId
      },
      {
        name: 'Emergency',
        code: 'emergency',
        description: 'Emergency and urgent repairs',
        color: '#e91e63',
        icon: 'emergency',
        sortOrder: 7,
        createdBy: adminUserId
      },
      {
        name: 'Preventive',
        code: 'preventive',
        description: 'Preventive maintenance tasks',
        color: '#00bcd4',
        icon: 'schedule',
        sortOrder: 8,
        createdBy: adminUserId
      }
    ];

    // Clear existing work types
    await WorkType.deleteMany({});
    const createdWorkTypes = await WorkType.insertMany(workTypesData);
    console.log(`Created ${createdWorkTypes.length} work types`);

    // 2. Create Work Sub-Types
    const workSubTypesData = [
      // Maintenance sub-types
      {
        name: 'General Maintenance',
        code: 'general_maint',
        workType: createdWorkTypes.find(wt => wt.code === 'maintenance')._id,
        description: 'General maintenance tasks',
        estimatedDuration: 2,
        estimatedCost: 50,
        createdBy: adminUserId
      },
      {
        name: 'Preventive Maintenance',
        code: 'preventive_maint',
        workType: createdWorkTypes.find(wt => wt.code === 'maintenance')._id,
        description: 'Scheduled preventive maintenance',
        estimatedDuration: 3,
        estimatedCost: 75,
        createdBy: adminUserId
      },
      // Repair sub-types
      {
        name: 'Plumbing',
        code: 'plumbing',
        workType: createdWorkTypes.find(wt => wt.code === 'repair')._id,
        description: 'Plumbing repairs and fixes',
        estimatedDuration: 4,
        estimatedCost: 100,
        skillsRequired: ['plumbing'],
        createdBy: adminUserId
      },
      {
        name: 'Electrical',
        code: 'electrical',
        workType: createdWorkTypes.find(wt => wt.code === 'repair')._id,
        description: 'Electrical repairs and maintenance',
        estimatedDuration: 3,
        estimatedCost: 120,
        skillsRequired: ['electrical'],
        createdBy: adminUserId
      },
      {
        name: 'HVAC',
        code: 'hvac',
        workType: createdWorkTypes.find(wt => wt.code === 'repair')._id,
        description: 'Heating, ventilation, and air conditioning',
        estimatedDuration: 5,
        estimatedCost: 150,
        skillsRequired: ['hvac'],
        createdBy: adminUserId
      },
      {
        name: 'Appliance',
        code: 'appliance',
        workType: createdWorkTypes.find(wt => wt.code === 'repair')._id,
        description: 'Appliance repairs and maintenance',
        estimatedDuration: 2,
        estimatedCost: 80,
        createdBy: adminUserId
      },
      // Installation sub-types
      {
        name: 'New Appliance',
        code: 'new_appliance',
        workType: createdWorkTypes.find(wt => wt.code === 'installation')._id,
        description: 'Install new appliances',
        estimatedDuration: 3,
        estimatedCost: 100,
        createdBy: adminUserId
      },
      {
        name: 'Fixture Installation',
        code: 'fixture_install',
        workType: createdWorkTypes.find(wt => wt.code === 'installation')._id,
        description: 'Install fixtures and fittings',
        estimatedDuration: 2,
        estimatedCost: 60,
        createdBy: adminUserId
      },
      // Cleaning sub-types
      {
        name: '1 Bedroom Cleaning',
        code: '1br_cleaning',
        workType: createdWorkTypes.find(wt => wt.code === 'cleaning')._id,
        description: 'Clean 1 bedroom apartment',
        estimatedDuration: 3,
        estimatedCost: 80,
        createdBy: adminUserId
      },
      {
        name: '2 Bedroom Cleaning',
        code: '2br_cleaning',
        workType: createdWorkTypes.find(wt => wt.code === 'cleaning')._id,
        description: 'Clean 2 bedroom apartment',
        estimatedDuration: 4,
        estimatedCost: 100,
        createdBy: adminUserId
      },
      {
        name: '3 Bedroom Cleaning',
        code: '3br_cleaning',
        workType: createdWorkTypes.find(wt => wt.code === 'cleaning')._id,
        description: 'Clean 3 bedroom apartment',
        estimatedDuration: 5,
        estimatedCost: 120,
        createdBy: adminUserId
      }
    ];

    // Clear existing work sub-types
    await WorkSubType.deleteMany({});
    const createdWorkSubTypes = await WorkSubType.insertMany(workSubTypesData);
    console.log(`Created ${createdWorkSubTypes.length} work sub-types`);

    // 3. Create Dropdown Configurations
    const dropdownConfigs = [
      {
        category: 'priority',
        name: 'Work Order Priority',
        description: 'Priority levels for work orders',
        options: [
          { label: 'Low', value: 'low', color: '#4caf50', sortOrder: 1, isActive: true },
          { label: 'Medium', value: 'medium', color: '#ff9800', sortOrder: 2, isActive: true },
          { label: 'High', value: 'high', color: '#f44336', sortOrder: 3, isActive: true },
          { label: 'Urgent', value: 'urgent', color: '#e91e63', sortOrder: 4, isActive: true }
        ],
        isSystemManaged: true,
        createdBy: adminUserId
      },
      {
        category: 'status',
        name: 'Work Order Status',
        description: 'Status options for work orders',
        options: [
          { label: 'Pending', value: 'pending', color: '#ff9800', sortOrder: 1, isActive: true },
          { label: 'In Progress', value: 'in_progress', color: '#2196f3', sortOrder: 2, isActive: true },
          { label: 'On Hold', value: 'on_hold', color: '#9e9e9e', sortOrder: 3, isActive: true },
          { label: 'Completed', value: 'completed', color: '#4caf50', sortOrder: 4, isActive: true },
          { label: 'Cancelled', value: 'cancelled', color: '#f44336', sortOrder: 5, isActive: true }
        ],
        isSystemManaged: true,
        createdBy: adminUserId
      },
      {
        category: 'construction_category',
        name: 'Construction Categories',
        description: 'Main construction work categories from DSJ operations',
        options: [
          { label: 'Limpieza (Cleaning)', value: 'limpieza', color: '#9c27b0', sortOrder: 1, isActive: true },
          { label: 'Pintura (Painting)', value: 'pintura', color: '#3f51b5', sortOrder: 2, isActive: true },
          { label: 'Reparacion (Repair)', value: 'reparacion', color: '#f44336', sortOrder: 3, isActive: true },
          { label: 'Carpetas (Carpets)', value: 'carpetas', color: '#795548', sortOrder: 4, isActive: true },
          { label: 'Electricas (Electrical)', value: 'electricas', color: '#ff9800', sortOrder: 5, isActive: true },
          { label: 'Carpinteria (Carpentry)', value: 'carpinteria', color: '#607d8b', sortOrder: 6, isActive: true }
        ],
        createdBy: adminUserId
      }
    ];

    // Clear existing dropdown configs
    await DropdownConfig.deleteMany({});
    const createdDropdownConfigs = await DropdownConfig.insertMany(dropdownConfigs);
    console.log(`Created ${createdDropdownConfigs.length} dropdown configurations`);

    console.log('Setup data migration completed successfully!');
    return {
      workTypes: createdWorkTypes.length,
      workSubTypes: createdWorkSubTypes.length,
      dropdownConfigs: createdDropdownConfigs.length
    };

  } catch (error) {
    console.error('Error during setup data migration:', error);
    throw error;
  }
};

module.exports = { migrateSetupData };
