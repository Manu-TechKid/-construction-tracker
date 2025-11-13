import React, { useState } from 'react';
import {
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Tooltip,
  Backdrop,
} from '@mui/material';
import {
  Add as AddIcon,
  Work as WorkIcon,
  Receipt as InvoiceIcon,
  Assessment as EstimateIcon,
  Build as ServiceIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const QuickActions = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const actions = [
    {
      icon: <WorkIcon />,
      name: 'New Work Order',
      action: () => navigate('/work-orders/new'),
      permission: 'create:workorders',
      shortcut: 'Ctrl+Shift+W',
    },
    {
      icon: <InvoiceIcon />,
      name: 'New Invoice',
      action: () => navigate('/invoices/new'),
      permission: 'create:invoices',
      shortcut: 'Ctrl+Shift+I',
    },
    {
      icon: <EstimateIcon />,
      name: 'New Estimate',
      action: () => navigate('/estimates/new'),
      permission: 'create:estimates',
      shortcut: 'Ctrl+Shift+E',
    },
    {
      icon: <ServiceIcon />,
      name: 'Customer Pricing',
      action: () => navigate('/pricing/customer-services'),
      permission: 'read:buildings',
      shortcut: 'Ctrl+Shift+P',
    },
  ].filter(action => hasPermission(action.permission));

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleAction = (actionFn) => {
    actionFn();
    handleClose();
  };

  // Add keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.shiftKey) {
        switch (event.key.toLowerCase()) {
          case 'w':
            event.preventDefault();
            if (hasPermission('create:workorders')) {
              navigate('/work-orders/new');
            }
            break;
          case 'i':
            event.preventDefault();
            if (hasPermission('create:invoices')) {
              navigate('/invoices/new');
            }
            break;
          case 'e':
            event.preventDefault();
            if (hasPermission('create:estimates')) {
              navigate('/estimates/new');
            }
            break;
          case 'p':
            event.preventDefault();
            if (hasPermission('read:buildings')) {
              navigate('/pricing/customer-services');
            }
            break;
          default:
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, hasPermission]);

  if (actions.length === 0) return null;

  return (
    <>
      <Backdrop open={open} />
      <SpeedDial
        ariaLabel="Quick Actions"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        icon={<SpeedDialIcon openIcon={<CloseIcon />} />}
        onClose={handleClose}
        onOpen={handleOpen}
        open={open}
      >
        {actions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={
              <Tooltip title={`${action.name} (${action.shortcut})`} placement="left">
                {action.icon}
              </Tooltip>
            }
            tooltipTitle={`${action.name} (${action.shortcut})`}
            onClick={() => handleAction(action.action)}
          />
        ))}
      </SpeedDial>
    </>
  );
};

export default QuickActions;
