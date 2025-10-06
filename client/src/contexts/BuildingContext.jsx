import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGetBuildingsQuery } from '../features/buildings/buildingsApiSlice';

const BuildingContext = createContext();

export const useBuildingContext = () => {
  const context = useContext(BuildingContext);
  if (!context) {
    throw new Error('useBuildingContext must be used within a BuildingProvider');
  }
  return context;
};

export const BuildingProvider = ({ children }) => {
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [buildingFilter, setBuildingFilter] = useState('all'); // 'all' or building ID
  
  // Fetch buildings for dropdown
  const { data: buildingsData, isLoading } = useGetBuildingsQuery({});
  const buildings = buildingsData?.data?.buildings || [];

  // Load selected building from localStorage on mount
  useEffect(() => {
    const savedBuildingId = localStorage.getItem('selectedBuildingId');
    if (savedBuildingId && savedBuildingId !== 'all') {
      const building = buildings.find(b => b._id === savedBuildingId);
      if (building) {
        setSelectedBuilding(building);
        setBuildingFilter(savedBuildingId);
      }
    }
  }, [buildings]);

  // Save to localStorage when building changes
  useEffect(() => {
    if (selectedBuilding) {
      localStorage.setItem('selectedBuildingId', selectedBuilding._id);
    } else {
      localStorage.removeItem('selectedBuildingId');
    }
  }, [selectedBuilding]);

  const selectBuilding = (building) => {
    setSelectedBuilding(building);
    setBuildingFilter(building ? building._id : 'all');
  };

  const clearBuildingSelection = () => {
    setSelectedBuilding(null);
    setBuildingFilter('all');
    localStorage.removeItem('selectedBuildingId');
  };

  // Get filtered query params for API calls
  const getBuildingFilterParams = () => {
    return selectedBuilding ? { building: selectedBuilding._id } : {};
  };

  // Check if current context matches a building
  const isCurrentBuilding = (buildingId) => {
    return selectedBuilding?._id === buildingId;
  };

  const contextValue = {
    selectedBuilding,
    buildingFilter,
    buildings,
    isLoading,
    selectBuilding,
    clearBuildingSelection,
    getBuildingFilterParams,
    isCurrentBuilding,
  };

  return (
    <BuildingContext.Provider value={contextValue}>
      {children}
    </BuildingContext.Provider>
  );
};
