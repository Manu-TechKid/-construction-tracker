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
  Stack,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Visibility as ViewIcon,
  Schedule as PendingIcon,
  PlayArrow as InProgressIcon,
  CheckCircle as CompletedIcon,
  Pause as OnHoldIcon,
  Cancel as CancelledIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAuth } from '../../hooks/useAuth';
import { useGetWorkOrdersQuery, useUpdateWorkOrderMutation } from '../../features/workOrders/workOrdersApiSlice';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useGetWorkTypesQuery, useGetWorkSubTypesQuery } from '../../features/setup/setupApiSlice';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, isWithinInterval, parseISO } from 'date-fns';
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
  
  // Initialize state first
  const [filters, setFilters] = useState({ 
    building: '', 
    status: '',
    startDate: null,
    endDate: null,
    workType: '',
    workSubType: ''
  });

  // Then use hooks that depend on state
  const { data: workOrdersData, isLoading, error } = useGetWorkOrdersQuery();
  const { 
    data: buildingsData, 
    isLoading: isLoadingBuildings, 
    error: buildingsError 
  } = useGetBuildingsQuery();
  const { 
    data: workTypesData, 
    isLoading: isLoadingWorkTypes, 
    error: workTypesError 
  } = useGetWorkTypesQuery();
  const { 
    data: workSubTypesData, 
    isLoading: isLoadingWorkSubTypes, 
    error: workSubTypesError 
  } = useGetWorkSubTypesQuery(filters.workType || undefined);
  const [updateWorkOrder] = useUpdateWorkOrderMutation();
  const [statusMenuAnchor, setStatusMenuAnchor] = useState(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);

  const handleFilterChange = useCallback((e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  }, [filters]);
  
  const handleDateFilterChange = useCallback((field, value) => {
    setFilters({ ...filters, [field]: value });
  }, [filters]);
  
  const setQuickDateFilter = useCallback((type) => {
    const now = new Date();
    let startDate, endDate;
    
    switch (type) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'thisWeek':
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case 'thisMonth':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'lastMonth':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      case 'thisYear':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      case 'last30Days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'last90Days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      default:
        startDate = null;
        endDate = null;
    }
    
    setFilters({ ...filters, startDate, endDate });
  }, [filters]);
  
  const clearAllFilters = useCallback(() => {
    setFilters({ building: '', status: '', startDate: null, endDate: null, workType: '', workSubType: '' });
  }, []);
  
  const handleWorkTypeChange = useCallback((e) => {
    const workType = e.target.value;
    setFilters({ ...filters, workType, workSubType: '' }); // Clear sub-type when work type changes
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

  const workOrders = workOrdersData?.data?.workOrders || [];

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
        
        // Handle date range filter
        let dateMatch = true;
        if (filters.startDate || filters.endDate) {
          const workOrderDate = wo.scheduledDate ? new Date(wo.scheduledDate) : wo.createdAt ? new Date(wo.createdAt) : null;
          
          if (workOrderDate) {
            if (filters.startDate && filters.endDate) {
              dateMatch = isWithinInterval(workOrderDate, {
                start: filters.startDate,
                end: filters.endDate
              });
            } else if (filters.startDate) {
              dateMatch = workOrderDate >= filters.startDate;
            } else if (filters.endDate) {
              dateMatch = workOrderDate <= filters.endDate;
            }
          } else {
            // If no date available, exclude from date-filtered results
            dateMatch = !filters.startDate && !filters.endDate;
          }
        }
        
        // Handle work type filter
        const workTypeMatch = filters.workType 
          ? wo.workType?._id === filters.workType || 
            (typeof wo.workType === 'string' && wo.workType === filters.workType) ||
            wo.workType?.name?.toLowerCase() === filters.workType.toLowerCase() ||
            wo.workType?.code?.toLowerCase() === filters.workType.toLowerCase() ||
            wo.workType === filters.workType
          : true;
        
        // Handle work sub-type filter
        const workSubTypeMatch = filters.workSubType 
          ? wo.workSubType?._id === filters.workSubType || 
            (typeof wo.workSubType === 'string' && wo.workSubType === filters.workSubType) ||
            wo.workSubType?.name?.toLowerCase() === filters.workSubType.toLowerCase() ||
            wo.workSubType?.code?.toLowerCase() === filters.workSubType.toLowerCase() ||
            wo.workSubType === filters.workSubType
          : true;
          
        return buildingMatch && statusMatch && dateMatch && workTypeMatch && workSubTypeMatch;
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
      flex: 1.5,
      minWidth: 200,
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
      minWidth: 120,
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
      width: 100,
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
      width: 80,
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
      width: 120,
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
          const cleanBaseUrl = baseUrl.replace(/\/api\/v1\/api\/v1/g, '/api/v1').replace(/\/+$/, '').replace('/api/v1', '');
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
                      width: 35,
                      height: 35,
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
                        e.target.parentElement.style.display = 'flex';
                        e.target.parentElement.style.alignItems = 'center';
                        e.target.parentElement.style.justifyContent = 'center';
                        e.target.parentElement.style.flexDirection = 'column';
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
      width: 100,
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
      flex: 1,
      minWidth: 120,
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
      width: 80,
      valueGetter: (params) => {
        try {
          if (!params.row) return 'N/A';
          const apartmentNumber = params.row.apartmentNumber || 'N/A';

          // Check if apartmentNumber is a number (digits only) or contains text
          if (apartmentNumber === 'N/A') {
            return 'No apartment';
          } else if (/^\d+$/.test(apartmentNumber.trim())) {
            // If it's only digits, add "Apt" prefix
            return `Apt ${apartmentNumber}`;
          } else {
            // If it contains text (like "Hallway"), return as-is
            return apartmentNumber;
          }
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

          // Check if apartmentNumber is a number (digits only) or contains text
          let displayText = apartmentNumber;
          if (/^\d+$/.test(apartmentNumber.trim())) {
            // If it's only digits, add "Apt" prefix
            displayText = `Apt ${apartmentNumber}`;
          }
          // If it contains text (like "Hallway"), use as-is

          return (
            <Typography
              variant="body2"
              fontWeight="medium"
              sx={{
                fontSize: '0.875rem',
                lineHeight: 1.4
              }}
            >
              {displayText}
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
      flex: 0.6,
      minWidth: 80,
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

      {/* ENHANCED FILTERS SECTION */}
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Card sx={{
          mb: 4,
          boxShadow: '0 8px 32px rgba(25, 118, 210, 0.15)',
          border: '2px solid #1976d2',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
          overflow: 'visible'
        }}>
          <CardContent sx={{ p: 4 }}>
            {/* Header Section */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              mb: 3,
              flexWrap: 'wrap',
              gap: 2
            }}>
              <Box>
                <Typography variant="h4" sx={{ 
                  fontWeight: 'bold', 
                  color: '#1976d2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 1
                }}>
                  🔍 Advanced Work Order Filters
                </Typography>
                <Typography variant="body1" sx={{ 
                  color: '#555',
                  fontSize: '1.1rem'
                }}>
                  Total: <strong>{workOrders.length}</strong> | 
                  Filtered: <strong style={{ color: '#1976d2' }}>{filteredWorkOrders.length}</strong>
                  {(filters.startDate || filters.endDate) && (
                    <span style={{ color: '#9c27b0', marginLeft: '8px' }}>
                      📅 {filters.startDate ? format(filters.startDate, 'MMM dd, yyyy') : 'Start'} → {filters.endDate ? format(filters.endDate, 'MMM dd, yyyy') : 'End'}
                    </span>
                  )}
                  {filters.workType && (
                    <span style={{ color: '#2e7d32', marginLeft: '8px' }}>
                      🏷️ {(() => {
                        try {
                          const workTypes = workTypesData?.data?.workTypes || [];
                          const workType = workTypes.find(wt => wt._id === filters.workType || wt.name === filters.workType);
                          return workType?.name || filters.workType;
                        } catch (error) {
                          return filters.workType;
                        }
                      })()} 
                      {filters.workSubType && (
                        <span style={{ color: '#ed6c02' }}>
                          → {(() => {
                            try {
                              const workSubTypes = workSubTypesData?.data?.workSubTypes || [];
                              const workSubType = workSubTypes.find(wst => wst._id === filters.workSubType || wst.name === filters.workSubType);
                              return workSubType?.name || filters.workSubType;
                            } catch (error) {
                              return filters.workSubType;
                            }
                          })()}
                        </span>
                      )}
                    </span>
                  )}
                </Typography>
              </Box>
              
              {/* Clear All Filters - Top Right */}
              <Button
                variant="contained"
                color="error"
                onClick={clearAllFilters}
                disabled={!filters.building && !filters.status && !filters.startDate && !filters.endDate && !filters.workType && !filters.workSubType}
                size="large"
                startIcon={<FilterIcon />}
                sx={{ 
                  minWidth: '180px',
                  height: '48px',
                  borderRadius: '24px',
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)'
                }}
              >
                Clear All Filters
              </Button>
            </Box>
            
            {/* Quick Date Filter Buttons Section */}
            <Box sx={{ 
              mb: 3, 
              p: 2, 
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              borderRadius: '12px',
              border: '1px solid rgba(25, 118, 210, 0.2)'
            }}>
              <Typography variant="h6" gutterBottom sx={{ 
                color: '#1976d2', 
                fontWeight: 'bold',
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                📅 Quick Date Filters
              </Typography>
              <Grid container spacing={1}>
                {[
                  { key: 'today', label: 'Today', color: 'primary' },
                  { key: 'thisWeek', label: 'This Week', color: 'secondary' },
                  { key: 'thisMonth', label: 'This Month', color: 'success' },
                  { key: 'lastMonth', label: 'Last Month', color: 'warning' },
                  { key: 'thisYear', label: 'This Year', color: 'info' },
                  { key: 'last30Days', label: 'Last 30 Days', color: 'primary' },
                  { key: 'last90Days', label: 'Last 90 Days', color: 'secondary' }
                ].map((filter) => (
                  <Grid item xs={6} sm={4} md={3} lg={2} xl={1.7} key={filter.key}>
                    <Button 
                      variant="outlined"
                      color={filter.color}
                      onClick={() => setQuickDateFilter(filter.key)}
                      fullWidth
                      sx={{
                        height: '40px',
                        borderRadius: '20px',
                        textTransform: 'none',
                        fontWeight: 'medium',
                        fontSize: '0.9rem',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        },
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {filter.label}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </Box>
            
            {/* Main Filter Controls */}
            <Box sx={{
              p: 3,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '12px',
              border: '1px solid rgba(25, 118, 210, 0.2)'
            }}>
              <Typography variant="h6" gutterBottom sx={{ 
                color: '#1976d2', 
                fontWeight: 'bold',
                mb: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                🎯 Detailed Filters
              </Typography>
              
              <Grid container spacing={3}>
                {/* Work Type Filter */}
                <Grid item xs={12} md={6} lg={2.4}>
                  <Box sx={{ 
                    p: 2, 
                    border: '2px dashed #ff9800', 
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 152, 0, 0.05)'
                  }}>
                    <Typography variant="subtitle2" sx={{ 
                      color: '#ff9800', 
                      fontWeight: 'bold', 
                      mb: 1.5,
                      textAlign: 'center'
                    }}>
                      🏷️ Work Type
                    </Typography>
                    <TextField
                      select
                      fullWidth
                      label="Select Category"
                      name="workType"
                      value={filters.workType}
                      onChange={handleWorkTypeChange}
                      variant="outlined"
                      size="medium"
                      disabled={isLoadingWorkTypes || Boolean(workTypesError)}
                      helperText={
                        isLoadingWorkTypes 
                          ? 'Loading categories...' 
                          : workTypesError 
                          ? 'Error loading categories' 
                          : ''
                      }
                      error={Boolean(workTypesError)}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px'
                        }
                      }}
                    >
                      <MenuItem value="">
                        <em>All Categories</em>
                      </MenuItem>
                      {(() => {
                        try {
                          const workTypes = workTypesData?.data?.workTypes || [];
                          return workTypes.map(workType => (
                            <MenuItem key={workType._id} value={workType._id}>
                              <Box display="flex" alignItems="center" gap={1}>
                                {workType.name === 'painting' && '🎨'}
                                {workType.name === 'cleaning' && '🧹'}
                                {workType.name === 'repair' && '🔧'}
                                {workType.name === 'maintenance' && '⚙️'}
                                {workType.name === 'inspection' && '🔍'}
                                {workType.name === 'other' && '📋'}
                                {workType.name || workType.code || 'Unnamed Category'}
                              </Box>
                            </MenuItem>
                          ));
                        } catch (error) {
                          console.error('Error rendering work type options:', error);
                          return (
                            <MenuItem disabled>
                              Error loading categories
                            </MenuItem>
                          );
                        }
                      })()}
                    </TextField>
                  </Box>
                </Grid>
                
                {/* Work Sub-Type Filter */}
                <Grid item xs={12} md={6} lg={2.4}>
                  <Box sx={{ 
                    p: 2, 
                    border: '2px dashed #ff5722', 
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 87, 34, 0.05)'
                  }}>
                    <Typography variant="subtitle2" sx={{ 
                      color: '#ff5722', 
                      fontWeight: 'bold', 
                      mb: 1.5,
                      textAlign: 'center'
                    }}>
                      🎯 Sub-Category
                    </Typography>
                    <TextField
                      select
                      fullWidth
                      label="Select Sub-Category"
                      name="workSubType"
                      value={filters.workSubType}
                      onChange={handleFilterChange}
                      variant="outlined"
                      size="medium"
                      disabled={!filters.workType || isLoadingWorkSubTypes || Boolean(workSubTypesError)}
                      helperText={
                        !filters.workType 
                          ? 'Select category first' 
                          : isLoadingWorkSubTypes 
                          ? 'Loading sub-categories...' 
                          : workSubTypesError 
                          ? 'Error loading sub-categories' 
                          : ''
                      }
                      error={Boolean(workSubTypesError)}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px'
                        }
                      }}
                    >
                      <MenuItem value="">
                        <em>All Sub-Categories</em>
                      </MenuItem>
                      {(() => {
                        try {
                          const workSubTypes = workSubTypesData?.data?.workSubTypes || [];
                          return workSubTypes.map(workSubType => (
                            <MenuItem key={workSubType._id} value={workSubType._id}>
                              {workSubType.name || workSubType.code || 'Unnamed Sub-Category'}
                            </MenuItem>
                          ));
                        } catch (error) {
                          console.error('Error rendering work sub-type options:', error);
                          return (
                            <MenuItem disabled>
                              Error loading sub-categories
                            </MenuItem>
                          );
                        }
                      })()}
                    </TextField>
                  </Box>
                </Grid>
                
                {/* Date Range Filters */}
                <Grid item xs={12} md={6} lg={2.4}>
                  <Box sx={{ 
                    p: 2, 
                    border: '2px dashed #1976d2', 
                    borderRadius: '8px',
                    backgroundColor: 'rgba(25, 118, 210, 0.05)'
                  }}>
                    <Typography variant="subtitle2" sx={{ 
                      color: '#1976d2', 
                      fontWeight: 'bold', 
                      mb: 1.5,
                      textAlign: 'center'
                    }}>
                      📅 Start Date
                    </Typography>
                    <DatePicker
                      label="From Date"
                      value={filters.startDate}
                      onChange={(date) => handleDateFilterChange('startDate', date)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'medium',
                          variant: 'outlined',
                          sx: {
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '8px'
                            }
                          }
                        }
                      }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6} lg={2.4}>
                  <Box sx={{ 
                    p: 2, 
                    border: '2px dashed #9c27b0', 
                    borderRadius: '8px',
                    backgroundColor: 'rgba(156, 39, 176, 0.05)'
                  }}>
                    <Typography variant="subtitle2" sx={{ 
                      color: '#9c27b0', 
                      fontWeight: 'bold', 
                      mb: 1.5,
                      textAlign: 'center'
                    }}>
                      📅 End Date
                    </Typography>
                    <DatePicker
                      label="To Date"
                      value={filters.endDate}
                      onChange={(date) => handleDateFilterChange('endDate', date)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'medium',
                          variant: 'outlined',
                          sx: {
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '8px'
                            }
                          }
                        }
                      }}
                    />
                  </Box>
                </Grid>
                
                {/* Building Filter */}
                <Grid item xs={12} md={6} lg={2.4}>
                  <Box sx={{ 
                    p: 2, 
                    border: '2px dashed #2e7d32', 
                    borderRadius: '8px',
                    backgroundColor: 'rgba(46, 125, 50, 0.05)'
                  }}>
                    <Typography variant="subtitle2" sx={{ 
                      color: '#2e7d32', 
                      fontWeight: 'bold', 
                      mb: 1.5,
                      textAlign: 'center'
                    }}>
                      🏢 Building
                    </Typography>
                    <TextField
                      select
                      fullWidth
                      label="Select Building"
                      name="building"
                      value={filters.building}
                      onChange={handleFilterChange}
                      variant="outlined"
                      size="medium"
                      disabled={isLoadingBuildings || Boolean(buildingsError)}
                      helperText={
                        isLoadingBuildings 
                          ? 'Loading buildings...' 
                          : buildingsError 
                          ? 'Error loading buildings' 
                          : ''
                      }
                      error={Boolean(buildingsError)}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px'
                        }
                      }}
                    >
                      <MenuItem value="">
                        <em>All Buildings</em>
                      </MenuItem>
                      {(() => {
                        try {
                          let buildings = [];
                          
                          // Handle different possible data structures
                          if (buildingsData?.data?.buildings && Array.isArray(buildingsData.data.buildings)) {
                            buildings = buildingsData.data.buildings;
                          } else if (buildingsData?.data && Array.isArray(buildingsData.data)) {
                            buildings = buildingsData.data;
                          } else if (buildingsData?.buildings && Array.isArray(buildingsData.buildings)) {
                            buildings = buildingsData.buildings;
                          } else if (Array.isArray(buildingsData)) {
                            buildings = buildingsData;
                          }
                          
                          return buildings.map(building => (
                            <MenuItem key={building._id || building.id} value={building._id || building.id}>
                              {building.name || building.title || 'Unnamed Building'}
                            </MenuItem>
                          ));
                        } catch (error) {
                          console.error('Error rendering building options:', error);
                          return (
                            <MenuItem disabled>
                              Error loading buildings
                            </MenuItem>
                          );
                        }
                      })()}
                    </TextField>
                  </Box>
                </Grid>
                
                {/* Status Filter */}
                <Grid item xs={12} md={6} lg={2.4}>
                  <Box sx={{ 
                    p: 2, 
                    border: '2px dashed #ed6c02', 
                    borderRadius: '8px',
                    backgroundColor: 'rgba(237, 108, 2, 0.05)'
                  }}>
                    <Typography variant="subtitle2" sx={{ 
                      color: '#ed6c02', 
                      fontWeight: 'bold', 
                      mb: 1.5,
                      textAlign: 'center'
                    }}>
                      📊 Status
                    </Typography>
                    <TextField
                      select
                      fullWidth
                      label="Select Status"
                      name="status"
                      value={filters.status}
                      onChange={handleFilterChange}
                      variant="outlined"
                      size="medium"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px'
                        }
                      }}
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
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      </LocalizationProvider>

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
