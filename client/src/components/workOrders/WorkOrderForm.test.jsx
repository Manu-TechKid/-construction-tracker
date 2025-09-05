import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';
import WorkOrderForm from './WorkOrderFormNew';

// Mock API responses
const mockBuildings = [
  { _id: '1', name: 'Building A' },
  { _id: '2', name: 'Building B' },
];

const mockWorkers = [
  { _id: 'w1', name: 'Worker 1', role: 'worker' },
  { _id: 'w2', name: 'Worker 2', role: 'worker' },
];

// Setup MSW server
const server = setupServer(
  rest.get('/api/buildings', (req, res, ctx) => {
    return res(ctx.json({ data: mockBuildings }));
  }),
  rest.get('/api/workers', (req, res, ctx) => {
    return res(ctx.json({ data: mockWorkers }));
  })
);

// Create a test theme
const theme = createTheme();

// Wrapper component with required providers
const TestWrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient()}>
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        {children}
      </MemoryRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

describe('WorkOrderForm', () => {
  // Setup and teardown
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  test('renders the form with all fields', async () => {
    render(
      <TestWrapper>
        <WorkOrderForm mode="create" onCancel={() => {}} />
      </TestWrapper>
    );

    // Check if form fields are rendered
    expect(await screen.findByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/building/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/apartment/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByText(/add worker/i)).toBeInTheDocument();
    expect(screen.getByText(/add service/i)).toBeInTheDocument();
  });

  test('allows adding and removing workers', async () => {
    render(
      <TestWrapper>
        <WorkOrderForm mode="create" onCancel={() => {}} />
      </TestWrapper>
    );

    // Wait for workers to load
    await screen.findByText(/add worker/i);
    
    // Add a worker
    fireEvent.click(screen.getByText(/add worker/i));
    
    // Should show worker selection
    expect(screen.getByRole('button', { name: /worker/i })).toBeInTheDocument();
    
    // Remove the worker
    const removeButtons = screen.getAllByRole('button', { name: /remove worker/i });
    fireEvent.click(removeButtons[0]);
    
    // Worker should be removed
    expect(screen.queryByRole('button', { name: /worker/i })).not.toBeInTheDocument();
  });

  test('validates required fields on submit', async () => {
    const handleSubmit = jest.fn();
    
    render(
      <TestWrapper>
        <WorkOrderForm mode="create" onSubmit={handleSubmit} onCancel={() => {}} />
      </TestWrapper>
    );

    // Submit the form without filling required fields
    fireEvent.click(await screen.findByText(/create work order/i));
    
    // Check for validation errors
    expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
    expect(screen.getByText(/building is required/i)).toBeInTheDocument();
    expect(screen.getByText(/description is required/i)).toBeInTheDocument();
    
    // Form submission should not be called
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  test('pre-fills form in edit mode', async () => {
    const initialValues = {
      title: 'Test Work Order',
      building: '1',
      description: 'Test Description',
      assignedTo: [
        { worker: 'w1', status: 'pending', notes: 'Test notes' }
      ],
      services: [
        { type: 'painting', description: 'Paint walls', status: 'pending', laborCost: 100, materialCost: 50 }
      ]
    };

    render(
      <TestWrapper>
        <WorkOrderForm 
          mode="edit" 
          initialValues={initialValues} 
          onCancel={() => {}} 
        />
      </TestWrapper>
    );

    // Check if fields are pre-filled
    expect(await screen.findByDisplayValue('Test Work Order')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Test Description')).toBeInTheDocument();
    
    // Check if worker is pre-selected
    expect(await screen.findByText(/worker 1/i)).toBeInTheDocument();
    
    // Check if service is pre-filled
    expect(await screen.findByDisplayValue(/paint walls/i)).toBeInTheDocument();
  });
});
