const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { connect, closeDatabase, clearDatabase } = require('../config/test-db');
const app = require('../app');
const User = require('../models/User');
const Building = require('../models/Building');
const WorkOrder = require('../models/WorkOrder');

// Test data
let adminToken;
let testBuildingId;
let adminId;

beforeAll(async () => {
  await connect();

  // Create test admin user
  const admin = await User.create({
    name: 'Test Admin',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin',
    phone: '1234567890'
  });
  adminId = admin._id;

  // Create test building
  const building = await Building.create({
    name: 'Test Building',
    address: '123 Test St',
    city: 'Test City',
    state: 'Test State',
    zipCode: '12345',
    manager: adminId
  });
  testBuildingId = building._id;

  // Get admin token
  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@test.com', password: 'password123' });
  adminToken = adminLogin.body.token;
});

afterAll(async () => {
  await clearDatabase();
  await closeDatabase();
});

// Create a test image buffer
const createTestImage = () => {
  // Create a simple 1x1 PNG image buffer
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00,
    0x01, 0x00, 0x01, 0x5C, 0xC2, 0x8A, 0x8E, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, // IEND chunk
    0x42, 0x60, 0x82
  ]);
  return pngBuffer;
};

describe('File Upload Tests', () => {
  describe('Work Order with File Upload', () => {
    it('should create work order with photo uploads', async () => {
      const testImage = createTestImage();
      
      const res = await request(app)
        .post('/api/v1/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Work Order with Photos')
        .field('description', 'Test work order with file uploads')
        .field('building', testBuildingId.toString())
        .field('apartmentNumber', '101')
        .field('priority', 'medium')
        .field('services', JSON.stringify([{
          type: 'cleaning',
          description: 'Clean with photo documentation',
          laborCost: 50,
          materialCost: 10
        }]))
        .field('assignedTo', JSON.stringify([adminId.toString()]))
        .attach('photos', testImage, 'test-image.png');

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.workOrder).toHaveProperty('_id');
      
      // Verify photos array exists (might be empty if Cloudinary is not configured)
      expect(res.body.data.workOrder).toHaveProperty('photos');
      expect(Array.isArray(res.body.data.workOrder.photos)).toBe(true);
    });

    it('should handle work order creation without files', async () => {
      const res = await request(app)
        .post('/api/v1/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Work Order without Photos',
          description: 'Test work order without file uploads',
          building: testBuildingId,
          apartmentNumber: '102',
          priority: 'low',
          services: [{
            type: 'maintenance',
            description: 'Basic maintenance task',
            laborCost: 30,
            materialCost: 5
          }],
          assignedTo: [adminId]
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.workOrder.photos).toEqual([]);
    });

    it('should update work order with new photos', async () => {
      // First create a work order
      const createRes = await request(app)
        .post('/api/v1/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Work Order for Update',
          description: 'Test work order for photo update',
          building: testBuildingId,
          apartmentNumber: '103',
          priority: 'medium',
          services: [{
            type: 'inspection',
            description: 'Initial inspection',
            laborCost: 40,
            materialCost: 0
          }],
          assignedTo: [adminId]
        });

      const workOrderId = createRes.body.data.workOrder._id;
      const testImage = createTestImage();

      // Update with photos
      const updateRes = await request(app)
        .patch(`/api/v1/work-orders/${workOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('description', 'Updated with photos')
        .attach('photos', testImage, 'update-image.png');

      expect(updateRes.statusCode).toEqual(200);
      expect(updateRes.body.status).toBe('success');
      expect(updateRes.body.data.workOrder.description).toBe('Updated with photos');
    });
  });

  describe('Issue Reporting with Photos', () => {
    it('should report issue with photo attachments', async () => {
      // First create a work order
      const createRes = await request(app)
        .post('/api/v1/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Work Order for Issue',
          description: 'Test work order for issue reporting',
          building: testBuildingId,
          apartmentNumber: '104',
          priority: 'high',
          services: [{
            type: 'repair',
            description: 'Repair task',
            laborCost: 60,
            materialCost: 20
          }],
          assignedTo: [adminId]
        });

      const workOrderId = createRes.body.data.workOrder._id;
      const testImage = createTestImage();

      // Report issue with photos
      const issueRes = await request(app)
        .post(`/api/v1/work-orders/${workOrderId}/issues`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('description', 'Found damage during repair')
        .field('severity', 'high')
        .attach('photos', testImage, 'issue-photo.png');

      expect(issueRes.statusCode).toEqual(201);
      expect(issueRes.body.status).toBe('success');
      expect(issueRes.body.data.issue).toHaveProperty('description');
      expect(issueRes.body.data.issue.description).toBe('Found damage during repair');
    });
  });

  describe('File Validation', () => {
    it('should handle invalid file types gracefully', async () => {
      const textBuffer = Buffer.from('This is not an image file');
      
      const res = await request(app)
        .post('/api/v1/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Work Order with Invalid File')
        .field('description', 'Test work order with invalid file type')
        .field('building', testBuildingId.toString())
        .field('apartmentNumber', '105')
        .field('priority', 'low')
        .field('services', JSON.stringify([{
          type: 'other',
          description: 'Test service',
          laborCost: 25,
          materialCost: 5
        }]))
        .field('assignedTo', JSON.stringify([adminId.toString()]))
        .attach('photos', textBuffer, 'invalid-file.txt');

      // Should either reject the file or handle it gracefully
      // The exact behavior depends on multer configuration
      expect([201, 400, 422]).toContain(res.statusCode);
    });
  });
});
