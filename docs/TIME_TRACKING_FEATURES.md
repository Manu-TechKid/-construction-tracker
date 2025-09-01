# Time Tracking and Location Features

## Overview
The Construction Tracker app includes comprehensive time tracking and location monitoring features that allow supervisors to track worker attendance, work hours, and location history. This document provides an overview of the features, implementation details, and usage guidelines.

## Features

### 1. Worker Check-In/Check-Out
- Workers can check in and out of work shifts with location verification
- Automatic timestamp and location recording
- Device information capture for audit purposes
- Support for scheduled and unscheduled work

### 2. Location Tracking
- Real-time location updates during work hours
- Historical location tracking with timestamps
- Geofencing support for work sites
- Location accuracy and battery optimization

### 3. Time Tracking
- Accurate work hour calculation
- Break tracking (optional)
- Overtime calculation
- Timesheet generation

### 4. Reporting and Analytics
- Work hours summary
- Location history visualization
- Attendance reports
- Export functionality

## Technical Implementation

### Backend API Endpoints

#### Worker Check-In
```
POST /api/workers/:id/check-in
```

**Request Body:**
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "accuracy": 15,
  "scheduleId": "schedule123",
  "notes": "Starting morning shift"
}
```

#### Worker Check-Out
```
POST /api/workers/:id/check-out
```

**Request Body:**
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "accuracy": 15,
  "notes": "Ending shift"
}
```

#### Record Location
```
POST /api/workers/:id/location
```

**Request Body:**
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "accuracy": 15,
  "activity": "working",
  "batteryLevel": 0.85
}
```

#### Get Location History
```
GET /api/workers/:id/location-history?startDate=2023-01-01&endDate=2023-01-31&limit=1000
```

#### Get Worker Status
```
GET /api/workers/:id/status
```

### Frontend Components

#### TimeTrackingPage
Main container component that manages the time tracking interface with tabs for different views.

#### WorkerTimeTracker
Handles the check-in/check-out functionality and displays current session information.

#### LocationHistoryMap
Interactive map that visualizes the worker's location history with filtering capabilities.

### Data Models

#### Worker Model Extensions
```javascript
{
  // ... existing fields ...
  timeTracking: {
    currentSession: {
      startTime: Date,
      endTime: Date,
      startLocation: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: [Number], // [longitude, latitude]
        address: String,
        accuracy: Number,
        timestamp: Date
      },
      endLocation: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: [Number],
        address: String,
        accuracy: Number,
        timestamp: Date
      },
      deviceInfo: {
        userAgent: String,
        platform: String,
        os: String,
        browser: String,
        ipAddress: String
      },
      notes: String,
      status: { type: String, enum: ['checked-in', 'checked-out'], default: 'checked-in' },
      lastActive: Date
    },
    locationHistory: [{
      timestamp: { type: Date, default: Date.now },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: [Number] // [longitude, latitude]
      },
      accuracy: Number,
      altitude: Number,
      altitudeAccuracy: Number,
      heading: Number,
      speed: Number,
      activity: {
        type: String,
        enum: ['check-in', 'check-out', 'tracking', 'manual', 'other'],
        default: 'tracking'
      },
      address: String,
      deviceInfo: {
        userAgent: String,
        platform: String,
        os: String,
        browser: String,
        ipAddress: String,
        batteryLevel: Number
      },
      metadata: {}
    }],
    preferences: {
      trackingInterval: { type: Number, default: 300 }, // seconds
      geofence: {
        center: {
          type: { type: String, enum: ['Point'], default: 'Point' },
          coordinates: [Number] // [longitude, latitude]
        },
        radius: Number, // meters
        alerts: Boolean
      },
      offlineMode: { type: Boolean, default: false },
      lowBatteryThreshold: { type: Number, default: 0.2 } // 20%
    },
    stats: {
      totalHoursWorked: { type: Number, default: 0 },
      jobsCompleted: { type: Number, default: 0 },
      lastActive: Date,
      currentStatus: {
        type: String,
        enum: ['online', 'offline', 'on-break', 'inactive'],
        default: 'offline'
      }
    }
  }
}
```

## Setup and Configuration

### Environment Variables
```
# Leaflet Tile Layer URL (for map visualization)
REACT_APP_LEAFLET_TILE_LAYER=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png

# API Base URL
REACT_APP_API_URL=/api

# Location Tracking Settings
REACT_APP_LOCATION_TRACKING_INTERVAL=300000 // 5 minutes
REACT_APP_LOCATION_ACCURACY_THRESHOLD=100 // meters
REACT_APP_GEOFENCE_RADIUS=200 // meters
```

### Dependencies
- React 17+
- Redux Toolkit
- Leaflet
- date-fns
- Material-UI
- Notistack (for notifications)

## Usage Guide

### For Workers
1. Open the app and navigate to the Time Tracking section
2. Tap "Check In" to start your shift
3. Allow location access when prompted
4. Work as usual - your location will be tracked automatically
5. Tap "Check Out" when your shift ends

### For Supervisors
1. Navigate to the Worker Management section
2. Select a worker to view their time tracking and location history
3. Use the date range picker to filter historical data
4. Export reports as needed

## Best Practices

### For Workers
- Ensure location services are enabled on your device
- Keep the app running in the background during work hours
- Connect to WiFi when possible to save mobile data
- Charge your device regularly to ensure continuous tracking

### For Supervisors
- Set up geofences for work sites
- Review location history regularly for accuracy
- Address any privacy concerns with your team
- Train workers on proper check-in/check-out procedures

## Troubleshooting

### Common Issues
1. **Location not updating**
   - Check if location services are enabled
   - Ensure the app has location permissions
   - Restart the app if needed

2. **Battery drain**
   - Reduce location update frequency in settings
   - Enable battery optimization
   - Keep the device charged

3. **Inaccurate location**
   - Move to an open area with better GPS signal
   - Enable high accuracy mode in device settings
   - Check for interference from buildings or other structures

## Security and Privacy

### Data Collection
- Location data is only collected during work hours
- Workers can view their own location history
- Supervisors can only access data for their team members

### Data Retention
- Location data is retained for 90 days by default
- Aggregated reports are kept for 3 years
- Workers can request data deletion upon termination

### Compliance
- GDPR compliant data handling
- CCPA compliant for California residents
- Regular security audits and updates
