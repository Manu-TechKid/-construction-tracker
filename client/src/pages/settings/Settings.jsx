import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { useSettings } from '../../contexts/SettingsContext';

const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
];

const Settings = () => {
  const { t } = useTranslation();
  const { settings, toggleTheme, setLanguage } = useSettings();
  const [localSettings, setLocalSettings] = useState({
    notifications: true,
    emailAlerts: true,
    timezone: 'UTC',
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load local settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('constructionTrackerSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setLocalSettings(prev => ({
          ...prev,
          ...parsedSettings,
          // Ensure timezone is set to a valid value
          timezone: timezones.some(tz => tz.value === parsedSettings.timezone) 
            ? parsedSettings.timezone 
            : 'UTC'
        }));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  const handleLocalSettingChange = (setting) => (event) => {
    const newSettings = {
      ...localSettings,
      [setting]: event.target.checked !== undefined ? event.target.checked : event.target.value
    };
    setLocalSettings(newSettings);
    
    // Auto-save non-global settings
    try {
      localStorage.setItem('constructionTrackerSettings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('settings.title')}
      </Typography>
      
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {t('settings.settingsSaved')}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('settings.appearance')}
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.theme === 'dark'}
                    onChange={toggleTheme}
                    color="primary"
                  />
                }
                label={t('settings.darkMode')}
                sx={{ mb: 2, display: 'block' }}
              />

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="language-label">{t('settings.language')}</InputLabel>
                <Select
                  labelId="language-label"
                  value={settings.language || 'en'}
                  onChange={(e) => setLanguage(e.target.value)}
                  label={t('settings.language')}
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
                {t('settings.notifications')}
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.notifications}
                    onChange={handleLocalSettingChange('notifications')}
                    color="primary"
                  />
                }
                label={t('settings.enableNotifications')}
                sx={{ mb: 2, display: 'block' }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.emailAlerts}
                    onChange={handleLocalSettingChange('emailAlerts')}
                    color="primary"
                    disabled={!localSettings.notifications}
                  />
                }
                label={t('settings.emailAlerts')}
                sx={{ mb: 2, display: 'block' }}
              />

              <FormControl fullWidth>
                <InputLabel id="timezone-label">{t('settings.timezone')}</InputLabel>
                <Select
                  labelId="timezone-label"
                  value={localSettings.timezone}
                  onChange={handleLocalSettingChange('timezone')}
                  label={t('settings.timezone')}
                >
                  {timezones.map((tz) => (
                    <MenuItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </MenuItem>
                  ))}
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
          {t('settings.saveSettings')}
        </Button>
      </Box>
    </Box>
  );
};

export default Settings;
