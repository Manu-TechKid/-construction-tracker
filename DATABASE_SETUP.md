# Database Setup and Population

## Prerequisites
- Node.js installed
- MongoDB Atlas connection string in your `.env` file
- Dependencies installed (`npm install`)

## Setup Instructions

### 1. Configure Environment Variables
Create a `.env` file in the root directory if it doesn't exist, and add your MongoDB connection string:

```env
MONGO_URI=your_mongodb_connection_string_here
```

### 2. Run the Database Population Script

To populate your database with initial data, run:

```bash
node scripts/populateDatabase.js
```

This script will:
1. Connect to your MongoDB database
2. Clear any existing data in the worktypes, worksubtypes, and dropdownconfigs collections
3. Insert the initial dataset

### 3. Verify Data

You can verify the data was inserted correctly by:

1. Checking your MongoDB Atlas dashboard
2. Or using MongoDB Compass to browse the collections
3. Or checking the Setup page in your application

## Data Structure

The script populates three main collections:

### Work Types
- Maintenance
- Repair
- Cleaning
- Inspection
- Renovation

### Work Sub-Types
- Preventive Maintenance
- Corrective Maintenance
- Electrical Repair
- Plumbing Repair
- Deep Cleaning
- Window Cleaning

### Dropdown Configurations
- Priority (Low, Medium, High, Emergency)
- Status (New, In Progress, On Hold, Completed, Cancelled)

## Troubleshooting

If you encounter any issues:

1. Make sure your MongoDB connection string is correct
2. Ensure your IP is whitelisted in MongoDB Atlas
3. Check the console output for specific error messages
4. Verify that all required environment variables are set

## Resetting the Database

To start over, simply run the population script again. It will clear all existing data before importing the default dataset.
