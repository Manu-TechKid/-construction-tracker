import { useState } from 'react';
import { toast } from 'react-toastify';

export const useEmailSender = () => {
  const [isSending, setIsSending] = useState(false);

  const sendEmail = async (emailData) => {
    setIsSending(true);
    
    try {
      // In a real implementation, this would call your email service API
      // For now, we'll simulate the email sending
      
      console.log('Sending email with data:', emailData);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For development, we'll just show success message
      // In production, this would make actual API call to email service
      const recipientCount = emailData.recipients.length;
      const recipientNames = emailData.recipients.map(r => r.name).join(', ');
      
      toast.success(
        `${emailData.documentType === 'invoice' ? 'Invoice' : 'Estimate'} sent successfully to ${recipientCount} recipient${recipientCount > 1 ? 's' : ''}: ${recipientNames}`,
        { autoClose: 5000 }
      );
      
      // Log email details for development
      console.log('Email sent successfully:', {
        to: emailData.recipients.map(r => `${r.name} <${r.email}>`),
        subject: emailData.subject,
        building: emailData.building.name,
        documentType: emailData.documentType,
      });
      
      return { success: true, message: 'Email sent successfully' };
      
    } catch (error) {
      console.error('Failed to send email:', error);
      toast.error(`Failed to send ${emailData.documentType}: ${error.message}`);
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  // Future: Add email template management
  const getEmailTemplate = (documentType, building, documentData) => {
    const templates = {
      invoice: {
        subject: `Invoice #{{invoiceNumber}} - {{buildingName}}`,
        body: `Dear {{managerName}},

Please find attached invoice #{{invoiceNumber}} for {{buildingName}}.

Invoice Details:
- Amount: ${{amount}}
- Due Date: {{dueDate}}
- Work Performed: {{workDescription}}

Payment can be made via:
- Check payable to: DSJ Construction & Services LLC
- Online payment: [Payment Portal Link]

If you have any questions regarding this invoice, please contact us at your earliest convenience.

Best regards,
DSJ Construction & Services LLC
Phone: (555) 123-4567
Email: billing@dsjconstruction.com`
      },
      estimate: {
        subject: `Estimate #{{estimateNumber}} - {{buildingName}}`,
        body: `Dear {{managerName}},

Thank you for your interest in our services. Please find attached estimate #{{estimateNumber}} for {{buildingName}}.

Estimate Details:
- Total Amount: ${{amount}}
- Valid Until: {{validUntil}}
- Scope of Work: {{workDescription}}

This estimate includes:
- Labor and materials
- Equipment usage
- Cleanup and disposal

To proceed with this work, please reply to this email or call us at (555) 123-4567.

Best regards,
DSJ Construction & Services LLC`
      }
    };
    
    return templates[documentType] || templates.invoice;
  };

  // Future: Add email history tracking
  const getEmailHistory = async (documentId, documentType) => {
    // This would fetch email history from backend
    return [];
  };

  return {
    sendEmail,
    isSending,
    getEmailTemplate,
    getEmailHistory,
  };
};
