import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  InputAdornment,
  Divider,
  Stack
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Business as BuildingIcon,
  Home as ApartmentIcon,
  Work as WorkIcon,
  Receipt as InvoiceIcon,
  Event as ScheduleIcon,
  Assignment as ReminderIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useGetBuildingsQuery } from '../../features/buildings/buildingsApiSlice';
import { useSearchApartmentMutation } from '../../features/search/searchApiSlice';
import { toast } from 'react-toastify';

const ApartmentSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [filters, setFilters] = useState({
    serviceType: '',
    dateRange: '',
    status: ''
  });

  const { data: buildingsData } = useGetBuildingsQuery();
  const buildings = buildingsData?.data?.buildings || [];
  const [searchApartment] = useSearchApartmentMutation();

  const serviceTypes = [
    'painting', 'cleaning', 'repair', 'maintenance', 'inspection', 
    'installation', 'renovation', 'emergency', 'preventive'
  ];

  const statusOptions = [
    'pending', 'in_progress', 'completed', 'cancelled', 'on_hold'
  ];

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('Please enter an apartment number to search');
      return;
    }

    setIsSearching(true);
    setSearchPerformed(true);

    try {
      const searchParams = {
        apartmentNumber: searchTerm.trim(),
        buildingId: selectedBuilding || undefined,
        serviceType: filters.serviceType || undefined,
        status: filters.status || undefined,
        dateRange: filters.dateRange || undefined
      };

      console.log('Search params:', searchParams);
      const response = await searchApartment(searchParams).unwrap();
      console.log('Search response:', response);
      setSearchResults(response.data || []);
      
      if (response.data?.length === 0) {
        toast.info('No records found for this apartment');
      } else {
        toast.success(`Found ${response.data?.length} records`);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search apartment records');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSelectedBuilding('');
    setFilters({
      serviceType: '',
      dateRange: '',
      status: ''
    });
    setSearchResults([]);
    setSearchPerformed(false);
  };

  const getServiceIcon = (type) => {
    switch (type) {
      case 'work_order': return <WorkIcon />;
      case 'invoice': return <InvoiceIcon />;
      case 'schedule': return <ScheduleIcon />;
      case 'reminder': return <ReminderIcon />;
      default: return <HistoryIcon />;
    }
  };

  const getServiceColor = (type) => {
    switch (type) {
      case 'work_order': return 'primary';
      case 'invoice': return 'success';
      case 'schedule': return 'warning';
      case 'reminder': return 'info';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'pending': return 'info';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const groupedResults = searchResults.reduce((acc, result) => {
    const buildingName = result.building?.name || 'Unknown Building';
    if (!acc[buildingName]) {
      acc[buildingName] = [];
    }
    acc[buildingName].push(result);
    return acc;
  }, {});

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SearchIcon color="primary" sx={{ mr: 2 }} />
        <Typography variant="h4" component="h1">
          Apartment Search
        </Typography>
      </Box>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Search for apartment records across all buildings. Find maintenance history, 
        work orders, invoices, and schedules for any apartment number.
      </Typography>

      {/* Search Form */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Apartment Number"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="e.g., 420"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <ApartmentIcon />
                    </InputAdornment>
                  ),
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Filter by Building</InputLabel>
                <Select
                  value={selectedBuilding}
                  label="Filter by Building"
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                  startAdornment={<BuildingIcon sx={{ mr: 1, color: 'action.active' }} />}
                >
                  <MenuItem value="">
                    <em>All Buildings</em>
                  </MenuItem>
                  {buildings.map((building) => (
                    <MenuItem key={building._id} value={building._id}>
                      {building.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  onClick={handleSearch}
                  disabled={isSearching}
                  startIcon={isSearching ? <CircularProgress size={20} /> : <SearchIcon />}
                  fullWidth
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </Button>
                <IconButton onClick={handleClearSearch} color="secondary">
                  <ClearIcon />
                </IconButton>
              </Stack>
            </Grid>

            <Grid item xs={12} md={2}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <FilterIcon sx={{ mr: 1 }} />
                    <Typography variant="body2">Advanced Filters</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Service Type</InputLabel>
                        <Select
                          value={filters.serviceType}
                          label="Service Type"
                          onChange={(e) => setFilters({ ...filters, serviceType: e.target.value })}
                        >
                          <MenuItem value="">All Types</MenuItem>
                          {serviceTypes.map((type) => (
                            <MenuItem key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={filters.status}
                          label="Status"
                          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                          <MenuItem value="">All Statuses</MenuItem>
                          {statusOptions.map((status) => (
                            <MenuItem key={status} value={status}>
                              {status.replace('_', ' ').toUpperCase()}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Date Range</InputLabel>
                        <Select
                          value={filters.dateRange}
                          label="Date Range"
                          onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                        >
                          <MenuItem value="">All Time</MenuItem>
                          <MenuItem value="last_week">Last Week</MenuItem>
                          <MenuItem value="last_month">Last Month</MenuItem>
                          <MenuItem value="last_3_months">Last 3 Months</MenuItem>
                          <MenuItem value="last_6_months">Last 6 Months</MenuItem>
                          <MenuItem value="last_year">Last Year</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchPerformed && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Search Results for Apartment "{searchTerm}"
              </Typography>
              {searchResults.length > 0 && (
                <Chip 
                  label={`${searchResults.length} records found`} 
                  color="primary" 
                  variant="outlined" 
                />
              )}
            </Box>

            {selectedBuilding && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Filtered by building: {buildings.find(b => b._id === selectedBuilding)?.name}
              </Alert>
            )}

            {searchResults.length === 0 ? (
              <Alert severity="info">
                No records found for apartment "{searchTerm}".
                {selectedBuilding && " Try removing the building filter to search across all buildings."}
              </Alert>
            ) : (
              <Box>
                {Object.entries(groupedResults).map(([buildingName, records]) => (
                  <Accordion key={buildingName} defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <BuildingIcon sx={{ mr: 2 }} />
                        <Typography variant="h6" sx={{ flexGrow: 1 }}>
                          {buildingName}
                        </Typography>
                        <Chip 
                          label={`${records.length} records`} 
                          size="small" 
                          color="primary" 
                          variant="outlined" 
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Type</TableCell>
                              <TableCell>Title/Description</TableCell>
                              <TableCell>Service</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Date</TableCell>
                              <TableCell>Cost</TableCell>
                              <TableCell>Workers</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {records.map((record, index) => (
                              <TableRow key={`${record.type}-${record.id}-${index}`}>
                                <TableCell>
                                  <Chip
                                    icon={getServiceIcon(record.type)}
                                    label={record.type.replace('_', ' ').toUpperCase()}
                                    size="small"
                                    color={getServiceColor(record.type)}
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight="medium">
                                    {record.title}
                                  </Typography>
                                  {record.description && (
                                    <Typography variant="caption" color="text.secondary">
                                      {record.description.substring(0, 100)}
                                      {record.description.length > 100 ? '...' : ''}
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {record.serviceType && (
                                    <Chip
                                      label={record.serviceType}
                                      size="small"
                                      variant="outlined"
                                    />
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={record.status?.replace('_', ' ').toUpperCase() || 'N/A'}
                                    size="small"
                                    color={getStatusColor(record.status)}
                                    variant="filled"
                                  />
                                </TableCell>
                                <TableCell>
                                  {record.date && format(new Date(record.date), 'MMM dd, yyyy')}
                                </TableCell>
                                <TableCell>
                                  {record.cost && `$${record.cost.toFixed(2)}`}
                                </TableCell>
                                <TableCell>
                                  {record.workers && record.workers.length > 0 && (
                                    <Box>
                                      {record.workers.slice(0, 2).map((worker, idx) => (
                                        <Chip
                                          key={idx}
                                          label={worker.name}
                                          size="small"
                                          variant="outlined"
                                          sx={{ mr: 0.5, mb: 0.5 }}
                                        />
                                      ))}
                                      {record.workers.length > 2 && (
                                        <Chip
                                          label={`+${record.workers.length - 2} more`}
                                          size="small"
                                          variant="outlined"
                                        />
                                      )}
                                    </Box>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ApartmentSearch;
