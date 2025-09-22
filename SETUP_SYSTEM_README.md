# Construction Tracker - Dynamic Setup System

## Overview

The Setup System allows administrators to dynamically manage all dropdown values and work configurations across the Construction Tracker application. This eliminates hardcoded values and provides a flexible, database-driven configuration system.

## Features Implemented

### 1. Database Models
- **WorkType**: Main work categories (Cleaning, Painting, Repair, etc.)
- **WorkSubType**: Specific sub-categories linked to work types
- **DropdownConfig**: Generic dropdown configurations for various system options

### 2. Admin Setup Page
- **Location**: `/setup` (Admin only access)
- **Navigation**: Available in sidebar menu as "System Setup"
- **Tabs**: 
  - Work Types Management
  - Work Sub-Types Management  
  - Dropdown Configurations

### 3. CRUD Operations
- Create, Read, Update, Delete for all configuration types
- Real-time validation and error handling
- Soft delete for work types/subtypes to preserve data integrity

### 4. Dynamic Form Integration
- Work Order forms now fetch dropdown data from database
- Cascading dropdowns (Work Type → Work Sub-Type)
- Color-coded options for better UX

## Database Schema

### WorkType Model
```javascript
{
  name: String,           // Display name (e.g., "Cleaning")
  code: String,           // Unique code (e.g., "cleaning")
  description: String,    // Optional description
  color: String,          // Hex color for UI
  icon: String,           // Material-UI icon name
  isActive: Boolean,      // Soft delete flag
  sortOrder: Number,      // Display order
  createdBy: ObjectId,    // User reference
  updatedBy: ObjectId     // User reference
}
```

### WorkSubType Model
```javascript
{
  name: String,              // Display name (e.g., "1 Bedroom Cleaning")
  code: String,              // Unique code (e.g., "1br_cleaning")
  workType: ObjectId,        // Reference to WorkType
  description: String,       // Optional description
  estimatedDuration: Number, // Hours
  estimatedCost: Number,     // Cost estimate
  skillsRequired: [String],  // Required skills array
  isActive: Boolean,         // Soft delete flag
  sortOrder: Number,         // Display order
  createdBy: ObjectId,       // User reference
  updatedBy: ObjectId        // User reference
}
```

### DropdownConfig Model
```javascript
{
  category: String,          // Enum: priority, status, etc.
  name: String,              // Display name
  description: String,       // Optional description
  options: [{
    label: String,           // Display text
    value: String,           // Form value
    color: String,           // Hex color
    icon: String,            // Optional icon
    description: String,     // Optional description
    isActive: Boolean,       // Active flag
    sortOrder: Number        // Display order
  }],
  isActive: Boolean,         // Active flag
  isSystemManaged: Boolean,  // Admin-only edit flag
  createdBy: ObjectId,       // User reference
  updatedBy: ObjectId        // User reference
}
```

## API Endpoints

### Work Types
- `GET /api/v1/setup/work-types` - Get all work types
- `POST /api/v1/setup/work-types` - Create work type (Admin)
- `PUT /api/v1/setup/work-types/:id` - Update work type (Admin)
- `DELETE /api/v1/setup/work-types/:id` - Delete work type (Admin)

### Work Sub-Types
- `GET /api/v1/setup/work-subtypes` - Get all work sub-types
- `GET /api/v1/setup/work-subtypes?workType=:id` - Get by work type
- `POST /api/v1/setup/work-subtypes` - Create work sub-type (Admin)
- `PUT /api/v1/setup/work-subtypes/:id` - Update work sub-type (Admin)
- `DELETE /api/v1/setup/work-subtypes/:id` - Delete work sub-type (Admin)

### Dropdown Configurations
- `GET /api/v1/setup/dropdown-configs` - Get all configurations
- `POST /api/v1/setup/dropdown-configs` - Create configuration (Admin)
- `PUT /api/v1/setup/dropdown-configs/:id` - Update configuration (Admin)
- `GET /api/v1/setup/dropdown-options/:category` - Get options by category

## Migration Script

### Running the Migration
```bash
# Navigate to server directory
cd server

# Run the migration script
node scripts/runSetupMigration.js
```

### What the Migration Does
1. Creates default work types (Maintenance, Repair, Installation, etc.)
2. Creates work sub-types for each work type
3. Creates dropdown configurations for priority, status, and construction categories
4. Populates with DSJ company's specific work categories from your images

## Updated Work Order Integration

### Changes Made
1. **WorkOrder Model**: Updated to use ObjectId references instead of hardcoded enums
2. **WorkOrderForm**: Now fetches dropdown data from API
3. **Controller**: Added validation for work type/sub-type references
4. **Cascading Dropdowns**: Work sub-types filter based on selected work type

### Form Behavior
- Work Type dropdown populated from database
- Work Sub-Type dropdown filters based on selected work type
- Priority and Status dropdowns use dynamic configurations
- All dropdowns support colors and icons for better UX

## Construction Categories from DSJ

Based on your images, the following categories are pre-populated:

### Limpieza (Cleaning)
- 1br (un cuarto) - 1 bedroom cleaning
- 2Br - 2 bedroom cleaning  
- 3Br - 3 bedroom cleaning
- 1Br + den - 1 bedroom + den cleaning
- 2Br + den - 2 bedroom + den cleaning
- 3Br + den - 3 bedroom + den cleaning
- Studio - Studio cleaning
- Touch-up - Touch-up cleaning
- Gutter clean - Gutter cleaning

### Pintura (Painting)
- 1br (un cuarto) - 1 bedroom painting
- 2Br - 2 bedroom painting
- 3Br - 3 bedroom painting
- 1Br + den - 1 bedroom + den painting
- 2Br + den - 2 bedroom + den painting
- 3Br + den - 3 bedroom + den painting
- Studio - Studio painting
- Touch-up - Touch-up painting
- Puertas - Door painting

### Reparacion (Repair)
- Grietas pared - Wall crack repair
- Grietas ceiling - Ceiling crack repair
- Puertas - Door repair
- Ventanas - Window repair
- Plomeria - Plumbing repair
- Canaletas - Gutter repair

### Additional Categories
- **Carpetas (Carpets)**: Installation, Washing, Deep cleaning, Remove marks
- **Electricas (Electrical)**: HVAC, Compressor, Lamps
- **Carpinteria (Carpentry)**: Puertas, Deck, Siding, Decking

## Testing Instructions

### 1. Run Migration
```bash
cd server
node scripts/runSetupMigration.js
```

### 2. Access Setup Page
1. Login as admin user
2. Navigate to "System Setup" in sidebar
3. Test CRUD operations in each tab

### 3. Test Work Order Integration
1. Go to Work Orders → Create New
2. Verify dropdowns are populated from database
3. Test cascading behavior (Work Type → Work Sub-Type)
4. Create a work order and verify it saves correctly

### 4. Verify Data Persistence
1. Check MongoDB collections: `worktypes`, `worksubtypes`, `dropdownconfigs`
2. Verify work orders reference the new ObjectIds
3. Test editing existing work orders

## Security & Permissions

- **Setup Page**: Requires `manage:system` permission (Admin only)
- **API Endpoints**: Protected with authentication and role-based access
- **Data Integrity**: Prevents deletion of work types/sub-types in use
- **Validation**: Server-side validation for all CRUD operations

## Future Enhancements

1. **Import/Export**: Bulk import configurations from CSV/Excel
2. **Templates**: Pre-defined configuration templates for different business types
3. **Audit Trail**: Track all configuration changes
4. **Multi-language**: Support for multiple languages in dropdown labels
5. **Custom Fields**: Dynamic custom fields for work orders based on work type

## Troubleshooting

### Common Issues
1. **Migration Fails**: Ensure MongoDB connection is working
2. **Dropdowns Empty**: Run migration script to populate data
3. **Permission Denied**: Ensure user has admin role and `manage:system` permission
4. **Form Errors**: Check browser console for API errors

### Debug Steps
1. Check server logs for API errors
2. Verify database collections are populated
3. Test API endpoints directly with Postman
4. Check Redux DevTools for state management issues

This setup system provides a robust, scalable foundation for managing all dropdown configurations in the Construction Tracker application.
