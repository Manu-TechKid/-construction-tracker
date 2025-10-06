import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  LinearProgress,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Storage as StorageIcon,
  PhotoLibrary as PhotoIcon,
  CleaningServices as CleanupIcon,
  Compress as OptimizeIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';

const StorageManager = () => {
  const { hasPermission } = useAuth();
  const [storageStats, setStorageStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cleanupDialog, setCleanupDialog] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(365);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  // Fetch storage statistics
  const fetchStorageStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/photos/admin/storage-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStorageStats(data.data);
      } else {
        throw new Error('Failed to fetch storage statistics');
      }
    } catch (error) {
      console.error('Storage stats error:', error);
      toast.error('Failed to load storage statistics');
    } finally {
      setLoading(false);
    }
  };

  // Cleanup old photos
  const handleCleanup = async () => {
    try {
      setCleanupLoading(true);
      const response = await fetch('/api/v1/photos/admin/cleanup', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ maxAgeInDays: cleanupDays })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(data.data.message);
        setCleanupDialog(false);
        fetchStorageStats(); // Refresh stats
      } else {
        throw new Error('Failed to cleanup photos');
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      toast.error('Failed to cleanup photos');
    } finally {
      setCleanupLoading(false);
    }
  };

  // Calculate storage usage percentage (assuming 500MB free tier limit)
  const getStoragePercentage = () => {
    if (!storageStats?.storage?.totalSize) return 0;
    const freeTierLimit = 500 * 1024 * 1024; // 500MB in bytes
    return Math.min((storageStats.storage.totalSize / freeTierLimit) * 100, 100);
  };

  // Get storage status color
  const getStorageColor = () => {
    const percentage = getStoragePercentage();
    if (percentage < 50) return 'success';
    if (percentage < 80) return 'warning';
    return 'error';
  };

  useEffect(() => {
    if (hasPermission(['manage:system'])) {
      fetchStorageStats();
    }
  }, [hasPermission]);

  if (!hasPermission(['manage:system'])) {
    return (
      <Alert severity="error">
        You don't have permission to access storage management.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <StorageIcon />
        Storage Management
      </Typography>

      <Grid container spacing={3}>
        {/* Storage Overview */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Storage Usage
              </Typography>
              
              {storageStats && (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      {storageStats.storage.totalSizeFormatted} used of 500MB (Free Tier)
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={getStoragePercentage()}
                      color={getStorageColor()}
                      sx={{ mt: 1, height: 8, borderRadius: 4 }}
                    />
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="textSecondary">
                        Thumbnails
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {storageStats.storage.byType.thumbnails.sizeFormatted}
                      </Typography>
                      <Typography variant="caption">
                        {storageStats.storage.byType.thumbnails.count} files
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="textSecondary">
                        Medium
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {storageStats.storage.byType.medium.sizeFormatted}
                      </Typography>
                      <Typography variant="caption">
                        {storageStats.storage.byType.medium.count} files
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="textSecondary">
                        Original
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {storageStats.storage.byType.original.sizeFormatted}
                      </Typography>
                      <Typography variant="caption">
                        {storageStats.storage.byType.original.count} files
                      </Typography>
                    </Grid>
                  </Grid>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Database Statistics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Database Photos
              </Typography>
              
              {storageStats && (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <PhotoIcon color="primary" />
                      <Box>
                        <Typography variant="h4" color="primary">
                          {storageStats.database.totalPhotos}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Total Photos
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Work Orders: {storageStats.database.workOrderPhotos}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Site Photos: {storageStats.database.sitePhotos}
                    </Typography>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recommendations */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recommendations
              </Typography>
              
              {storageStats && (
                <Box>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Free Tier Optimization:</strong> All new photos are automatically compressed to WebP format, 
                      reducing storage usage by 70-80%. Thumbnails are generated for fast loading.
                    </Typography>
                  </Alert>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Chip
                        icon={<InfoIcon />}
                        label={storageStats.recommendations.compressionSavings}
                        color={getStoragePercentage() > 80 ? 'warning' : 'success'}
                        variant="outlined"
                        sx={{ mb: 1, width: '100%' }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Chip
                        icon={<InfoIcon />}
                        label={storageStats.recommendations.cleanup}
                        color={storageStats.storage.totalFiles > 1000 ? 'warning' : 'success'}
                        variant="outlined"
                        sx={{ mb: 1, width: '100%' }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Management Actions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Storage Management Actions
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    variant="outlined"
                    startIcon={<CleanupIcon />}
                    onClick={() => setCleanupDialog(true)}
                    fullWidth
                    color="warning"
                  >
                    Cleanup Old Photos
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    variant="outlined"
                    startIcon={<OptimizeIcon />}
                    onClick={() => toast.info('Optimization runs automatically for new uploads')}
                    fullWidth
                    color="primary"
                  >
                    Optimize Photos
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    variant="outlined"
                    startIcon={<StorageIcon />}
                    onClick={fetchStorageStats}
                    fullWidth
                  >
                    Refresh Stats
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cleanup Dialog */}
      <Dialog open={cleanupDialog} onClose={() => setCleanupDialog(false)}>
        <DialogTitle>Cleanup Old Photos</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            This will permanently delete photos older than the specified number of days.
            This action cannot be undone.
          </Typography>
          <TextField
            fullWidth
            label="Maximum Age (days)"
            type="number"
            value={cleanupDays}
            onChange={(e) => setCleanupDays(parseInt(e.target.value))}
            helperText="Photos older than this will be deleted"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCleanupDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCleanup}
            color="warning"
            variant="contained"
            disabled={cleanupLoading}
          >
            {cleanupLoading ? 'Cleaning...' : 'Cleanup Photos'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StorageManager;
