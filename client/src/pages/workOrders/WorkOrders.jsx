import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Visibility as ViewIcon,
  Schedule as PendingIcon,
  PlayArrow as InProgressIcon,
  CheckCircle as CompletedIcon,
  Pause as OnHoldIcon,
  Cancel as CancelledIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { useAuth } from '../../hooks/useAuth';
import { useGetWorkOrdersQuery, useUpdateWorkOrderMutation } from '../../features/workOrders/workOrdersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

const getStatusChipColor = (status) => {
  switch (status) {
    case 'completed': return 'success';
    case 'in_progress': return 'info';
    case 'on_hold': return 'warning';
    case 'cancelled': return 'error';
    case 'pending':
    default: return 'default';
  }
};

const getPriorityChipColor = (priority) => {
  switch (priority) {
    case 'high':
    case 'urgent': return 'error';
    case 'medium': return 'warning';
    case 'low':
    default: return 'success';
  }
};

const WorkOrders = () => {
  const navigate = useNavigate();
  const { canViewCosts } = useAuth();
  const { data: workOrdersData, isLoading, error } = useGetWorkOrdersQuery();
  const { 
    data: buildingsData, 
    isLoading: isLoadingBuildings, 
    error: buildingsError 
  } = useGetBuildingsQuery();
  const [updateWorkOrder] = useUpdateWorkOrderMutation();

  const [filters, setFilters] = useState({ building: '', status: '' });
  const [statusMenuAnchor, setStatusMenuAnchor] = useState(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);

  const handleFilterChange = useCallback((e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  }, [filters]);

  const handleStatusClick = useCallback((event, workOrder) => {
    event.stopPropagation();
    setStatusMenuAnchor(event.currentTarget);
    setSelectedWorkOrder(workOrder);
  }, []);

  const handleStatusClose = useCallback(() => {
    setStatusMenuAnchor(null);
    setSelectedWorkOrder(null);
  }, []);

  const handleStatusUpdate = useCallback(async (newStatus) => {
    if (!selectedWorkOrder) return;
    
    try {
      await updateWorkOrder({
        id: selectedWorkOrder._id,
        status: newStatus
      }).unwrap();
      
      toast.success(`Work order status updated to ${newStatus}`, {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
      });
      handleStatusClose();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update work order status', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  }, [selectedWorkOrder, updateWorkOrder, handleStatusClose]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <PendingIcon />;
      case 'in_progress': return <InProgressIcon />;
      case 'completed': return <CompletedIcon />;
      case 'on_hold': return <OnHoldIcon />;
      case 'cancelled': return <CancelledIcon />;
      default: return <PendingIcon />;
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'Pending', icon: <PendingIcon /> },
    { value: 'in_progress', label: 'In Progress', icon: <InProgressIcon /> },
    { value: 'completed', label: 'Completed', icon: <CompletedIcon /> },
    { value: 'on_hold', label: 'On Hold', icon: <OnHoldIcon /> },
    { value: 'cancelled', label: 'Cancelled', icon: <CancelledIcon /> },
  ];

  const workOrders = workOrdersData?.data || [];

  const filteredWorkOrders = useMemo(() => {
    return workOrders
      .filter(wo => {
        // Filter out invalid work orders
        if (!wo || typeof wo !== 'object' || !wo._id) {
          console.warn('Invalid work order found:', wo);
          return false;
        }

        try {
          // Validate essential fields
          if (wo.workType && typeof wo.workType === 'object' && !wo.workType.name && !wo.workType.code) {
            console.warn('Work order has invalid workType:', wo.workType);
          }
          if (wo.workSubType && typeof wo.workSubType === 'object' && !wo.workSubType.name && !wo.workSubType.code) {
            console.warn('Work order has invalid workSubType:', wo.workSubType);
          }
          if (wo.building && typeof wo.building === 'object' && !wo.building.name && !wo.building.code) {
            console.warn('Work order has invalid building:', wo.building);
          }
        } catch (error) {
          console.warn('Error validating work order:', wo._id, error);
          return false;
        }

        // Handle building filter
        const buildingMatch = filters.building 
          ? wo.building?._id === filters.building || 
            (typeof wo.building === 'string' && wo.building === filters.building) ||
            (wo.building && wo.building._id === filters.building)
          : true;
          
        // Handle status filter
        const statusMatch = filters.status 
          ? wo.status === filters.status 
          : true;
          
        return buildingMatch && statusMatch;
      })
      .map(wo => ({
        ...wo,
        // Ensure photos is always an array
        photos: Array.isArray(wo.photos) ? wo.photos : [],
        // Ensure assignedTo is always an array
        assignedTo: Array.isArray(wo.assignedTo) ? wo.assignedTo : [],
        // Ensure other fields have safe defaults
        title: wo.title || 'Untitled Work Order',
        status: wo.status || 'pending',
        priority: wo.priority || 'normal',
        description: wo.description || '',
        scheduledDate: wo.scheduledDate || null,
        price: wo.price || wo.estimatedCost || 0, // Map old estimatedCost to new price field
        cost: wo.cost || wo.actualCost || 0, // Map old actualCost to new cost field
      }));
  }, [workOrders, filters]);

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">Error loading work orders.</Alert>;
  }


  const columns = [
    {
      field: 'title',
      headerName: 'Title & Description',
      flex: 2,
      minWidth: 280,
      renderCell: (params) => {
        try {
          if (!params.row) {
            return <Typography variant="body2" color="textSecondary">No data</Typography>;
          }
          return (
            <Box sx={{ maxWidth: '100%' }}>
              <Typography
                variant="body2"
                fontWeight="medium"
                sx={{
                  fontSize: '0.875rem',
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                  mb: 0.5
                }}
              >
                {params.row.title || 'Untitled Work Order'}
              </Typography>
              {params.row.description && (
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{
                    fontSize: '0.8rem',
                    lineHeight: 1.3,
                    wordBreak: 'break-word',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {params.row.description}
                </Typography>
              )}
            </Box>
          );
        } catch (error) {
          console.warn('Error rendering title cell:', error);
          return <Typography variant="body2" color="textSecondary">Error</Typography>;
        }
      },
    },
    {
      field: 'building',
      headerName: 'Building',
      flex: 1.2,
      minWidth: 140,
      valueGetter: (params) => {
        try {
          if (!params.row) return 'N/A';
          // Handle different building data structures
          if (params.row.building?.name) {
            return params.row.building.name;
          } else if (params.row.building?.code) {
            return params.row.building.code;
          } else if (typeof params.row.building === 'string') {
            return params.row.building;
          } else {
            return 'N/A';
          }
        } catch (error) {
          console.warn('Error getting building value:', error);
          return 'N/A';
        }
      },
      renderCell: (params) => {
        try {
          if (!params.row) {
            return <Typography variant="body2" color="textSecondary">No data</Typography>;
          }
          const buildingName = params.row.building?.name || params.row.building?.code || 'Unknown Building';

          return (
            <Box sx={{ maxWidth: '100%' }}>
              <Typography
                variant="body2"
                fontWeight="medium"
                sx={{
                  fontSize: '0.875rem',
                  lineHeight: 1.4,
                  wordBreak: 'break-word'
                }}
              >
                {buildingName}
              </Typography>
            </Box>
          );
        } catch (error) {
          console.warn('Error rendering building cell:', error);
          return <Typography variant="body2" color="textSecondary">Error</Typography>;
        }
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => {
        try {
          if (!params.row) {
            return <Chip label="N/A" color="default" size="small" />;
          }
          return (
            <Chip
              label={params.value || 'pending'}
              color={getStatusChipColor(params.value || 'pending')}
              size="small"
              onClick={(event) => handleStatusClick(event, params.row)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleStatusClick(event, params.row);
                }
              }}
              sx={{
                cursor: 'pointer',
                fontSize: '0.75rem',
                height: '24px',
                '&:hover': {
                  opacity: 0.8,
                  transform: 'scale(1.05)'
                },
                '&:focus': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: '2px'
                }
              }}
            />
          );
        } catch (error) {
          console.warn('Error rendering status cell:', error);
          return <Chip label="Error" color="error" size="small" />;
        }
      },
    },
    {
      field: 'priority',
      headerName: 'Priority',
      width: 100,
      renderCell: (params) => {
        try {
          if (!params.row) {
            return <Chip label="N/A" color="default" size="small" />;
          }
          return (
            <Chip
              label={params.value || 'medium'}
              color={getPriorityChipColor(params.value || 'medium')}
              size="small"
              sx={{
                fontSize: '0.75rem',
                height: '24px'
              }}
            />
          );
        } catch (error) {
          console.warn('Error rendering priority cell:', error);
          return <Chip label="Error" color="error" size="small" />;
        }
      },
    },
    ...(canViewCosts() ? [
      {
        field: 'price',
        headerName: 'Price',
        width: 90,
        valueFormatter: (params) => `$${params.value?.toFixed(2) || '0.00'}`,
        renderCell: (params) => (
          <Typography
            variant="body2"
            color="success.main"
            fontWeight="medium"
            sx={{
              fontSize: '0.875rem',
              textAlign: 'right'
            }}
          >
            ${params.value?.toFixed(2) || '0.00'}
          </Typography>
        ),
      },
      {
        field: 'cost',
        headerName: 'Cost',
        width: 90,
        valueFormatter: (params) => `$${params.value?.toFixed(2) || '0.00'}`,
        renderCell: (params) => (
          <Typography
            variant="body2"
            color="error.main"
            fontWeight="medium"
            sx={{
              fontSize: '0.875rem',
              textAlign: 'right'
            }}
          >
            ${params.value?.toFixed(2) || '0.00'}
          </Typography>
        ),
      },
      {
        field: 'profit',
        headerName: 'Profit',
        width: 100,
        valueGetter: (params) => {
          try {
            if (!params.row) return 0;
            const price = params.row.price || 0;
            const cost = params.row.cost || 0;
            return price - cost;
          } catch (error) {
            console.warn('Error calculating profit:', error);
            return 0;
          }
        },
        valueFormatter: (params) => {
          try {
            if (!params.row) return '$0.00 (0%)';
            const profit = params.value || 0;
            const price = params.row.price || 0;
            const margin = price > 0 ? ((profit / price) * 100).toFixed(1) : 0;
            return `$${profit.toFixed(2)} (${margin}%)`;
          } catch (error) {
            console.warn('Error formatting profit:', error);
            return '$0.00 (0%)';
          }
        },
        renderCell: (params) => {
          try {
            if (!params.row) {
              return <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'right' }}>$0.00</Typography>;
            }
            const profit = params.value || 0;
            const price = params.row.price || 0;
            const margin = price > 0 ? ((profit / price) * 100).toFixed(1) : 0;

            return (
              <Box sx={{ textAlign: 'right' }}>
                <Typography
                  variant="body2"
                  color={profit >= 0 ? 'success.main' : 'error.main'}
                  fontWeight="medium"
                  sx={{ fontSize: '0.875rem' }}
                >
                  ${profit.toFixed(2)}
                </Typography>
                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{ fontSize: '0.75rem' }}
                >
                  {margin}%
                </Typography>
              </Box>
            );
          } catch (error) {
            console.warn('Error rendering profit cell:', error);
            return <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'right' }}>Error</Typography>;
          }
        },
      }
    ] : []),
    {
      field: 'photos',
      headerName: 'Photos',
      width: 200,
      renderCell: (params) => {
        try {
          if (!params.row) {
            return <Typography variant="body2" color="textSecondary">No data</Typography>;
          }
          const photos = params.row.photos || [];

          if (photos.length === 0) {
            return <Typography variant="body2" color="textSecondary">No photos</Typography>;
          }

          const firstPhoto = photos[0];
          let photoUrl = '';

          // Handle different photo data structures
          if (typeof firstPhoto === 'string') {
            photoUrl = firstPhoto;
          } else if (firstPhoto?.url) {
            photoUrl = firstPhoto.url;
          } else if (firstPhoto?.path) {
            photoUrl = firstPhoto.path;
          } else if (firstPhoto?.filename) {
            photoUrl = firstPhoto.filename;
          } else if (firstPhoto?.src) {
            photoUrl = firstPhoto.src;
          }

          // Clean the photo URL - remove any leading slashes or path prefixes
          photoUrl = photoUrl.replace(/^.*[\\\/]/, '').replace(/^uploads[\\\/]photos[\\\/]/, '');

          // Fix double API path issue and ensure correct URL construction
          const baseUrl = process.env.REACT_APP_API_URL || window.location.origin;
          const cleanBaseUrl = baseUrl.replace(/\/api\/v1\/api\/v1/g, '/api/v1').replace(/\/+$/, '');
          const fullPhotoUrl = `${cleanBaseUrl}/uploads/photos/${photoUrl}`;

          return (
            <Box sx={{
              display: 'flex',
              gap: 0.5,
              alignItems: 'center',
              maxWidth: 180,
              overflow: 'hidden'
            }}>
              {photos.slice(0, 3).map((photo, index) => {
                let currentPhotoUrl = '';

                // Handle different photo data structures for each photo
                if (typeof photo === 'string') {
                  currentPhotoUrl = photo;
                } else if (photo?.url) {
                  currentPhotoUrl = photo.url;
                } else if (photo?.path) {
                  currentPhotoUrl = photo.path;
                } else if (photo?.filename) {
                  currentPhotoUrl = photo.filename;
                } else if (photo?.src) {
                  currentPhotoUrl = photo.src;
                }

                // Clean the photo URL
                currentPhotoUrl = currentPhotoUrl.replace(/^.*[\\\/]/, '').replace(/^uploads[\\\/]photos[\\\/]/, '');
                const currentFullPhotoUrl = `${cleanBaseUrl}/uploads/photos/${currentPhotoUrl}`;

                return (
                  <Box
                    key={photo._id || index}
                    sx={{
                      position: 'relative',
                      width: 45,
                      height: 45,
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: 'primary.light',
                      backgroundColor: 'grey.50',
                      '&:hover': {
                        transform: 'scale(1.1)',
                        boxShadow: 2,
                        borderColor: 'primary.main',
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    <img
                      src={currentFullPhotoUrl}
                      alt={photo.caption || `Photo ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        backgroundColor: 'white',
                      }}
                      onError={(e) => {
                        console.warn('Error loading image:', currentFullPhotoUrl);
                        e.target.style.display = 'none';
                        e.target.parentElement.style.backgroundColor = '#f5f5f5';
                        e.target.parentElement.style.border = '1px dashed #ccc';
                      }}
                    />
                    {index === 2 && photos.length > 3 && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '10px',
                          fontWeight: 'bold',
                        }}
                      >
                        +{photos.length - 3}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          );
        } catch (error) {
          console.warn('Error rendering photos cell:', error);
          return <Typography variant="body2" color="textSecondary">Error</Typography>;
        }
      },
    },
    {
      field: 'scheduledDate',
      headerName: 'Scheduled Date',
      width: 130,
      valueFormatter: (params) => {
        try {
          if (!params.value) return 'Not scheduled';
          const date = new Date(params.value);
          if (isNaN(date.getTime())) return 'Invalid date';
          return format(date, 'MM/dd/yyyy');
        } catch (error) {
          console.warn('Error formatting scheduled date:', error);
          return 'Error';
        }
      },
      renderCell: (params) => {
        try {
          if (!params.value) {
            return <Typography variant="body2" color="textSecondary">Not scheduled</Typography>;
          }
          const date = new Date(params.value);
          if (isNaN(date.getTime())) {
            return <Typography variant="body2" color="error">Invalid date</Typography>;
          }
          return (
            <Typography
              variant="body2"
              sx={{
                fontSize: '0.875rem',
                fontWeight: 'medium'
              }}
            >
              {format(date, 'MM/dd/yyyy')}
            </Typography>
          );
        } catch (error) {
          console.warn('Error rendering scheduled date:', error);
          return <Typography variant="body2" color="textSecondary">Error</Typography>;
        }
      },
    },
    {
      field: 'assignedTo',
      headerName: 'Assigned To',
      flex: 1.3,
      minWidth: 150,
      valueGetter: (params) => {
        try {
          if (!params.row || !params.row.assignedTo || !Array.isArray(params.row.assignedTo)) {
            return 'N/A';
          }

          return params.row.assignedTo
            .map(assignment => {
              if (assignment?.worker?.name) {
                return assignment.worker.name;
              } else if (assignment?.worker?.code) {
                return assignment.worker.code;
              } else if (typeof assignment?.worker === 'string') {
                return assignment.worker;
              } else {
                return 'Unknown Worker';
              }
            })
            .filter(name => name && name !== 'Unknown Worker')
            .join(', ') || 'N/A';
        } catch (error) {
          console.warn('Error getting assigned to value:', error);
          return 'N/A';
        }
      },
      renderCell: (params) => {
        try {
          if (!params.row || !params.row.assignedTo || !Array.isArray(params.row.assignedTo)) {
            return <Typography variant="body2" color="textSecondary">Unassigned</Typography>;
          }

          const workers = params.row.assignedTo
            .map(assignment => {
              if (assignment?.worker?.name) {
                return assignment.worker.name;
              } else if (assignment?.worker?.code) {
                return assignment.worker.code;
              } else if (typeof assignment?.worker === 'string') {
                return assignment.worker;
              } else {
                return 'Unknown Worker';
              }
            })
            .filter(name => name && name !== 'Unknown Worker');

          if (workers.length === 0) {
            return <Typography variant="body2" color="textSecondary">Unassigned</Typography>;
          }

          return (
            <Box sx={{ maxWidth: '100%' }}>
              <Typography
                variant="body2"
                fontWeight="medium"
                sx={{
                  fontSize: '0.875rem',
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {workers.join(', ')}
              </Typography>
            </Box>
          );
        } catch (error) {
          console.warn('Error rendering assigned to cell:', error);
          return <Typography variant="body2" color="textSecondary">Error</Typography>;
        }
      },
    },
    {
      field: 'apartmentNumber',
      headerName: 'Apartment',
      width: 160,
      valueGetter: (params) => {
        try {
          if (!params.row) return 'N/A';

          const buildingName = params.row.building?.name || params.row.building?.code || 'Unknown Building';
          const apartmentNumber = params.row.apartmentNumber || 'N/A';

          if (apartmentNumber === 'N/A') {
            return 'No apartment';
          }

          return `${buildingName} - Apt ${apartmentNumber}`;
        } catch (error) {
          console.warn('Error getting apartment number:', error);
          return 'N/A';
        }
      },
      renderCell: (params) => {
        try {
          if (!params.row) {
            return <Typography variant="body2" color="textSecondary">No data</Typography>;
          }

          const buildingName = params.row.building?.name || params.row.building?.code || 'Unknown Building';
          const apartmentNumber = params.row.apartmentNumber || 'N/A';

          if (apartmentNumber === 'N/A') {
            return <Typography variant="body2" color="textSecondary">No apartment</Typography>;
          }

          return (
            <Box sx={{ maxWidth: '100%' }}>
              <Typography
                variant="body2"
                fontWeight="medium"
                sx={{
                  fontSize: '0.875rem',
                  lineHeight: 1.4,
                  wordBreak: 'break-word'
                }}
              >
                {buildingName}
              </Typography>
              <Typography
                variant="body2"
                color="textSecondary"
                sx={{
                  fontSize: '0.8rem',
                  lineHeight: 1.3
                }}
              >
                Apt {apartmentNumber}
              </Typography>
            </Box>
          );
        } catch (error) {
          console.warn('Error rendering apartment cell:', error);
          return <Typography variant="body2" color="textSecondary">Error</Typography>;
        }
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.8,
      minWidth: 100,
      sortable: false,
      renderCell: (params) => {
        try {
          if (!params.row) {
            return <Typography variant="body2" color="textSecondary">No actions</Typography>;
          }
          return (
            <Box>
              <Button
                size="small"
                startIcon={<ViewIcon />}
                onClick={() => navigate(`/work-orders/${params.row._id}`)}
                sx={{
                  fontSize: '0.75rem',
                  padding: '4px 8px',
                  minWidth: 'auto'
                }}
              >
                View
              </Button>
            </Box>
          );
        } catch (error) {
          console.warn('Error rendering actions cell:', error);
          return <Typography variant="body2" color="textSecondary">Error</Typography>;
        }
      },
    },
  ];

  // Debug information
  console.log('Buildings Data:', buildingsData);
  console.log('Is Loading Buildings:', isLoadingBuildings);
  console.log('Buildings Error:', buildingsError);
  console.log('Current Filters:', filters);

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Work Orders
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/work-orders/new')}
        >
          Create Work Order
        </Button>
      </Box>

      {/* FILTERS SECTION - ALWAYS VISIBLE */}
      <Card sx={{ 
        mb: 3, 
        boxShadow: 3, 
        border: '3px solid #1976d2', 
        backgroundColor: '#e3f2fd',
        minHeight: '150px'
      }}>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ mb: 2, fontWeight: 'bold', color: '#1976d2' }}>
            🔍 Filter Work Orders
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
            Total Work Orders: {workOrders.length} | Filtered: {filteredWorkOrders.length}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                select
                fullWidth
                label="Building"
                name="building"
                value={filters.building}
                onChange={handleFilterChange}
                variant="outlined"
                size="small"
                disabled={isLoadingBuildings || Boolean(buildingsError)}
                helperText={isLoadingBuildings ? 'Loading buildings...' : ''}
              >
                <MenuItem value="">
                  <em>All Buildings</em>
                </MenuItem>
                {buildingsData?.data?.map(building => (
                  <MenuItem key={building._id} value={building._id}>
                    {building.name}
                  </MenuItem>
                ))}
              </TextField>
              {buildingsError && (
                <Typography color="error" variant="caption">
                  Error loading buildings
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                select
                fullWidth
                label="Status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                variant="outlined"
                size="small"
              >
                <MenuItem value="">
                  <em>All Statuses</em>
                </MenuItem>
                {statusOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {option.icon}
                      {option.label}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4} sx={{ display: 'flex', alignItems: 'flex-end' }}>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => setFilters({ building: '', status: '' })}
                disabled={!filters.building && !filters.status}
                fullWidth
                size="large"
                sx={{ height: '40px' }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ flex: 1, width: '100%' }}>
        <DataGrid
          rows={filteredWorkOrders}
          columns={columns}
          getRowId={(row) => row._id}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          disableSelectionOnClick
          loading={isLoading}
          autoHeight={false}
          sx={{
            height: '100%',
            width: '100%',
            '& .MuiDataGrid-root': {
              fontSize: '0.875rem',
            },
            '& .MuiDataGrid-cell': {
              padding: '8px',
              borderBottom: '1px solid',
              borderColor: 'divider',
              alignItems: 'center',
            },
            '& .MuiDataGrid-row': {
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
              '&:nth-of-type(even)': {
                backgroundColor: 'rgba(0, 0, 0, 0.01)',
              },
            },
            '& .MuiDataGrid-columnHeader': {
              backgroundColor: 'background.paper',
              fontWeight: 'bold',
              fontSize: '0.875rem',
              borderBottom: '2px solid',
              borderColor: 'primary.main',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 'bold',
              fontSize: '0.875rem',
            },
            '& .MuiDataGrid-footerContainer': {
              backgroundColor: 'background.paper',
              borderTop: '1px solid',
              borderColor: 'divider',
            },
            '& .MuiTablePagination-root': {
              fontSize: '0.875rem',
            },
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
            '& .MuiDataGrid-row:focus-within': {
              outline: 'none',
            },
          }}
          components={{
            NoRowsOverlay: () => (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                minHeight="200px"
              >
                <Typography variant="h6" color="textSecondary">
                  No work orders found
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {filters.building || filters.status
                    ? 'Try adjusting your filters'
                    : 'Create your first work order to get started'}
                </Typography>
              </Box>
            ),
            ErrorOverlay: () => (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                minHeight="200px"
              >
                <Typography variant="h6" color="error">
                  Error displaying work orders
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  There was an error rendering the work orders. Please refresh the page.
                </Typography>
              </Box>
            ),
          }}
          onError={(error) => {
            console.error('DataGrid error:', error);
          }}
        />
      </Box>

      {/* Status Update Menu */}
      <Menu
        anchorEl={statusMenuAnchor}
        open={Boolean(statusMenuAnchor)}
        onClose={handleStatusClose}
        PaperProps={{
          sx: { minWidth: 200 }
        }}
      >
        {statusOptions.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => handleStatusUpdate(option.value)}
            disabled={selectedWorkOrder?.status === option.value}
          >
            <ListItemIcon>
              {option.icon}
            </ListItemIcon>
            <ListItemText primary={option.label} />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default WorkOrders;
