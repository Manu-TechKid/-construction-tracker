import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { SettingsContext } from '../../contexts/SettingsContext';

const Settings = () => {
  const { settings, toggleTheme, setLanguage } = useContext(SettingsContext);
  const [localSettings, setLocalSettings] = useState({
    notifications: true,
    emailAlerts: true,
    timezone: 'UTC',
    autoSave: true,
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load local settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('constructionTrackerSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setLocalSettings(parsedSettings);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  const handleLocalSettingChange = (setting) => (event) => {
    setLocalSettings(prev => ({
      ...prev,
      [setting]: event.target.checked !== undefined ? event.target.checked : event.target.value
    }));
  };

  const handleSave = async () => {
    try {
      // Save only local settings to localStorage
      localStorage.setItem('constructionTrackerSettings', JSON.stringify(localSettings));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Settings saved successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Appearance
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.theme === 'dark'}
                    onChange={toggleTheme}
                    color="primary"
                  />
                }
                label="Dark Mode"
                sx={{ mb: 2, display: 'block' }}
              />

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="language-label">Language</InputLabel>
                <Select
                  labelId="language-label"
                  value={settings.language || 'en'}
                  onChange={(e) => setLanguage(e.target.value)}
                  label="Language"
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="es">Español</MenuItem>
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Notifications
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.notifications}
                    onChange={handleLocalSettingChange('notifications')}
                    color="primary"
                  />
                }
                label="Enable Notifications"
                sx={{ mb: 2, display: 'block' }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.emailAlerts}
                    onChange={handleLocalSettingChange('emailAlerts')}
                    color="primary"
                  />
                }
                label="Email Alerts"
                sx={{ mb: 2, display: 'block' }}
              />

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="timezone-label">Timezone</InputLabel>
                <Select
                  labelId="timezone-label"
                  value={localSettings.timezone}
                  onChange={handleLocalSettingChange('timezone')}
                  label="Timezone"
                >
                  <MenuItem value="UTC">UTC</MenuItem>
                  <MenuItem value="America/New_York">Eastern Time (ET)</MenuItem>
                  <MenuItem value="America/Chicago">Central Time (CT)</MenuItem>
                  <MenuItem value="America/Denver">Mountain Time (MT)</MenuItem>
                  <MenuItem value="America/Los_Angeles">Pacific Time (PT)</MenuItem>
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
        >
          Save Settings
        </Button>
      </Box>
    </Box>
  );
};

export default Settings;
