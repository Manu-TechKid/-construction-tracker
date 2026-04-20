import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Button,
  Grid,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';

/**
 * MobileResponsiveTable - Automatically switches between table and card view
 * Usage: Replace <Table> components with this component
 */
const MobileResponsiveTable = ({
  data = [],
  columns = [],
  keyExtractor = (item, index) => index,
  onEdit,
  onDelete,
  onRowClick,
  emptyMessage = 'No data available',
  renderCardContent,
  cardTitleField = 'name',
  cardSubtitleField,
  actionButtons = ['edit', 'delete'],
  cardProps = {}
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Mobile Card View
  if (isMobile) {
    return (
      <Box sx={{ width: '100%' }}>
        {data.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">{emptyMessage}</Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {data.map((item, index) => {
              const key = keyExtractor(item, index);
              
              return (
                <Grid item xs={12} key={key}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      cursor: onRowClick ? 'pointer' : 'default',
                      '&:hover': onRowClick ? { bgcolor: 'action.hover' } : {}
                    }}
                    onClick={() => onRowClick?.(item)}
                    {...cardProps}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      {/* Card Header */}
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Box flex={1}>
                          <Typography variant="subtitle1" fontWeight="bold" noWrap>
                            {item[cardTitleField] || 'Untitled'}
                          </Typography>
                          {cardSubtitleField && item[cardSubtitleField] && (
                            <Typography variant="caption" color="text.secondary" noWrap display="block">
                              {item[cardSubtitleField]}
                            </Typography>
                          )}
                        </Box>
                        <Box display="flex" gap={0.5}>
                          {actionButtons.includes('edit') && onEdit && (
                            <IconButton 
                              size="small" 
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(item);
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          )}
                          {actionButtons.includes('delete') && onDelete && (
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(item);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </Box>
                      
                      {/* Custom Card Content */}
                      {renderCardContent ? (
                        renderCardContent(item)
                      ) : (
                        // Default card content showing key fields
                        <Grid container spacing={1}>
                          {columns.slice(0, 3).map((column) => (
                            <Grid item xs={6} key={column.key || column.field}>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {column.header}
                              </Typography>
                              <Typography variant="body2" noWrap>
                                {column.render 
                                  ? column.render(item[column.field], item)
                                  : item[column.field] || '-'
                                }
                              </Typography>
                            </Grid>
                          ))}
                        </Grid>
                      )}
                      
                      {onRowClick && (
                        <Box display="flex" justifyContent="flex-end" mt={1}>
                          <Button 
                            size="small" 
                            endIcon={<ChevronRightIcon />}
                            sx={{ minWidth: 'auto', p: 0 }}
                          >
                            View
                          </Button>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
    );
  }
  
  // Desktop Table View - Return null, let parent render table
  return null;
};

export default MobileResponsiveTable;
