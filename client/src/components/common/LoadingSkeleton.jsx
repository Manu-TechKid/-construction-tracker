import React from 'react';
import { Skeleton, Box, Card, CardContent, Grid } from '@mui/material';

export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <Box>
    {Array.from({ length: rows }).map((_, index) => (
      <Box key={index} sx={{ display: 'flex', gap: 2, mb: 1, alignItems: 'center' }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton
            key={colIndex}
            variant="text"
            width={colIndex === 0 ? '30%' : colIndex === columns - 1 ? '15%' : '20%'}
            height={40}
          />
        ))}
      </Box>
    ))}
  </Box>
);

export const CardSkeleton = ({ count = 3 }) => (
  <Grid container spacing={3}>
    {Array.from({ length: count }).map((_, index) => (
      <Grid item xs={12} sm={6} md={4} key={index}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="60%" height={32} />
            <Skeleton variant="text" width="40%" height={24} sx={{ mt: 1 }} />
            <Skeleton variant="rectangular" width="100%" height={60} sx={{ mt: 2 }} />
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Skeleton variant="rectangular" width={80} height={32} />
              <Skeleton variant="rectangular" width={80} height={32} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

export const CalendarSkeleton = () => (
  <Box>
    {/* Header */}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
      <Skeleton variant="text" width={200} height={40} />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Skeleton variant="rectangular" width={100} height={36} />
        <Skeleton variant="rectangular" width={100} height={36} />
      </Box>
    </Box>
    
    {/* Calendar Grid */}
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 2 }}>
      {Array.from({ length: 7 }).map((_, index) => (
        <Skeleton key={index} variant="text" width="100%" height={32} />
      ))}
    </Box>
    
    {/* Worker Rows */}
    {Array.from({ length: 4 }).map((_, rowIndex) => (
      <Box key={rowIndex} sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
          <Skeleton variant="text" width={150} height={24} />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {Array.from({ length: 7 }).map((_, dayIndex) => (
            <Skeleton key={dayIndex} variant="rectangular" width="100%" height={80} />
          ))}
        </Box>
      </Box>
    ))}
  </Box>
);

export const FormSkeleton = () => (
  <Box>
    <Skeleton variant="text" width={200} height={32} sx={{ mb: 3 }} />
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <Skeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" width="100%" height={56} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Skeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" width="100%" height={56} />
      </Grid>
      <Grid item xs={12}>
        <Skeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" width="100%" height={120} />
      </Grid>
    </Grid>
    <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
      <Skeleton variant="rectangular" width={100} height={36} />
      <Skeleton variant="rectangular" width={100} height={36} />
    </Box>
  </Box>
);

export default {
  TableSkeleton,
  CardSkeleton,
  CalendarSkeleton,
  FormSkeleton,
};
