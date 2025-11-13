import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Chip,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Work as WorkIcon,
  Receipt as InvoiceIcon,
  Apartment as BuildingIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Assessment as EstimateIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const GlobalSearch = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // Quick navigation items
  const quickActions = [
    {
      title: 'New Work Order',
      subtitle: 'Create a new work order',
      icon: <WorkIcon />,
      action: () => navigate('/work-orders/new'),
      permission: 'create:workorders',
      keywords: ['work', 'order', 'new', 'create', 'job'],
    },
    {
      title: 'Work Orders',
      subtitle: 'View all work orders',
      icon: <WorkIcon />,
      action: () => navigate('/work-orders'),
      permission: 'read:workorders',
      keywords: ['work', 'orders', 'jobs', 'tasks'],
    },
    {
      title: 'New Invoice',
      subtitle: 'Create a new invoice',
      icon: <InvoiceIcon />,
      action: () => navigate('/invoices/new'),
      permission: 'create:invoices',
      keywords: ['invoice', 'new', 'create', 'bill', 'billing'],
    },
    {
      title: 'Invoices',
      subtitle: 'View all invoices',
      icon: <InvoiceIcon />,
      action: () => navigate('/invoices'),
      permission: 'read:invoices',
      keywords: ['invoices', 'bills', 'billing', 'payments'],
    },
    {
      title: 'Buildings',
      subtitle: 'Manage buildings',
      icon: <BuildingIcon />,
      action: () => navigate('/buildings'),
      permission: 'read:buildings',
      keywords: ['buildings', 'properties', 'locations'],
    },
    {
      title: 'Customer Pricing',
      subtitle: 'Manage service pricing',
      icon: <SettingsIcon />,
      action: () => navigate('/pricing/customer-services'),
      permission: 'read:buildings',
      keywords: ['pricing', 'services', 'rates', 'costs', 'customer'],
    },
    {
      title: 'Workers',
      subtitle: 'Manage workers',
      icon: <PersonIcon />,
      action: () => navigate('/workers'),
      permission: 'read:users',
      keywords: ['workers', 'employees', 'staff', 'team'],
    },
    {
      title: 'System Setup',
      subtitle: 'Configure work types and settings',
      icon: <SettingsIcon />,
      action: () => navigate('/system-setup'),
      permission: 'read:setup',
      keywords: ['setup', 'configuration', 'settings', 'types', 'subtypes'],
    },
  ].filter(item => hasPermission(item.permission));

  // Filter results based on query
  useEffect(() => {
    if (!query.trim()) {
      setResults(quickActions.slice(0, 6)); // Show top 6 by default
      return;
    }

    const filtered = quickActions.filter(item => {
      const searchTerm = query.toLowerCase();
      return (
        item.title.toLowerCase().includes(searchTerm) ||
        item.subtitle.toLowerCase().includes(searchTerm) ||
        item.keywords.some(keyword => keyword.includes(searchTerm))
      );
    });

    setResults(filtered.slice(0, 8)); // Show top 8 results
  }, [query]);

  const handleItemClick = (action) => {
    action();
    onClose();
    setQuery('');
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      onClose();
      setQuery('');
    } else if (event.key === 'Enter' && results.length > 0) {
      handleItemClick(results[0].action);
    }
  };

  const getShortcut = (title) => {
    const shortcuts = {
      'New Work Order': 'Ctrl+Shift+W',
      'New Invoice': 'Ctrl+Shift+I',
      'Customer Pricing': 'Ctrl+Shift+P',
    };
    return shortcuts[title];
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          position: 'fixed',
          top: '20%',
          m: 0,
          borderRadius: 2,
        }
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 2, pb: 0 }}>
          <TextField
            fullWidth
            placeholder="Search for actions, pages, or features..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  border: 'none',
                },
              },
            }}
          />
        </Box>

        <Divider />

        <List sx={{ maxHeight: 400, overflow: 'auto', py: 1 }}>
          {results.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="No results found"
                secondary={query ? `Try searching for "work orders", "invoices", or "buildings"` : 'Start typing to search...'}
              />
            </ListItem>
          ) : (
            results.map((item, index) => (
              <ListItem
                key={item.title}
                button
                onClick={() => handleItemClick(item.action)}
                sx={{
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body1">{item.title}</Typography>
                      {getShortcut(item.title) && (
                        <Chip
                          label={getShortcut(item.title)}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      )}
                    </Box>
                  }
                  secondary={item.subtitle}
                />
              </ListItem>
            ))
          )}
        </List>

        {query && (
          <Box sx={{ p: 2, pt: 1, bgcolor: 'grey.50' }}>
            <Typography variant="caption" color="text.secondary">
              Press Enter to select first result • ESC to close
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearch;
