import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';

export const useKeyboardShortcuts = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Global search shortcut (Ctrl/Cmd + K)
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }

      // Quick navigation shortcuts (Ctrl/Cmd + Shift + Key)
      if ((event.ctrlKey || event.metaKey) && event.shiftKey) {
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
          case 'b':
            event.preventDefault();
            if (hasPermission('read:buildings')) {
              navigate('/buildings');
            }
            break;
          case 's':
            event.preventDefault();
            if (hasPermission('read:setup')) {
              navigate('/system-setup');
            }
            break;
          case 'h':
            event.preventDefault();
            navigate('/');
            break;
          default:
            break;
        }
      }

      // Form shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 's':
            // Save form (if form is present)
            const saveButton = document.querySelector('button[type="submit"]');
            if (saveButton && !saveButton.disabled) {
              event.preventDefault();
              saveButton.click();
            }
            break;
          case 'enter':
            // Submit form
            const submitButton = document.querySelector('button[type="submit"]');
            if (submitButton && !submitButton.disabled) {
              event.preventDefault();
              submitButton.click();
            }
            break;
          default:
            break;
        }
      }

      // ESC to close modals/dialogs
      if (event.key === 'Escape') {
        const closeButton = document.querySelector('[data-testid="close-button"], .MuiDialog-root button[aria-label="close"]');
        if (closeButton) {
          closeButton.click();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, hasPermission]);

  const shortcuts = [
    { key: 'Ctrl+K', description: 'Open global search' },
    { key: 'Ctrl+Shift+W', description: 'New work order' },
    { key: 'Ctrl+Shift+I', description: 'New invoice' },
    { key: 'Ctrl+Shift+E', description: 'New estimate' },
    { key: 'Ctrl+Shift+P', description: 'Customer pricing' },
    { key: 'Ctrl+Shift+B', description: 'Buildings' },
    { key: 'Ctrl+Shift+S', description: 'System setup' },
    { key: 'Ctrl+Shift+H', description: 'Home/Dashboard' },
    { key: 'Ctrl+S', description: 'Save form' },
    { key: 'Ctrl+Enter', description: 'Submit form' },
    { key: 'ESC', description: 'Close dialog/modal' },
  ];

  return {
    searchOpen,
    setSearchOpen,
    shortcuts,
  };
};
