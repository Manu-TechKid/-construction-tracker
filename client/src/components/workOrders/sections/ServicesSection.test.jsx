import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Formik, Form } from 'formik';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ServicesSection from './ServicesSection';

// Create a test theme
const theme = createTheme();

describe('ServicesSection', () => {
  const serviceTypes = [
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'painting', label: 'Painting' },
  ];

  const initialValues = {
    services: [
      { type: '', description: '', status: 'pending', laborCost: 0, materialCost: 0 }
    ]
  };

  const Wrapper = ({ children }) => (
    <ThemeProvider theme={theme}>
      <Formik
        initialValues={initialValues}
        onSubmit={() => {}}
      >
        <Form>
          {children}
        </Form>
      </Formik>
    </ThemeProvider>
  );

  test('renders services section', () => {
    render(
      <Wrapper>
        <ServicesSection 
          services={initialValues.services}
          serviceTypes={serviceTypes}
          onChange={() => {}}
          onAddService={() => {}}
          onRemoveService={() => {}}
        />
      </Wrapper>
    );

    expect(screen.getByText(/services/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add service/i })).toBeInTheDocument();
  });

  test('allows adding a service', () => {
    const handleAddService = jest.fn();
    
    render(
      <Wrapper>
        <ServicesSection 
          services={initialValues.services}
          serviceTypes={serviceTypes}
          onChange={() => {}}
          onAddService={handleAddService}
          onRemoveService={() => {}}
        />
      </Wrapper>
    );

    fireEvent.click(screen.getByRole('button', { name: /add service/i }));
    expect(handleAddService).toHaveBeenCalledTimes(1);
  });

  test('allows removing a service', () => {
    const handleRemoveService = jest.fn();
    const services = [
      { type: 'plumbing', description: 'Fix leak', status: 'pending', laborCost: 100, materialCost: 50 }
    ];
    
    render(
      <Wrapper>
        <ServicesSection 
          services={services}
          serviceTypes={serviceTypes}
          onChange={() => {}}
          onAddService={() => {}}
          onRemoveService={handleRemoveService}
        />
      </Wrapper>
    );

    const removeButtons = screen.getAllByRole('button', { name: /remove service/i });
    fireEvent.click(removeButtons[0]);
    expect(handleRemoveService).toHaveBeenCalledWith(0);
  });

  test('displays service type dropdown with available options', async () => {
    render(
      <Wrapper>
        <ServicesSection 
          services={initialValues.services}
          serviceTypes={serviceTypes}
          onChange={() => {}}
          onAddService={() => {}}
          onRemoveService={() => {}}
        />
      </Wrapper>
    );

    // Open the service type dropdown
    const select = screen.getByRole('button', { name: /select service type/i });
    fireEvent.mouseDown(select);
    
    // Check if service type options are displayed
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /plumbing/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /electrical/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /painting/i })).toBeInTheDocument();
    });
  });

  test('allows changing service status', () => {
    const handleChange = jest.fn();
    const services = [
      { type: 'plumbing', description: 'Fix leak', status: 'pending', laborCost: 100, materialCost: 50 }
    ];
    
    render(
      <Wrapper>
        <ServicesSection 
          services={services}
          serviceTypes={serviceTypes}
          onChange={handleChange}
          onAddService={() => {}}
          onRemoveService={() => {}}
        />
      </Wrapper>
    );

    // Open the status dropdown
    const statusSelect = screen.getByRole('button', { name: /pending/i });
    fireEvent.mouseDown(statusSelect);
    
    // Select a different status
    const completedOption = screen.getByRole('option', { name: /completed/i });
    fireEvent.click(completedOption);
    
    // Check if the change handler was called with the correct values
    expect(handleChange).toHaveBeenCalledWith(0, 'status', 'completed');
  });

  test('updates total cost when costs change', () => {
    const services = [
      { type: 'plumbing', description: 'Fix leak', status: 'pending', laborCost: 100, materialCost: 50 }
    ];
    
    render(
      <Wrapper>
        <ServicesSection 
          services={services}
          serviceTypes={serviceTypes}
          onChange={() => {}}
          onAddService={() => {}}
          onRemoveService={() => {}}
        />
      </Wrapper>
    );

    // Check if total cost is calculated and displayed correctly
    expect(screen.getByText(/150.00/)).toBeInTheDocument();
  });

  test('allows editing service description', () => {
    const handleChange = jest.fn();
    const services = [
      { type: 'plumbing', description: 'Fix leak', status: 'pending', laborCost: 100, materialCost: 50 }
    ];
    
    render(
      <Wrapper>
        <ServicesSection 
          services={services}
          serviceTypes={serviceTypes}
          onChange={handleChange}
          onAddService={() => {}}
          onRemoveService={() => {}}
        />
      </Wrapper>
    );

    const descriptionInput = screen.getByLabelText(/description/i);
    fireEvent.change(descriptionInput, { target: { value: 'Fix kitchen sink leak' } });
    
    expect(handleChange).toHaveBeenCalledWith(0, 'description', 'Fix kitchen sink leak');
  });
});
