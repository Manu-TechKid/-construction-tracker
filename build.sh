#!/bin/bash
# Render build script for Construction Tracker

echo "Starting build process..."

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Build client
echo "Building client..."
cd client
npm install --legacy-peer-deps
npm run build
cd ..

# Install server dependencies
echo "Installing server dependencies..."
cd server
npm install
cd ..

echo "Build completed successfully!"
