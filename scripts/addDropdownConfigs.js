const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/v1';

const dropdownConfigs = [
  {
    "category": "priority",
    "name": "Priority",
    "description": "Work order priority levels",
    "options": [
      {"label": "Low", "value": "low", "color": "#4CAF50", "sortOrder": 1, "isActive": true},
      {"label": "Medium", "value": "medium", "color": "#FFC107", "sortOrder": 2, "isActive": true},
      {"label": "High", "value": "high", "color": "#FF5722", "sortOrder": 3, "isActive": true},
      {"label": "Emergency", "value": "emergency", "color": "#F44336", "sortOrder": 4, "isActive": true}
    ],
    "isActive": true,
    "isSystemManaged": true
  },
  {
    "category": "status",
    "name": "Status", 
    "description": "Work order status options",
    "options": [
      {"label": "New", "value": "new", "color": "#2196F3", "sortOrder": 1, "isActive": true},
      {"label": "In Progress", "value": "in-progress", "color": "#FFC107", "sortOrder": 2, "isActive": true},
      {"label": "On Hold", "value": "on-hold", "color": "#9E9E9E", "sortOrder": 3, "isActive": true},
      {"label": "Completed", "value": "completed", "color": "#4CAF50", "sortOrder": 4, "isActive": true},
      {"label": "Cancelled", "value": "cancelled", "color": "#F44336", "sortOrder": 5, "isActive": true}
    ],
    "isActive": true,
    "isSystemManaged": true
  }
];

const addDropdownConfigs = async () => {
  try {
    console.log('Adding dropdown configurations...');
    
    for (const config of dropdownConfigs) {
      try {
        const response = await axios.post(`${API_BASE}/setup/dropdown-configs`, config);
        console.log(`✅ Added ${config.category} dropdown config`);
      } catch (error) {
        if (error.response?.status === 401) {
          console.log(`⚠️  Authentication required for ${config.category}, skipping...`);
        } else {
          console.error(`❌ Error adding ${config.category}:`, error.response?.data?.message || error.message);
        }
      }
    }
    
    console.log('\n=== Testing dropdown options ===');
    
    // Test the dropdown options endpoints
    for (const config of dropdownConfigs) {
      try {
        const response = await axios.get(`${API_BASE}/setup/dropdown-options/${config.category}`);
        console.log(`✅ ${config.category} options:`, response.data.data.options.length, 'options');
      } catch (error) {
        console.error(`❌ Error getting ${config.category} options:`, error.response?.data?.message || error.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
};

addDropdownConfigs();
