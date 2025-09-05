import React from 'react';

export const mockSelect = ({ children, value, onChange, label, name, 'data-testid': testId }) => (
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

export const mockMenuItem = ({ children, value, 'data-testid': testId }) => (
  <option value={value} data-testid={testId || `option-${value}`}>
    {children}
  </option>
);

export const mockTextField = ({ label, name, value = '', onChange, 'data-testid': testId }) => (
  <div>
    <label htmlFor={name}>{label}</label>
    <input
      type="text"
      name={name}
      value={value}
      onChange={onChange}
      data-testid={testId || `text-field-${name || 'input'}`}
    />
  </div>
);

export const mockButton = ({ children, onClick, 'data-testid': testId }) => (
  <button onClick={onClick} data-testid={testId || 'button'}>
    {children}
  </button>
);

export const mockIconButton = ({ children, onClick, 'aria-label': ariaLabel }) => (
  <button onClick={onClick} data-testid="icon-button" aria-label={ariaLabel}>
    {children}
  </button>
);
