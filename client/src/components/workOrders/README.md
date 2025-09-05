# Work Order Components

This directory contains the refactored Work Order form components, designed to be more maintainable, testable, and reusable.

## Component Structure

```
workOrders/
├── WorkOrderFormNew.jsx        # Main form component
├── sections/                   # Form sections
│   ├── WorkerAssignmentSection.jsx  # Worker assignment section
│   └── ServicesSection.jsx     # Services section
└── utils/                      # Utility functions
    ├── validationSchema.js     # Form validation schemas
    ├── formHelpers.js          # Form helper functions
    └── dateUtils.js            # Date utility functions
```

## Key Features

### WorkOrderFormNew.jsx
- Main form component that integrates all sections
- Handles form state using Formik
- Manages form submission and validation
- Integrates with Redux for data fetching

### WorkerAssignmentSection.jsx
- Manages worker assignment to work orders
- Supports multiple worker assignments
- Tracks worker status and notes
- Validates worker assignments

### ServicesSection.jsx
- Manages multiple services per work order
- Calculates total costs (labor + materials)
- Tracks service status and details
- Validates service entries

## Usage

### Creating a New Work Order
```jsx
import WorkOrderForm from './components/workOrders/WorkOrderFormNew';

function CreateWorkOrder() {
  const handleSubmit = async (values) => {
    // Handle form submission
  };

  return (
    <WorkOrderForm 
      mode="create"
      onSubmit={handleSubmit}
      onCancel={() => navigate(-1)}
    />
  );
}
```

### Editing an Existing Work Order
```jsx
import WorkOrderForm from './components/workOrders/WorkOrderFormNew';

function EditWorkOrder() {
  const { id } = useParams();
  const { data: workOrder, isLoading } = useGetWorkOrderQuery(id);
  const [updateWorkOrder] = useUpdateWorkOrderMutation();

  const handleSubmit = async (values) => {
    try {
      await updateWorkOrder({ id, ...values }).unwrap();
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <WorkOrderForm 
      mode="edit"
      initialValues={workOrder}
      onSubmit={handleSubmit}
      onCancel={() => navigate(-1)}
    />
  );
}
```

## Validation

The form includes comprehensive validation using Yup schemas. Validation rules include:
- Required fields
- Minimum/maximum lengths
- Date validations
- Cost validations
- Worker assignment validations

## Testing

Component tests are located alongside the components they test with the `.test.jsx` extension. Run tests using:

```bash
npm test
```

## Best Practices

1. **Component Composition**: Each section is a self-contained component that can be tested and maintained independently.
2. **State Management**: Uses Formik for form state and validation.
3. **Performance**: Memoized components and callbacks where appropriate.
4. **Accessibility**: Includes proper ARIA labels and keyboard navigation.
5. **Responsive Design**: Works on mobile and desktop viewports.

## Dependencies

- @mui/material: For UI components
- formik: For form state management
- yup: For form validation
- date-fns: For date manipulation
- react-dropzone: For file uploads
