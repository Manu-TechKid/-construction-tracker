import { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Paper,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Tooltip,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

import { format } from 'date-fns';

const LineItemEditor = ({ lineItems = [], onChange, readOnly = false }) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const emptyLineItem = {
    serviceDate: format(new Date(), 'yyyy-MM-dd'),
    productService: '',
    description: '',
    qty: 1,
    rate: 0,
    amount: 0,
    class: '',
    tax: 0,
    taxType: 'percentage',
    notes: ''
  };

  const handleAdd = () => {
    setEditingIndex(lineItems.length);
    setEditingItem({ ...emptyLineItem });
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditingItem({ ...lineItems[index] });
  };

  const handleSave = () => {
    const newLineItems = [...lineItems];
    
    // Calculate amount if not set
    const qty = parseFloat(editingItem.qty) || 0;
    const rate = parseFloat(editingItem.rate) || 0;
    const amount = qty * rate;
    
    const itemToSave = {
      ...editingItem,
      qty,
      rate,
      amount,
      tax: parseFloat(editingItem.tax) || 0
    };

    if (editingIndex === lineItems.length) {
      newLineItems.push(itemToSave);
    } else {
      newLineItems[editingIndex] = itemToSave;
    }

    onChange(newLineItems);
    setEditingIndex(null);
    setEditingItem(null);
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditingItem(null);
  };

  const handleDelete = (index) => {
    const newLineItems = lineItems.filter((_, i) => i !== index);
    onChange(newLineItems);
  };

  const handleFieldChange = (field, value) => {
    setEditingItem(prev => ({ ...prev, [field]: value }));
  };

  const calculateItemTotal = (item) => {
    const amount = parseFloat(item.amount) || 0;
    const tax = parseFloat(item.tax) || 0;
    
    if (item.taxType === 'percentage') {
      return amount + (amount * tax / 100);
    }
    return amount + tax;
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  };

  const calculateTotalTax = () => {
    return lineItems.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      const tax = parseFloat(item.tax) || 0;
      
      if (item.taxType === 'percentage') {
        return sum + (amount * tax / 100);
      }
      return sum + tax;
    }, 0);
  };

  const calculateGrandTotal = () => {
    return calculateSubtotal() + calculateTotalTax();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Line Items</Typography>
        {!readOnly && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            disabled={editingIndex !== null}
          >
            Add Line Item
          </Button>
        )}
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell>Service Date</TableCell>
              <TableCell>Product/Service</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Rate</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Class</TableCell>
              <TableCell align="right">Tax</TableCell>
              <TableCell align="right">Total</TableCell>
              {!readOnly && <TableCell align="center">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {lineItems.map((item, index) => (
              editingIndex === index ? (
                <TableRow key={index} sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>
                    <TextField
                      type="date"
                      size="small"
                      value={editingItem.serviceDate}
                      onChange={(e) => handleFieldChange('serviceDate', e.target.value)}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={editingItem.productService}
                      onChange={(e) => handleFieldChange('productService', e.target.value)}
                      placeholder="Product/Service"
                      fullWidth
                      required
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={editingItem.description}
                      onChange={(e) => handleFieldChange('description', e.target.value)}
                      placeholder="Description"
                      fullWidth
                      multiline
                      required
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={editingItem.qty}
                      onChange={(e) => handleFieldChange('qty', e.target.value)}
                      inputProps={{ min: 0.01, step: 0.01 }}
                      sx={{ width: 80 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={editingItem.rate}
                      onChange={(e) => handleFieldChange('rate', e.target.value)}
                      inputProps={{ min: 0, step: 0.01 }}
                      sx={{ width: 100 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatCurrency((editingItem.qty || 0) * (editingItem.rate || 0))}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={editingItem.class}
                      onChange={(e) => handleFieldChange('class', e.target.value)}
                      placeholder="Class"
                      sx={{ width: 100 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5} alignItems="center">
                      <TextField
                        type="number"
                        size="small"
                        value={editingItem.tax}
                        onChange={(e) => handleFieldChange('tax', e.target.value)}
                        inputProps={{ min: 0, step: 0.01 }}
                        sx={{ width: 70 }}
                      />
                      <FormControl size="small" sx={{ width: 80 }}>
                        <Select
                          value={editingItem.taxType}
                          onChange={(e) => handleFieldChange('taxType', e.target.value)}
                        >
                          <MenuItem value="percentage">%</MenuItem>
                          <MenuItem value="fixed">$</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(calculateItemTotal(editingItem))}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="primary" onClick={handleSave}>
                      <SaveIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={handleCancel}>
                      <CancelIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={index}>
                  <TableCell>
                    {format(new Date(item.serviceDate), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>{item.productService}</TableCell>
                  <TableCell>
                    <Tooltip title={item.description}>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {item.description}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">{item.qty}</TableCell>
                  <TableCell align="right">{formatCurrency(item.rate)}</TableCell>
                  <TableCell align="right">{formatCurrency(item.amount)}</TableCell>
                  <TableCell>
                    {item.class && (
                      <Chip label={item.class} size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {item.tax > 0 && (
                      <Typography variant="body2">
                        {item.tax}{item.taxType === 'percentage' ? '%' : '$'}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(calculateItemTotal(item))}
                    </Typography>
                  </TableCell>
                  {!readOnly && (
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(index)}
                        disabled={editingIndex !== null}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(index)}
                        disabled={editingIndex !== null}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              )
            ))}

            {/* Add new row */}
            {editingIndex === lineItems.length && (
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell>
                  <TextField
                    type="date"
                    size="small"
                    value={editingItem.serviceDate}
                    onChange={(e) => handleFieldChange('serviceDate', e.target.value)}
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={editingItem.productService}
                    onChange={(e) => handleFieldChange('productService', e.target.value)}
                    placeholder="Product/Service"
                    fullWidth
                    required
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={editingItem.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    placeholder="Description"
                    fullWidth
                    multiline
                    required
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={editingItem.qty}
                    onChange={(e) => handleFieldChange('qty', e.target.value)}
                    inputProps={{ min: 0.01, step: 0.01 }}
                    sx={{ width: 80 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={editingItem.rate}
                    onChange={(e) => handleFieldChange('rate', e.target.value)}
                    inputProps={{ min: 0, step: 0.01 }}
                    sx={{ width: 100 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">
                    {formatCurrency((editingItem.qty || 0) * (editingItem.rate || 0))}
                  </Typography>
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={editingItem.class}
                    onChange={(e) => handleFieldChange('class', e.target.value)}
                    placeholder="Class"
                    sx={{ width: 100 }}
                  />
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={0.5} alignItems="center">
                    <TextField
                      type="number"
                      size="small"
                      value={editingItem.tax}
                      onChange={(e) => handleFieldChange('tax', e.target.value)}
                      inputProps={{ min: 0, step: 0.01 }}
                      sx={{ width: 70 }}
                    />
                    <FormControl size="small" sx={{ width: 80 }}>
                      <Select
                        value={editingItem.taxType}
                        onChange={(e) => handleFieldChange('taxType', e.target.value)}
                      >
                        <MenuItem value="percentage">%</MenuItem>
                        <MenuItem value="fixed">$</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="bold">
                    {formatCurrency(calculateItemTotal(editingItem))}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" color="primary" onClick={handleSave}>
                    <SaveIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={handleCancel}>
                    <CancelIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            )}

            {/* Totals */}
            {lineItems.length > 0 && (
              <>
                <TableRow>
                  <TableCell colSpan={5} />
                  <TableCell align="right">
                    <Typography variant="subtitle2">Subtotal:</Typography>
                  </TableCell>
                  <TableCell align="right" colSpan={3}>
                    <Typography variant="subtitle2">
                      {formatCurrency(calculateSubtotal())}
                    </Typography>
                  </TableCell>
                  {!readOnly && <TableCell />}
                </TableRow>
                <TableRow>
                  <TableCell colSpan={5} />
                  <TableCell align="right">
                    <Typography variant="subtitle2">Total Tax:</Typography>
                  </TableCell>
                  <TableCell align="right" colSpan={3}>
                    <Typography variant="subtitle2">
                      {formatCurrency(calculateTotalTax())}
                    </Typography>
                  </TableCell>
                  {!readOnly && <TableCell />}
                </TableRow>
                <TableRow>
                  <TableCell colSpan={5} />
                  <TableCell align="right">
                    <Typography variant="h6" fontWeight="bold">Grand Total:</Typography>
                  </TableCell>
                  <TableCell align="right" colSpan={3}>
                    <Typography variant="h6" fontWeight="bold" color="primary">
                      {formatCurrency(calculateGrandTotal())}
                    </Typography>
                  </TableCell>
                  {!readOnly && <TableCell />}
                </TableRow>
              </>
            )}

            {lineItems.length === 0 && editingIndex === null && (
              <TableRow>
                <TableCell colSpan={readOnly ? 9 : 10} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No line items added yet. Click "Add Line Item" to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default LineItemEditor;
