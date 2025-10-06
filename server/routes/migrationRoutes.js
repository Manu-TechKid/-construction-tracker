const express = require('express');
const { migrateSetupData } = require('../migrations/setupDataMigration');
const authController = require('../controllers/authController');
const { restrictToRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Migration endpoint - Admin only
router.post('/run-setup-migration', restrictToRoles('admin'), async (req, res) => {
  try {
    console.log('Starting setup migration via API endpoint...');
    
    const result = await migrateSetupData();
    
    res.status(200).json({
      success: true,
      message: 'Setup migration completed successfully!',
      data: {
        workTypes: result.workTypes,
        workSubTypes: result.workSubTypes,
        dropdownConfigs: result.dropdownConfigs
      }
    });
  } catch (error) {
    console.error('Migration failed:', error);
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message
    });
  }
});

// Check migration status
router.get('/migration-status', restrictToRoles('admin'), async (req, res) => {
  try {
    const WorkType = require('../models/WorkType');
    const WorkSubType = require('../models/WorkSubType');
    const DropdownConfig = require('../models/DropdownConfig');
    
    const workTypesCount = await WorkType.countDocuments();
    const workSubTypesCount = await WorkSubType.countDocuments();
    const dropdownConfigsCount = await DropdownConfig.countDocuments();
    
    res.status(200).json({
      success: true,
      data: {
        workTypes: workTypesCount,
        workSubTypes: workSubTypesCount,
        dropdownConfigs: dropdownConfigsCount,
        migrationNeeded: workTypesCount === 0 && workSubTypesCount === 0 && dropdownConfigsCount === 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check migration status',
      error: error.message
    });
  }
});

module.exports = router;
