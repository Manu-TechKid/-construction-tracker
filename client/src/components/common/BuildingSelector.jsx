import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  Tooltip,
} from '@mui/material';
import { Business as BuildingIcon, Clear as ClearIcon } from '@mui/icons-material';
import { useBuildingContext } from '../../contexts/BuildingContext';

const BuildingSelector = ({ 
  variant = 'outlined', 
  size = 'medium', 
  showLabel = true,
  fullWidth = true,
  sx = {} 
}) => {
  const {
    selectedBuilding,
    buildings,
    isLoading,
    selectBuilding,
    clearBuildingSelection,
  } = useBuildingContext();

  const handleChange = (event) => {
    const buildingId = event.target.value;
    if (buildingId === 'all') {
      clearBuildingSelection();
    } else {
      const building = buildings.find(b => b._id === buildingId);
      selectBuilding(building);
    }
  };

  const handleClearSelection = (event) => {
    event.stopPropagation();
    clearBuildingSelection();
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ...sx }}>
      <FormControl variant={variant} size={size} fullWidth={fullWidth}>
        {showLabel && (
          <InputLabel id="building-selector-label">
            Select Building
          </InputLabel>
        )}
        <Select
          labelId="building-selector-label"
          value={selectedBuilding?._id || 'all'}
          onChange={handleChange}
          label={showLabel ? "Select Building" : undefined}
          disabled={isLoading}
          startAdornment={<BuildingIcon sx={{ mr: 1, color: 'action.active' }} />}
        >
          <MenuItem value="all">
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography>All Buildings</Typography>
            </Box>
          </MenuItem>
          {buildings.map((building) => (
            <MenuItem key={building._id} value={building._id}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Typography noWrap>{building.displayName || building.name}</Typography>
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ ml: 1 }}
                >
                  ({building.city || 'No city'})
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedBuilding && (
        <Tooltip title={`Clear selection: ${selectedBuilding.name}`}>
          <Chip
            icon={<BuildingIcon />}
            label={selectedBuilding.name}
            onDelete={handleClearSelection}
            deleteIcon={<ClearIcon />}
            variant="outlined"
            color="primary"
            size="small"
            sx={{ 
              maxWidth: 200,
              '& .MuiChip-label': {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }
            }}
          />
        </Tooltip>
      )}
    </Box>
  );
};

export default BuildingSelector;
