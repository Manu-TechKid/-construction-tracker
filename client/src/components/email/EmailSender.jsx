import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip,
  Stack,
} from '@mui/material';
import {
  Email as EmailIcon,
  Person as PersonIcon,
  Send as SendIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';

const EmailSender = ({ 
  open, 
  onClose, 
  building, 
  documentType = 'invoice', // 'invoice' or 'estimate'
  documentData = null,
  onSend = () => {}
}) => {
  const [selectedRecipients, setSelectedRecipients] = useState({
    generalManager: true,
    maintenanceManager: false,
    thirdContact: false,
  });
  const [customEmails, setCustomEmails] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Prepare recipients from building data
  const recipients = [
    {
      key: 'generalManager',
      name: building?.generalManagerName || 'General Manager',
      email: building?.generalManagerEmail || '',
      role: 'General Manager',
      available: !!building?.generalManagerEmail,
    },
    {
      key: 'maintenanceManager', 
      name: building?.maintenanceManagerName || 'Maintenance Manager',
      email: building?.maintenanceManagerEmail || '',
      role: 'Maintenance Manager',
      available: !!building?.maintenanceManagerEmail,
    },
    {
      key: 'thirdContact',
      name: building?.thirdContactName || 'Third Contact',
      email: building?.thirdContactEmail || '',
      role: building?.thirdContactRole || 'Contact',
      available: !!building?.thirdContactEmail,
    },
  ].filter(recipient => recipient.available);

  // Auto-generate subject and message based on document type
  React.useEffect(() => {
    if (!building) return;
    
    const docTypeTitle = documentType === 'invoice' ? 'Invoice' : 'Estimate';
    const docNumber = documentData?.number || documentData?.id || 'N/A';
    
    setSubject(`${docTypeTitle} #${docNumber} - ${building.name}`);
    
    const defaultMessage = `Dear ${building.generalManagerName || 'Manager'},

Please find attached the ${documentType} for ${building.name}.

${documentType === 'invoice' ? 
  `Invoice Details:
- Invoice Number: #${docNumber}
- Amount: $${documentData?.total || documentData?.totalAmount || '0.00'}
- Due Date: ${documentData?.dueDate ? new Date(documentData.dueDate).toLocaleDateString() : 'N/A'}` :
  `Estimate Details:
- Estimate Number: #${docNumber}
- Total Amount: $${documentData?.total || '0.00'}`
}

If you have any questions, please don't hesitate to contact us.

Best regards,
DSJ Construction & Services LLC`;

    setMessage(defaultMessage);
  }, [building, documentType, documentData]);

  const handleRecipientChange = (key) => {
    setSelectedRecipients(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSend = async () => {
    setIsSending(true);
    
    try {
      // Collect selected email addresses
      const emailList = [];
      
      recipients.forEach(recipient => {
        if (selectedRecipients[recipient.key]) {
          emailList.push({
            name: recipient.name,
            email: recipient.email,
            role: recipient.role,
          });
        }
      });
      
      // Add custom emails if provided
      if (customEmails.trim()) {
        const customEmailList = customEmails
          .split(',')
          .map(email => email.trim())
          .filter(email => email)
          .map(email => ({
            name: 'Custom Recipient',
            email: email,
            role: 'Custom',
          }));
        emailList.push(...customEmailList);
      }
      
      if (emailList.length === 0) {
        throw new Error('Please select at least one recipient');
      }
      
      // Call the onSend callback with email data
      await onSend({
        recipients: emailList,
        subject: subject.trim(),
        message: message.trim(),
        documentType,
        documentData,
        building,
      });
      
      // Reset form and close
      setSelectedRecipients({
        generalManager: true,
        maintenanceManager: false,
        thirdContact: false,
      });
      setCustomEmails('');
      onClose();
      
    } catch (error) {
      console.error('Failed to send email:', error);
      // Error handling would be done by parent component
    } finally {
      setIsSending(false);
    }
  };

  const selectedCount = Object.values(selectedRecipients).filter(Boolean).length + 
    (customEmails.trim() ? customEmails.split(',').filter(e => e.trim()).length : 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <EmailIcon color="primary" />
          <Typography variant="h6">
            Send {documentType === 'invoice' ? 'Invoice' : 'Estimate'} - {building?.name}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={3}>
          {/* Recipients Selection */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Select Recipients ({selectedCount} selected)
            </Typography>
            <FormGroup>
              {recipients.map((recipient) => (
                <FormControlLabel
                  key={recipient.key}
                  control={
                    <Checkbox
                      checked={selectedRecipients[recipient.key]}
                      onChange={() => handleRecipientChange(recipient.key)}
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <PersonIcon fontSize="small" />
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {recipient.name} ({recipient.role})
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {recipient.email}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
              ))}
            </FormGroup>
            
            {recipients.length === 0 && (
              <Alert severity="warning">
                No contact information available for this building. Please update building contacts.
              </Alert>
            )}
          </Box>

          {/* Custom Emails */}
          <TextField
            fullWidth
            label="Additional Email Addresses (Optional)"
            placeholder="email1@example.com, email2@example.com"
            value={customEmails}
            onChange={(e) => setCustomEmails(e.target.value)}
            helperText="Separate multiple emails with commas"
          />

          {/* Subject */}
          <TextField
            fullWidth
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />

          {/* Message */}
          <TextField
            fullWidth
            label="Message"
            multiline
            rows={8}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />

          {/* Preview */}
          {selectedCount > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Email Preview:
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>To:</strong> {selectedCount} recipient{selectedCount > 1 ? 's' : ''}
                </Typography>
                <Typography variant="body2">
                  <strong>Subject:</strong> {subject}
                </Typography>
              </Box>
            </Box>
          )}
        </Stack>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} startIcon={<CancelIcon />}>
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          variant="contained"
          startIcon={isSending ? <CircularProgress size={20} /> : <SendIcon />}
          disabled={isSending || selectedCount === 0 || !subject.trim() || !message.trim()}
        >
          {isSending ? 'Sending...' : `Send to ${selectedCount} recipient${selectedCount > 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmailSender;
