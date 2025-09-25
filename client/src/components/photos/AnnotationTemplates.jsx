import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  TextField,
  Chip,
  Tooltip,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Save as SaveIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Bookmark as TemplateIcon,
  Category as CategoryIcon,
  Palette as ColorIcon,
  Straighten as MeasureIcon
} from '@mui/icons-material';

const AnnotationTemplates = ({ open, onClose, onApplyTemplate }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Template creation state
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('measurement');
  const [templateAnnotations, setTemplateAnnotations] = useState([]);

  // Load templates from localStorage on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    try {
      const savedTemplates = localStorage.getItem('annotationTemplates');
      if (savedTemplates) {
        setTemplates(JSON.parse(savedTemplates));
      } else {
        // Load default templates
        setTemplates(getDefaultTemplates());
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates(getDefaultTemplates());
    }
  };

  const saveTemplates = (newTemplates) => {
    try {
      localStorage.setItem('annotationTemplates', JSON.stringify(newTemplates));
      setTemplates(newTemplates);
    } catch (error) {
      console.error('Error saving templates:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save templates',
        severity: 'error'
      });
    }
  };

  const getDefaultTemplates = () => [
    {
      id: 'room-measurements',
      name: 'Room Measurements',
      description: 'Standard room dimension measurements',
      category: 'measurement',
      color: '#ff0000',
      annotations: [
        {
          type: 'measure',
          startX: 100,
          startY: 100,
          endX: 300,
          endY: 100,
          value: '10',
          unit: 'ft',
          color: '#ff0000',
          lineWidth: 2
        },
        {
          type: 'measure',
          startX: 300,
          startY: 100,
          endX: 300,
          endY: 200,
          value: '12',
          unit: 'ft',
          color: '#00ff00',
          lineWidth: 2
        }
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: 'window-inspection',
      name: 'Window Inspection',
      description: 'Standard window inspection checklist',
      category: 'inspection',
      color: '#0000ff',
      annotations: [
        {
          type: 'rectangle',
          x: 150,
          y: 150,
          width: 100,
          height: 80,
          color: '#0000ff',
          lineWidth: 2,
          filled: false
        },
        {
          type: 'text',
          x: 200,
          y: 180,
          text: 'Check seals',
          color: '#0000ff',
          fontSize: 12
        }
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: 'electrical-outlets',
      name: 'Electrical Outlets',
      description: 'Mark electrical outlets for inspection',
      category: 'inspection',
      color: '#ffa500',
      annotations: [
        {
          type: 'circle',
          x: 200,
          y: 200,
          radius: 15,
          color: '#ffa500',
          lineWidth: 2,
          filled: true
        },
        {
          type: 'text',
          x: 220,
          y: 220,
          text: 'Outlet',
          color: '#000000',
          fontSize: 10
        }
      ],
      createdAt: new Date().toISOString()
    }
  ];

  const handleCreateTemplate = () => {
    if (!templateName.trim()) {
      setSnackbar({
        open: true,
        message: 'Template name is required',
        severity: 'error'
      });
      return;
    }

    const newTemplate = {
      id: `template-${Date.now()}`,
      name: templateName,
      description: templateDescription,
      category: templateCategory,
      color: '#ff0000',
      annotations: templateAnnotations,
      createdAt: new Date().toISOString()
    };

    const updatedTemplates = [...templates, newTemplate];
    saveTemplates(updatedTemplates);

    setTemplateName('');
    setTemplateDescription('');
    setTemplateAnnotations([]);
    setCreateDialogOpen(false);

    setSnackbar({
      open: true,
      message: 'Template created successfully',
      severity: 'success'
    });
  };

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description);
    setTemplateCategory(template.category);
    setTemplateAnnotations(template.annotations);
    setEditDialogOpen(true);
  };

  const handleUpdateTemplate = () => {
    if (!selectedTemplate) return;

    const updatedTemplate = {
      ...selectedTemplate,
      name: templateName,
      description: templateDescription,
      category: templateCategory,
      annotations: templateAnnotations
    };

    const updatedTemplates = templates.map(t =>
      t.id === selectedTemplate.id ? updatedTemplate : t
    );

    saveTemplates(updatedTemplates);

    setTemplateName('');
    setTemplateDescription('');
    setTemplateAnnotations([]);
    setSelectedTemplate(null);
    setEditDialogOpen(false);

    setSnackbar({
      open: true,
      message: 'Template updated successfully',
      severity: 'success'
    });
  };

  const handleDeleteTemplate = (template) => {
    setSelectedTemplate(template);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedTemplate) return;

    const updatedTemplates = templates.filter(t => t.id !== selectedTemplate.id);
    saveTemplates(updatedTemplates);

    setSelectedTemplate(null);
    setDeleteDialogOpen(false);

    setSnackbar({
      open: true,
      message: 'Template deleted successfully',
      severity: 'success'
    });
  };

  const handleApplyTemplate = (template) => {
    if (onApplyTemplate) {
      onApplyTemplate(template.annotations);
    }
    onClose();
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'measurement': return <MeasureIcon />;
      case 'inspection': return <CategoryIcon />;
      default: return <TemplateIcon />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'measurement': return 'primary';
      case 'inspection': return 'warning';
      case 'progress': return 'success';
      default: return 'default';
    }
  };

  const TemplateCard = ({ template }) => (
    <Card sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: 2
      }
    }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getCategoryIcon(template.category)}
            <Typography variant="h6" component="div">
              {template.name}
            </Typography>
          </Box>
          <Chip
            label={template.category}
            color={getCategoryColor(template.category)}
            size="small"
          />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {template.description}
        </Typography>

        <Typography variant="caption" color="text.secondary">
          {template.annotations.length} annotation{template.annotations.length !== 1 ? 's' : ''}
        </Typography>
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', p: 2, pt: 0 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => handleApplyTemplate(template)}
        >
          Apply
        </Button>
        <Box>
          <IconButton
            size="small"
            onClick={() => handleEditTemplate(template)}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDeleteTemplate(template)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </CardActions>
    </Card>
  );

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '80vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TemplateIcon />
              <Typography variant="h6">Annotation Templates</Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Template
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {templates.length === 0 ? (
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 8,
              px: 3
            }}>
              <TemplateIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No templates yet
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
                Create annotation templates to quickly apply common patterns to your photos
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Create Your First Template
              </Button>
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ p: 3 }}>
              {templates.map((template) => (
                <Grid item xs={12} sm={6} md={4} key={template.id}>
                  <TemplateCard template={template} />
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AddIcon />
            <Typography>Create New Template</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Template Name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Description"
              multiline
              rows={2}
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={templateCategory}
                label="Category"
                onChange={(e) => setTemplateCategory(e.target.value)}
              >
                <MenuItem value="measurement">Measurement</MenuItem>
                <MenuItem value="inspection">Inspection</MenuItem>
                <MenuItem value="progress">Progress</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            <Alert severity="info" sx={{ mb: 2 }}>
              Template annotations will be created when you use the annotation tools in the photo editor.
              Save your current annotations as a template to reuse them later.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateTemplate} variant="contained">
            Create Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon />
            <Typography>Edit Template</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Template Name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Description"
              multiline
              rows={2}
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={templateCategory}
                label="Category"
                onChange={(e) => setTemplateCategory(e.target.value)}
              >
                <MenuItem value="measurement">Measurement</MenuItem>
                <MenuItem value="inspection">Inspection</MenuItem>
                <MenuItem value="progress">Progress</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateTemplate} variant="contained">
            Update Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Template</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedTemplate?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default AnnotationTemplates;
