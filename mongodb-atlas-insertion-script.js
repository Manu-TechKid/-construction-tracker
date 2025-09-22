// MongoDB Atlas Manual Insertion Script
// Use this script in MongoDB Atlas Shell or copy individual documents

// STEP 1: Insert Work Types (Insert these first)
// Copy and paste each document individually in MongoDB Atlas

// Work Type 1: Maintenance
{
  "name": "Maintenance",
  "code": "maintenance",
  "description": "Routine maintenance tasks",
  "color": "#2196F3",
  "icon": "build",
  "sortOrder": 1,
  "isActive": true
}

// Work Type 2: Repair
{
  "name": "Repair",
  "code": "repair", 
  "description": "Fix broken items or systems",
  "color": "#FF5722",
  "icon": "handyman",
  "sortOrder": 2,
  "isActive": true
}

// Work Type 3: Cleaning
{
  "name": "Cleaning",
  "code": "cleaning",
  "description": "General cleaning services", 
  "color": "#4CAF50",
  "icon": "cleaning_services",
  "sortOrder": 3,
  "isActive": true
}

// Work Type 4: Inspection
{
  "name": "Inspection",
  "code": "inspection",
  "description": "Routine inspections and assessments",
  "color": "#9C27B0", 
  "icon": "search",
  "sortOrder": 4,
  "isActive": true
}

// Work Type 5: Renovation
{
  "name": "Renovation",
  "code": "renovation",
  "description": "Major upgrades and remodeling",
  "color": "#FF9800",
  "icon": "home_repair_service", 
  "sortOrder": 5,
  "isActive": true
}

// STEP 2: Get Work Type ObjectIds
// After inserting work types, note down their ObjectIds from MongoDB Atlas
// Replace MAINTENANCE_ID, REPAIR_ID, CLEANING_ID with actual ObjectIds

// STEP 3: Insert Work Sub-Types (Replace ObjectIds with actual values)
// Work Sub-Type 1: Preventive Maintenance
{
  "name": "Preventive Maintenance",
  "code": "preventive",
  "workType": ObjectId("MAINTENANCE_ID_HERE"),
  "description": "Scheduled maintenance to prevent issues",
  "estimatedDuration": 2,
  "estimatedCost": 100,
  "isActive": true,
  "sortOrder": 1
}

// Work Sub-Type 2: Corrective Maintenance  
{
  "name": "Corrective Maintenance",
  "code": "corrective", 
  "workType": ObjectId("MAINTENANCE_ID_HERE"),
  "description": "Fix existing issues",
  "estimatedDuration": 3,
  "estimatedCost": 150,
  "isActive": true,
  "sortOrder": 2
}

// Work Sub-Type 3: Electrical Repair
{
  "name": "Electrical Repair",
  "code": "electrical",
  "workType": ObjectId("REPAIR_ID_HERE"),
  "description": "Electrical system repairs", 
  "estimatedDuration": 4,
  "estimatedCost": 200,
  "isActive": true,
  "sortOrder": 1
}

// Work Sub-Type 4: Plumbing Repair
{
  "name": "Plumbing Repair", 
  "code": "plumbing",
  "workType": ObjectId("REPAIR_ID_HERE"),
  "description": "Plumbing system repairs",
  "estimatedDuration": 3,
  "estimatedCost": 180,
  "isActive": true,
  "sortOrder": 2
}

// Work Sub-Type 5: Deep Cleaning
{
  "name": "Deep Cleaning",
  "code": "deep-clean",
  "workType": ObjectId("CLEANING_ID_HERE"),
  "description": "Thorough cleaning service",
  "estimatedDuration": 6,
  "estimatedCost": 120,
  "isActive": true,
  "sortOrder": 1
}

// Work Sub-Type 6: Window Cleaning
{
  "name": "Window Cleaning",
  "code": "window-clean", 
  "workType": ObjectId("CLEANING_ID_HERE"),
  "description": "Professional window cleaning",
  "estimatedDuration": 2,
  "estimatedCost": 80,
  "isActive": true,
  "sortOrder": 2
}

// STEP 4: Insert Dropdown Configurations

// Priority Dropdown
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
}

// Status Dropdown
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

// INSTRUCTIONS:
// 1. Insert Work Types first (5 documents)
// 2. Note down the ObjectIds of each work type
// 3. Replace MAINTENANCE_ID_HERE, REPAIR_ID_HERE, CLEANING_ID_HERE with actual ObjectIds
// 4. Insert Work Sub-Types (6 documents) 
// 5. Insert Dropdown Configurations (2 documents)
// 6. Remove createdBy and updatedBy fields if you don't have user ObjectIds
