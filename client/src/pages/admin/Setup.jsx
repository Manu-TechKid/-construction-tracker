import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Alert,
  CircularProgress,
  Button,
  Card,
  CardContent
} from '@mui/material';
import { Settings as SettingsIcon, PlayArrow as RunIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import WorkTypesManagement from '../../components/setup/WorkTypesManagement';
import WorkSubTypesManagement from '../../components/setup/WorkSubTypesManagement';
import DropdownConfigManagement from '../../components/setup/DropdownConfigManagement';
import { useRunSetupMigrationMutation, useGetMigrationStatusQuery } from '../../features/setup/setupApiSlice';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`setup-tabpanel-${index}`}
      aria-labelledby={`setup-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Setup = () => {
  const [tabValue, setTabValue] = useState(0);
  
  const { data: migrationStatus, refetch: refetchStatus } = useGetMigrationStatusQuery();
  const [runMigration, { isLoading: isRunningMigration }] = useRunSetupMigrationMutation();

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleRunMigration = async () => {
    try {
      const result = await runMigration().unwrap();
      toast.success(`Migration completed! Created ${result.data.workTypes} work types, ${result.data.workSubTypes} sub-types, and ${result.data.dropdownConfigs} dropdown configs.`);
      refetchStatus();
    } catch (error) {
      toast.error('Migration failed: ' + (error.data?.message || error.message));
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SettingsIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            System Setup & Configuration
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Manage work types, sub-types, and dropdown configurations for the entire system.
          Changes made here will affect all forms and data entry across the application.
        </Typography>
      </Box>

      {migrationStatus?.data?.migrationNeeded && (
        <Card sx={{ mb: 3, bgcolor: 'warning.light' }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6" color="warning.dark">
                  Initial Setup Required
                </Typography>
                <Typography variant="body2" color="warning.dark">
                  No data found. Run the migration to populate with construction categories.
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="primary"
                startIcon={<RunIcon />}
                onClick={handleRunMigration}
                disabled={isRunningMigration}
              >
                {isRunningMigration ? 'Running...' : 'Run Migration'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Important:</strong> Modifying these configurations will affect existing work orders and forms.
          Please ensure all changes are reviewed before saving.
        </Typography>
      </Alert>

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="setup configuration tabs"
            variant="fullWidth"
          >
            <Tab 
              label="Work Types" 
              id="setup-tab-0"
              aria-controls="setup-tabpanel-0"
            />
            <Tab 
              label="Work Sub-Types" 
              id="setup-tab-1"
              aria-controls="setup-tabpanel-1"
            />
            <Tab 
              label="Dropdown Configurations" 
              id="setup-tab-2"
              aria-controls="setup-tabpanel-2"
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <WorkTypesManagement />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <WorkSubTypesManagement />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <DropdownConfigManagement />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default Setup;
