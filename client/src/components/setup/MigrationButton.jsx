import React, { useState } from 'react';
import { Button, Box, Typography, Alert } from '@mui/material';
import { PlayArrow as RunIcon } from '@mui/icons-material';

const MigrationButton = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runMigration = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/v1/migration/run-setup-migration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.message || 'Migration failed');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Typography variant="h6" gutterBottom>
        Database Migration Required
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Click the button below to populate the database with construction work types and categories.
      </Typography>
      
      <Button
        variant="contained"
        color="primary"
        size="large"
        startIcon={<RunIcon />}
        onClick={runMigration}
        disabled={loading}
        sx={{ mb: 3 }}
      >
        {loading ? 'Running Migration...' : 'Run Setup Migration'}
      </Button>

      {result && (
        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Migration Successful!</strong><br />
            Work Types: {result.data?.workTypes}<br />
            Work Sub-Types: {result.data?.workSubTypes}<br />
            Dropdown Configs: {result.data?.dropdownConfigs}
          </Typography>
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Migration Failed:</strong> {error}
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default MigrationButton;
