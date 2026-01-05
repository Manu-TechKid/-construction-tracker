import React from 'react';
import { Modal, Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';
import { format } from 'date-fns';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80%',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
};

const CleaningServicesModal = ({ open, handleClose, workOrders }) => {
  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <Typography variant="h6" component="h2" gutterBottom>
          Weekly Cleaning Services
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Building</TableCell>
                <TableCell>Service</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Payment</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workOrders?.map((wo) => (
                <TableRow key={wo._id}>
                  <TableCell>{format(new Date(wo.scheduledDate), 'P')}</TableCell>
                  <TableCell>{wo.building?.name}</TableCell>
                  <TableCell>{wo.workSubType?.name}</TableCell>
                  <TableCell>{wo.assignedTo?.map(a => a.worker?.name).join(', ')}</TableCell>
                  <TableCell><Chip label={wo.status} size="small" /></TableCell>
                  <TableCell><Chip label={wo.billingStatus} size="small" color={wo.billingStatus === 'paid' ? 'success' : 'default'} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Modal>
  );
};

export default CleaningServicesModal;
