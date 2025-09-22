import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  TextField,
  Button,
  Toolbar,
  Divider,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack
} from '@mui/material';
import {
  PhotoCamera,
  Edit as DrawIcon,
  Timeline as LineIcon,
  CropFree as RectangleIcon,
  RadioButtonUnchecked as CircleIcon,
  FormatShapes as ShapeIcon,
  TextFields as TextIcon,
  Straighten as MeasureIcon,
  ColorLens as ColorIcon,
  Undo,
  Redo,
  Save,
  Clear,
  ZoomIn,
  ZoomOut,
  CenterFocusStrong as CenterIcon
} from '@mui/icons-material';

const PhotoAnnotator = ({ 
  buildingId, 
  onSave, 
  initialPhoto = null,
  mode = 'estimate' // 'estimate', 'inspection', 'progress'
}) => {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [photo, setPhoto] = useState(initialPhoto);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState('pen');
  const [annotations, setAnnotations] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [drawingColor, setDrawingColor] = useState('#ff0000');
  const [lineWidth, setLineWidth] = useState(3);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMeasureDialog, setShowMeasureDialog] = useState(false);
  const [measurementValue, setMeasurementValue] = useState('');
  const [measurementUnit, setMeasurementUnit] = useState('ft');
  const [currentPath, setCurrentPath] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [notes, setNotes] = useState('');

  const tools = [
    { id: 'pen', icon: <DrawIcon />, label: 'Draw' },
    { id: 'line', icon: <LineIcon />, label: 'Line' },
    { id: 'rectangle', icon: <RectangleIcon />, label: 'Rectangle' },
    { id: 'circle', icon: <CircleIcon />, label: 'Circle' },
    { id: 'text', icon: <TextIcon />, label: 'Text' },
    { id: 'measure', icon: <MeasureIcon />, label: 'Measure' }
  ];

  const colors = [
    '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
    '#ff00ff', '#00ffff', '#ffffff', '#000000',
    '#ffa500', '#800080', '#008000', '#ffc0cb'
  ];

  const units = ['ft', 'in', 'm', 'cm', 'mm'];

  useEffect(() => {
    if (photo && canvasRef.current) {
      drawCanvas();
    }
  }, [photo, annotations, zoom, panOffset]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (photo) {
      const img = new Image();
      img.onload = () => {
        // Save context
        ctx.save();
        
        // Apply zoom and pan
        ctx.scale(zoom, zoom);
        ctx.translate(panOffset.x, panOffset.y);
        
        // Draw image
        ctx.drawImage(img, 0, 0, canvas.width / zoom, canvas.height / zoom);
        
        // Draw annotations
        annotations.forEach(annotation => {
          drawAnnotation(ctx, annotation);
        });
        
        // Restore context
        ctx.restore();
      };
      img.src = photo;
    }
  };

  const drawAnnotation = (ctx, annotation) => {
    ctx.strokeStyle = annotation.color;
    ctx.fillStyle = annotation.color;
    ctx.lineWidth = annotation.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (annotation.type) {
      case 'pen':
        ctx.beginPath();
        annotation.points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
        break;

      case 'line':
        ctx.beginPath();
        ctx.moveTo(annotation.startX, annotation.startY);
        ctx.lineTo(annotation.endX, annotation.endY);
        ctx.stroke();
        
        // Draw measurement if exists
        if (annotation.measurement) {
          const midX = (annotation.startX + annotation.endX) / 2;
          const midY = (annotation.startY + annotation.endY) / 2;
          
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(midX - 30, midY - 10, 60, 20);
          ctx.fillStyle = annotation.color;
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(annotation.measurement, midX, midY + 5);
        }
        break;

      case 'rectangle':
        ctx.strokeRect(
          annotation.x, 
          annotation.y, 
          annotation.width, 
          annotation.height
        );
        break;

      case 'circle':
        ctx.beginPath();
        ctx.arc(
          annotation.x, 
          annotation.y, 
          annotation.radius, 
          0, 
          2 * Math.PI
        );
        ctx.stroke();
        break;

      case 'text':
        ctx.font = `${annotation.fontSize || 16}px Arial`;
        ctx.fillStyle = annotation.color;
        ctx.fillText(annotation.text, annotation.x, annotation.y);
        break;

      case 'measure':
        // Draw measurement line
        ctx.beginPath();
        ctx.moveTo(annotation.startX, annotation.startY);
        ctx.lineTo(annotation.endX, annotation.endY);
        ctx.stroke();
        
        // Draw measurement arrows
        drawArrow(ctx, annotation.startX, annotation.startY, annotation.endX, annotation.endY);
        drawArrow(ctx, annotation.endX, annotation.endY, annotation.startX, annotation.startY);
        
        // Draw measurement text
        const midX = (annotation.startX + annotation.endX) / 2;
        const midY = (annotation.startY + annotation.endY) / 2;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(midX - 40, midY - 15, 80, 30);
        ctx.strokeRect(midX - 40, midY - 15, 80, 30);
        
        ctx.fillStyle = annotation.color;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${annotation.value} ${annotation.unit}`, midX, midY + 5);
        break;
    }
  };

  const drawArrow = (ctx, fromX, fromY, toX, toY) => {
    const headlen = 10;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headlen * Math.cos(angle - Math.PI / 6),
      toY - headlen * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headlen * Math.cos(angle + Math.PI / 6),
      toY - headlen * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  const handleCanvasMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panOffset.x * zoom) / zoom;
    const y = (e.clientY - rect.top - panOffset.y * zoom) / zoom;

    setIsDrawing(true);
    
    if (currentTool === 'pen') {
      setCurrentPath([{ x, y }]);
    } else if (currentTool === 'line' || currentTool === 'measure') {
      setCurrentPath([{ x, y }]);
    } else if (currentTool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        const newAnnotation = {
          type: 'text',
          x,
          y,
          text,
          color: drawingColor,
          fontSize: 16,
          id: Date.now()
        };
        
        saveToUndoStack();
        setAnnotations(prev => [...prev, newAnnotation]);
      }
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panOffset.x * zoom) / zoom;
    const y = (e.clientY - rect.top - panOffset.y * zoom) / zoom;

    if (currentTool === 'pen') {
      setCurrentPath(prev => [...prev, { x, y }]);
    }
  };

  const handleCanvasMouseUp = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panOffset.x * zoom) / zoom;
    const y = (e.clientY - rect.top - panOffset.y * zoom) / zoom;

    setIsDrawing(false);
    saveToUndoStack();

    if (currentTool === 'pen' && currentPath.length > 0) {
      const newAnnotation = {
        type: 'pen',
        points: currentPath,
        color: drawingColor,
        lineWidth,
        id: Date.now()
      };
      setAnnotations(prev => [...prev, newAnnotation]);
    } else if (currentTool === 'line' && currentPath.length > 0) {
      const newAnnotation = {
        type: 'line',
        startX: currentPath[0].x,
        startY: currentPath[0].y,
        endX: x,
        endY: y,
        color: drawingColor,
        lineWidth,
        id: Date.now()
      };
      setAnnotations(prev => [...prev, newAnnotation]);
    } else if (currentTool === 'measure' && currentPath.length > 0) {
      setShowMeasureDialog(true);
      // Store temporary measurement data
      window.tempMeasurement = {
        startX: currentPath[0].x,
        startY: currentPath[0].y,
        endX: x,
        endY: y
      };
    }

    setCurrentPath([]);
  };

  const handleMeasurementSave = () => {
    if (window.tempMeasurement && measurementValue) {
      const newAnnotation = {
        type: 'measure',
        ...window.tempMeasurement,
        value: measurementValue,
        unit: measurementUnit,
        color: drawingColor,
        lineWidth,
        id: Date.now()
      };
      setAnnotations(prev => [...prev, newAnnotation]);
      setMeasurementValue('');
      setShowMeasureDialog(false);
      window.tempMeasurement = null;
    }
  };

  const saveToUndoStack = () => {
    setUndoStack(prev => [...prev, annotations]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      setRedoStack(prev => [annotations, ...prev]);
      setAnnotations(previousState);
      setUndoStack(prev => prev.slice(0, -1));
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const nextState = redoStack[0];
      setUndoStack(prev => [...prev, annotations]);
      setAnnotations(nextState);
      setRedoStack(prev => prev.slice(1));
    }
  };

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhoto(event.target.result);
        setAnnotations([]);
        setUndoStack([]);
        setRedoStack([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!photo || !buildingId) return;

    const canvas = canvasRef.current;
    const annotatedImage = canvas.toDataURL('image/jpeg', 0.9);
    
    const photoData = {
      buildingId,
      originalPhoto: photo,
      annotatedPhoto: annotatedImage,
      annotations,
      notes,
      mode,
      timestamp: new Date().toISOString(),
      zoom,
      panOffset
    };

    if (onSave) {
      await onSave(photoData);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleCenter = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Paper elevation={2} sx={{ p: 1 }}>
        <Toolbar variant="dense" sx={{ gap: 1, flexWrap: 'wrap' }}>
          {/* Photo Controls */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handlePhotoCapture}
          />
          
          <Tooltip title="Take Photo">
            <IconButton 
              onClick={() => fileInputRef.current?.click()}
              color="primary"
            >
              <PhotoCamera />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem />

          {/* Drawing Tools */}
          {tools.map(tool => (
            <Tooltip key={tool.id} title={tool.label}>
              <IconButton
                onClick={() => setCurrentTool(tool.id)}
                color={currentTool === tool.id ? 'primary' : 'default'}
                variant={currentTool === tool.id ? 'contained' : 'outlined'}
              >
                {tool.icon}
              </IconButton>
            </Tooltip>
          ))}

          <Divider orientation="vertical" flexItem />

          {/* Color Picker */}
          <Tooltip title="Color">
            <IconButton onClick={() => setShowColorPicker(!showColorPicker)}>
              <ColorIcon sx={{ color: drawingColor }} />
            </IconButton>
          </Tooltip>

          {showColorPicker && (
            <Stack direction="row" spacing={0.5} sx={{ ml: 1 }}>
              {colors.map(color => (
                <Box
                  key={color}
                  sx={{
                    width: 24,
                    height: 24,
                    backgroundColor: color,
                    border: drawingColor === color ? '2px solid #000' : '1px solid #ccc',
                    cursor: 'pointer',
                    borderRadius: '50%'
                  }}
                  onClick={() => {
                    setDrawingColor(color);
                    setShowColorPicker(false);
                  }}
                />
              ))}
            </Stack>
          )}

          <Divider orientation="vertical" flexItem />

          {/* Line Width */}
          <Box sx={{ width: 100 }}>
            <Typography variant="caption">Width: {lineWidth}px</Typography>
            <Slider
              value={lineWidth}
              onChange={(e, value) => setLineWidth(value)}
              min={1}
              max={10}
              size="small"
            />
          </Box>

          <Divider orientation="vertical" flexItem />

          {/* Undo/Redo */}
          <Tooltip title="Undo">
            <IconButton onClick={handleUndo} disabled={undoStack.length === 0}>
              <Undo />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Redo">
            <IconButton onClick={handleRedo} disabled={redoStack.length === 0}>
              <Redo />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem />

          {/* Zoom Controls */}
          <Tooltip title="Zoom In">
            <IconButton onClick={handleZoomIn}>
              <ZoomIn />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Zoom Out">
            <IconButton onClick={handleZoomOut}>
              <ZoomOut />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Center">
            <IconButton onClick={handleCenter}>
              <CenterIcon />
            </IconButton>
          </Tooltip>

          <Typography variant="caption" sx={{ ml: 1 }}>
            {Math.round(zoom * 100)}%
          </Typography>

          <Divider orientation="vertical" flexItem />

          {/* Actions */}
          <Tooltip title="Clear All">
            <IconButton 
              onClick={() => {
                saveToUndoStack();
                setAnnotations([]);
              }}
              color="error"
            >
              <Clear />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={!photo}
            sx={{ ml: 'auto' }}
          >
            Save
          </Button>
        </Toolbar>
      </Paper>

      {/* Canvas Area */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {photo ? (
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            style={{
              border: '1px solid #ccc',
              cursor: currentTool === 'pen' ? 'crosshair' : 'default',
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
          />
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary'
            }}
          >
            <Typography variant="h6">
              Click the camera icon to take a photo and start annotating
            </Typography>
          </Box>
        )}
      </Box>

      {/* Notes Section */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <TextField
          fullWidth
          multiline
          rows={2}
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this photo..."
        />
      </Paper>

      {/* Measurement Dialog */}
      <Dialog open={showMeasureDialog} onClose={() => setShowMeasureDialog(false)}>
        <DialogTitle>Add Measurement</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField
              label="Measurement"
              value={measurementValue}
              onChange={(e) => setMeasurementValue(e.target.value)}
              type="number"
              fullWidth
            />
            <FormControl sx={{ minWidth: 80 }}>
              <InputLabel>Unit</InputLabel>
              <Select
                value={measurementUnit}
                onChange={(e) => setMeasurementUnit(e.target.value)}
                label="Unit"
              >
                {units.map(unit => (
                  <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMeasureDialog(false)}>Cancel</Button>
          <Button onClick={handleMeasurementSave} variant="contained">
            Add Measurement
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PhotoAnnotator;
