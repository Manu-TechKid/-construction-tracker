import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Button,
  Typography,
  Alert,
} from '@mui/material';
import {
  AttachMoney as PricingIcon,
  Launch as LaunchIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const BuildingPricingRedirect = ({ buildingId, building }) => {
  const navigate = useNavigate();

  const handleGoToPricing = () => {
    // Navigate to the centralized pricing page with building filter pre-selected
    navigate(`/pricing?building=${buildingId}`);
  };

  return (
    <Box sx={{ py: 4 }}>
      <Card variant="outlined">
        <CardHeader 
          title="Building Pricing Management" 
          subheader="Manage pricing for this building in the centralized Customer Pricing page"
          avatar={<PricingIcon color="primary" />}
        />
        <CardContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Pricing management has been moved!</strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              To manage pricing for <strong>{building?.name}</strong>, please use the centralized 
              Customer Pricing page where you can view and manage pricing for all buildings in one place.
            </Typography>
          </Alert>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            The centralized pricing page offers:
          </Typography>
          
          <Box component="ul" sx={{ pl: 2, mb: 3 }}>
            <Typography component="li" variant="body2" color="text.secondary">
              View pricing across all buildings
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Filter by customer/building and service category
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Add, edit, and delete services with database-driven categories
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Auto-create pricing configurations when needed
            </Typography>
          </Box>

          <Button 
            variant="contained" 
            startIcon={<LaunchIcon />}
            onClick={handleGoToPricing}
            size="large"
          >
            Go to Customer Pricing
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default BuildingPricingRedirect;
