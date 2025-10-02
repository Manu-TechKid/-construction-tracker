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

  const [filters, setFilters] = useState({ 
    building: '', 
    status: '',
    dateRange: 'all', // all, today, yesterday, thisWeek, lastWeek, thisMonth, lastMonth, thisYear, lastYear, custom
    startDate: null,
    endDate: null
  });
  const [statusMenuAnchor, setStatusMenuAnchor] = useState(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);

  const handleFilterChange = useCallback((e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  }, [filters]);
  
  const handleDateRangeChange = useCallback((range) => {
    const today = new Date();
    let startDate = null;
    let endDate = null;
    
    switch (range) {
      case 'today':
        startDate = startOfDay(today);
        endDate = endOfDay(today);
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        startDate = startOfDay(yesterday);
        endDate = endOfDay(yesterday);
        break;
      case 'thisWeek':
        startDate = startOfWeek(today);
        endDate = endOfWeek(today);
        break;
      case 'lastWeek':
        const lastWeekStart = startOfWeek(subWeeks(today, 1));
        startDate = lastWeekStart;
        endDate = endOfWeek(subWeeks(today, 1));
        break;
      case 'thisMonth':
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        break;
      case 'lastMonth':
        startDate = startOfMonth(subMonths(today, 1));
        endDate = endOfMonth(subMonths(today, 1));
        break;
      case 'thisYear':
        startDate = startOfYear(today);
        endDate = endOfYear(today);
        break;
      case 'lastYear':
        startDate = startOfYear(subYears(today, 1));
        endDate = endOfYear(subYears(today, 1));
        break;
      case 'all':
      default:
        startDate = null;
        endDate = null;
        break;
    }
    
    setFilters(prev => ({
      ...prev,
      dateRange: range,
      startDate,
      endDate
    }));
  }, []);
  
  const handleCustomDateChange = useCallback((field, date) => {
    setFilters(prev => ({
      ...prev,
      [field]: date,
      dateRange: 'custom'
    }));
  }, []);

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

  const workOrders = workOrdersData?.data?.workOrders || [];
  const buildings = buildingsData?.data?.buildings || [];
  
  // Date range options for quick selection
  const dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'lastWeek', label: 'Last Week' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'lastYear', label: 'Last Year' },
    { value: 'custom', label: 'Custom Range' }
  ];
  
  // Calculate statistics for current filter
  const getFilterStats = () => {
    const total = filteredWorkOrders.length;
    const completed = filteredWorkOrders.filter(wo => wo.status === 'completed').length;
    const inProgress = filteredWorkOrders.filter(wo => wo.status === 'in_progress').length;
    const pending = filteredWorkOrders.filter(wo => wo.status === 'pending').length;
    
    return { total, completed, inProgress, pending };
  };
  
  const stats = getFilterStats();

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
        
        // Handle date filter
        let dateMatch = true;
        if (filters.startDate && filters.endDate && wo.scheduledDate) {
          try {
            const workOrderDate = typeof wo.scheduledDate === 'string' 
              ? parseISO(wo.scheduledDate) 
              : new Date(wo.scheduledDate);
            
            dateMatch = isWithinInterval(workOrderDate, {
              start: filters.startDate,
              end: filters.endDate
            });
          } catch (error) {
            console.warn('Error parsing date for work order:', wo._id, error);
            dateMatch = true; // Include if date parsing fails
          }
        }
          
        return buildingMatch && statusMatch && dateMatch;
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
      flex: 1.8,
      minWidth: 180,
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
      }
    ] : []),
    {
      field: 'photos',
      headerName: 'Photos',
      width: 160,
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
      width: 100,
      valueGetter: (params) => {
        try {
          if (!params.row) return 'N/A';
          const apartmentNumber = params.row.apartmentNumber || 'N/A';
          return apartmentNumber === 'N/A' ? 'No apartment' : `Apt ${apartmentNumber}`;
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

          const apartmentNumber = params.row.apartmentNumber || 'N/A';

          if (apartmentNumber === 'N/A') {
            return <Typography variant="body2" color="textSecondary">No apartment</Typography>;
          }

          return (
            <Typography
              variant="body2"
              fontWeight="medium"
              sx={{
                fontSize: '0.875rem',
                lineHeight: 1.4
              }}
            >
              Apt {apartmentNumber}
            </Typography>
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

  // Optional: Enable debug logging by uncommenting the lines below
  // console.log('Buildings Data:', buildingsData);
  // console.log('Current Filters:', filters);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
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

        {/* Enhanced Filters with Date Filtering */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterIcon />
              Work Order Filters
              <Chip 
                label={`${stats.total} work orders found`}
                size="small" 
                color="primary" 
              />
            </Typography>
            
            {/* Quick Date Range Buttons */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                📅 Quick Date Selection:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {dateRangeOptions.slice(0, -1).map((option) => (
                  <Button
                    key={option.value}
                    size="small"
                    variant={filters.dateRange === option.value ? 'contained' : 'outlined'}
                    onClick={() => handleDateRangeChange(option.value)}
                    sx={{ mb: 1 }}
                  >
                    {option.label}
                  </Button>
                ))}
              </Stack>
            </Box>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarIcon />
                  <Typography variant="subtitle1">Advanced Filters</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2} alignItems="center">
                  {/* Building Filter */}
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Building</InputLabel>
                      <Select
                        name="building"
                        value={filters.building}
                        onChange={handleFilterChange}
                        label="Building"
                      >
                        <MenuItem value="">All Buildings</MenuItem>
                        {buildings.map((building) => (
                          <MenuItem key={building._id} value={building._id}>
                            {building.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  {/* Status Filter */}
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Status</InputLabel>
                      <Select
                        name="status"
                        value={filters.status}
                        onChange={handleFilterChange}
                        label="Status"
                      >
                        <MenuItem value="">All Statuses</MenuItem>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="in_progress">In Progress</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="on_hold">On Hold</MenuItem>
                        <MenuItem value="cancelled">Cancelled</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  {/* Date Range Selector */}
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Date Range</InputLabel>
                      <Select
                        value={filters.dateRange}
                        onChange={(e) => handleDateRangeChange(e.target.value)}
                        label="Date Range"
                      >
                        {dateRangeOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  {/* Clear Filters Button */}
                  <Grid item xs={12} md={3}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => setFilters({ 
                        building: '', 
                        status: '',
                        dateRange: 'all',
                        startDate: null,
                        endDate: null
                      })}
                      disabled={!filters.building && !filters.status && filters.dateRange === 'all'}
                    >
                      Clear All Filters
                    </Button>
                  </Grid>
                  
                  {/* Custom Date Range */}
                  {filters.dateRange === 'custom' && (
                    <>
                      <Grid item xs={12} md={6}>
                        <DatePicker
                          label="Start Date"
                          value={filters.startDate}
                          onChange={(date) => handleCustomDateChange('startDate', date)}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              size: 'small'
                            }
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <DatePicker
                          label="End Date"
                          value={filters.endDate}
                          onChange={(date) => handleCustomDateChange('endDate', date)}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              size: 'small'
                            }
                          }}
                        />
                      </Grid>
                    </>
                  )}
                </Grid>
                
                {/* Filter Summary */}
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    📊 Filter Results Summary:
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="primary">
                        <strong>Total: {stats.total}</strong>
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="success.main">
                        <strong>Completed: {stats.completed}</strong>
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="info.main">
                        <strong>In Progress: {stats.inProgress}</strong>
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="warning.main">
                        <strong>Pending: {stats.pending}</strong>
                      </Typography>
                    </Grid>
                  </Grid>
                  {filters.startDate && filters.endDate && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      📅 Period: {format(filters.startDate, 'MMM dd, yyyy')} - {format(filters.endDate, 'MMM dd, yyyy')}
                    </Typography>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
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
    </LocalizationProvider>
  );
};

export default WorkOrders;
