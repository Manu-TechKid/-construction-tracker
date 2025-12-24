import { useRef } from 'react';
import { Button, Box } from '@mui/material';
import { Download as DownloadIcon, Print as PrintIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import ProjectEstimatePDF from './ProjectEstimatePDF';

const EstimatePDFDownload = ({ estimate, companyInfo }) => {
  const printRef = useRef();

  const handlePrint = () => {
    const printContent = printRef.current;
    const originalContents = document.body.innerHTML;
    
    // Create print styles
    const printStyles = `
      <style>
        @media print {
          body { margin: 0; padding: 20px; }
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
          .MuiPaper-root { box-shadow: none !important; }
        }
      </style>
    `;
    
    document.body.innerHTML = printStyles + printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload(); // Reload to restore React functionality
  };

  const handleDownloadHTML = () => {
    try {
      const printContent = printRef.current;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Project Estimate - ${estimate.title}</title>
          <style>
            body { 
              font-family: 'Roboto', Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background: white;
              color: #333;
            }
            .estimate-container { 
              max-width: 800px; 
              margin: 0 auto; 
              background: white;
              padding: 40px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start; 
              margin-bottom: 30px;
              border-bottom: 2px solid #1976d2;
              padding-bottom: 20px;
            }
            .company-info h1 { 
              color: #1976d2; 
              margin: 0 0 10px 0; 
              font-size: 2rem;
            }
            .estimate-info { 
              text-align: right; 
            }
            .estimate-info h2 { 
              color: #1976d2; 
              margin: 0 0 10px 0; 
            }
            .project-details { 
              margin: 30px 0; 
            }
            .project-details h3 { 
              color: #1976d2; 
              border-bottom: 1px solid #ddd; 
              padding-bottom: 10px; 
            }
            .cost-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0; 
            }
            .cost-table th, .cost-table td { 
              border: 1px solid #ddd; 
              padding: 12px; 
              text-align: left; 
            }
            .cost-table th { 
              background-color: #f5f5f5; 
              font-weight: bold; 
            }
            .cost-table .total-row { 
              background-color: #e3f2fd; 
              font-weight: bold; 
              font-size: 1.1rem; 
            }
            .terms { 
              background-color: #f9f9f9; 
              padding: 20px; 
              border-radius: 5px; 
              margin: 30px 0; 
            }
            .terms h4 { 
              margin-top: 0; 
              color: #1976d2; 
            }
            .footer { 
              text-align: center; 
              margin-top: 40px; 
              padding-top: 20px; 
              border-top: 1px solid #ddd; 
              color: #666; 
            }
            .status-badge { 
              display: inline-block; 
              padding: 4px 12px; 
              border-radius: 4px; 
              font-size: 0.8rem; 
              font-weight: bold; 
              text-transform: uppercase; 
            }
            .status-approved { background-color: #4caf50; color: white; }
            .status-pending { background-color: #ff9800; color: white; }
            .status-draft { background-color: #9e9e9e; color: white; }
            .priority-urgent { background-color: #f44336; color: white; }
            .priority-high { background-color: #ff9800; color: white; }
            .priority-medium { background-color: #2196f3; color: white; }
            .priority-low { background-color: #4caf50; color: white; }
            @media print {
              body { margin: 0; padding: 10px; }
              .estimate-container { box-shadow: none; padding: 20px; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Project_Estimate_${estimate.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Estimate downloaded successfully!');
    } catch (error) {
      console.error('Error downloading estimate:', error);
      toast.error('Failed to download estimate');
    }
  };

  const handleShareByEmail = () => {
    const subject = `Project Estimate - ${estimate.title}`;
    const body = `Please find attached the project estimate for: ${estimate.title}
    
Building: ${estimate.building?.name || 'N/A'}
Estimated Cost: $${estimate.estimatedPrice?.toFixed(2) || '0.00'}
Visit Date: ${new Date(estimate.visitDate || estimate.createdAt).toLocaleDateString()}

Description:
${estimate.description}

This estimate is valid for 30 days from the date issued.

Best regards,
${companyInfo?.name || 'LKC HOME SERVICES LLC'}`;

    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  return (
    <Box>
      {/* Hidden component for printing/downloading */}
      <Box sx={{ display: 'none' }}>
        <ProjectEstimatePDF 
          ref={printRef} 
          estimate={estimate} 
          companyInfo={companyInfo} 
        />
      </Box>

      {/* Action buttons */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleDownloadHTML}
          size="small"
        >
          Download PDF
        </Button>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
          size="small"
        >
          Print
        </Button>
        <Button
          variant="outlined"
          onClick={handleShareByEmail}
          size="small"
        >
          Email
        </Button>
      </Box>

      {/* Preview component for display */}
      <Box sx={{ mt: 3 }}>
        <ProjectEstimatePDF 
          estimate={estimate} 
          companyInfo={companyInfo} 
        />
      </Box>
    </Box>
  );
};

export default EstimatePDFDownload;
