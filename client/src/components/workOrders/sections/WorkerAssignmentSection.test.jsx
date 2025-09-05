import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Formik, Form } from 'formik';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import WorkerAssignmentSection from './WorkerAssignmentSection';

// Mock all Material-UI components used in the test
jest.mock('@mui/material/TextField', () => {
  const MockedTextField = (props) => (
    <div>
      <label htmlFor={props.id || props.name}>{props.label}</label>
      <input
        type="text"
        name={props.name}
        value={props.value || ''}
        onChange={props.onChange}
        data-testid={`text-field-${props.name || 'input'}`}
      />
    </div>
  );
  MockedTextField.displayName = 'TextField';
  return { __esModule: true, default: MockedTextField };
});

jest.mock('@mui/material/Select', () => {
  const MockedSelect = ({ children, value, onChange, label, name, 'data-testid': testId }) => (
    <div data-testid={testId || `select-${name || 'select'}`}>
      <label>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange && onChange(e, { target: { value: e.target.value } })}
        data-testid={`${testId || `select-${name || 'select'}`}-input`}
      >
        {children}
      </select>
    </div>
  );
  MockedSelect.displayName = 'Select';
  return { __esModule: true, default: MockedSelect };
});

jest.mock('@mui/material/MenuItem', () => {
  const MockedMenuItem = ({ children, value, 'data-testid': testId }) => (
    <option value={value} data-testid={testId || `option-${value}`}>
      {children}
    </option>
  );
  MockedMenuItem.displayName = 'MenuItem';
  return { __esModule: true, default: MockedMenuItem };
});

jest.mock('@mui/material/Button', () => {
  const MockedButton = ({ children, onClick, 'data-testid': testId }) => (
    <button onClick={onClick} data-testid={testId || 'button'}>
      {children}
    </button>
  );
  MockedButton.displayName = 'Button';
  return { __esModule: true, default: MockedButton };
});

jest.mock('@mui/material/IconButton', () => {
  const MockedIconButton = ({ children, onClick, 'aria-label': ariaLabel }) => (
    <button onClick={onClick} data-testid="icon-button" aria-label={ariaLabel}>
      {children}
    </button>
  );
  MockedIconButton.displayName = 'IconButton';
  return { __esModule: true, default: MockedIconButton };
});

// Test wrapper component
const TestWrapper = ({ initialValues, workers }) => {
  return (
    <ThemeProvider theme={createTheme()}>
      <Formik initialValues={initialValues} onSubmit={() => {}}>
        {({ values, setFieldValue }) => (
          <Form>
            <WorkerAssignmentSection 
              workers={workers}
              values={values}
              setFieldValue={setFieldValue}
            />
          </Form>
        )}
      </Formik>
    </ThemeProvider>
  );
};

describe('WorkerAssignmentSection', () => {
  const mockWorkers = [
    { _id: '1', name: 'John Doe', role: 'worker' },
    { _id: '2', name: 'Jane Smith', role: 'worker' },
  ];

  const initialValues = {
    assignedTo: []
  };

  test('renders without crashing', () => {
    render(
      <TestWrapper 
        initialValues={initialValues}
        workers={mockWorkers}
      />
    );

    expect(screen.getByText(/assigned workers/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add worker/i })).toBeInTheDocument();
  });

  test('renders worker selection dropdown with options after adding a worker', () => {
    render(
      <TestWrapper 
        initialValues={initialValues}
        workers={mockWorkers}
      />
    );

    // Click the Add Worker button to show the form
    const addButton = screen.getByRole('button', { name: /add worker/i });
    fireEvent.click(addButton);
    
    // Now we should have form elements
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);
    
    // Check if we have the worker select
    const workerSelect = selects[0];
    expect(workerSelect).toBeInTheDocument();
    
    // Check if worker options are rendered
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);
  });

  test('allows adding a worker', () => {
    render(
      <TestWrapper 
        initialValues={initialValues}
        workers={mockWorkers}
      />
    );

    // Click the Add Worker button
    const addButton = screen.getByRole('button', { name: /add worker/i });
    fireEvent.click(addButton);

    // Check if we have at least one select (worker or status)
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);
  });

  test('allows adding and removing a worker', () => {
    render(
      <TestWrapper 
        initialValues={initialValues}
        workers={mockWorkers}
      />
    );

    // Initial state - no workers
    expect(screen.queryByRole('button', { name: /remove worker/i })).not.toBeInTheDocument();
    
    // Add a worker
    const addButton = screen.getByRole('button', { name: /add worker/i });
    fireEvent.click(addButton);
    
    // Should now have a remove button
    const removeButton = screen.getByRole('button', { name: /remove worker/i });
    expect(removeButton).toBeInTheDocument();
    
    // Remove the worker
    fireEvent.click(removeButton);
    
    // Should be back to initial state
    expect(screen.queryByRole('button', { name: /remove worker/i })).not.toBeInTheDocument();
  });

  test('allows adding a worker and changing status', () => {
    render(
      <TestWrapper 
        initialValues={initialValues}
        workers={mockWorkers}
      />
    );

    // Add a worker
    const addButton = screen.getByRole('button', { name: /add worker/i });
    fireEvent.click(addButton);
    
    // Find the status select (should be the second combobox)
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(2);
    
    const statusSelect = selects[1];
    
    // Simulate changing the status
    fireEvent.change(statusSelect, { target: { value: 'in_progress' } });
    
    // Verify the status was updated
    expect(statusSelect.value).toBe('in_progress');
  });

  test('allows adding notes for a worker', () => {
    render(
      <TestWrapper 
        initialValues={initialValues}
        workers={mockWorkers}
      />
    );

    // Add a worker first
    const addButton = screen.getByRole('button', { name: /add worker/i });
    fireEvent.click(addButton);
    
    // Find the notes input field
    const notesInput = screen.getByRole('textbox');
    
    // Simulate typing in the notes field
    fireEvent.change(notesInput, { target: { value: 'Test notes' } });
    
    // Verify the input value was updated
    expect(notesInput.value).toBe('Test notes');
  });
});
