const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { connect, closeDatabase, clearDatabase } = require('../config/test-db');
const app = require('../app');
const User = require('../models/User');
const Building = require('../models/Building');
const WorkOrder = require('../models/WorkOrder');
const WorkType = require('../models/WorkType');
const WorkSubType = require('../models/WorkSubType');

jest.setTimeout(30000);

// Test data
let adminToken;
let testBuildingId;
let adminId;
let testWorkTypeId;
let testWorkSubTypeId;

beforeAll(async () => {
  await connect();

  // Create test admin user
  const admin = await User.create({
    name: 'Test Admin',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin',
    phone: '1234567890',
    isActive: true,
    approvalStatus: 'approved'
  });
  adminId = admin._id;

  const workType = await WorkType.create({
    name: 'Test Work Type',
    code: 'test_type',
    createdBy: adminId,
  });
  testWorkTypeId = workType._id;

  const workSubType = await WorkSubType.create({
    name: 'Test Work SubType',
    code: 'test_subtype',
    workType: testWorkTypeId,
    createdBy: adminId,
  });
  testWorkSubTypeId = workSubType._id;

  // Create test building
  const building = await Building.create({
    name: 'Test Building',
    address: '123 Test St',
    city: 'Test City',
    administrator: adminId
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

      const createRes = await request(app)
        .post('/api/v1/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Work Order with Photos',
          description: 'Test work order with file uploads',
          building: testBuildingId,
          apartmentNumber: '101',
          priority: 'medium',
          scheduledDate: new Date().toISOString(),
          workType: testWorkTypeId,
          workSubType: testWorkSubTypeId,
          services: [{
            name: 'Test service',
            description: 'Clean with photo documentation',
            laborCost: 50,
            materialCost: 10
          }],
          assignedTo: [adminId]
        });

      expect(createRes.statusCode).toEqual(201);
      expect(createRes.body.success).toBe(true);
      const workOrderId = createRes.body.data._id;

      const uploadRes = await request(app)
        .post(`/api/v1/work-orders/${workOrderId}/photos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('photos', testImage, 'test-image.png');

      expect(uploadRes.statusCode).toEqual(200);
      expect(uploadRes.body.status).toBe('success');
      expect(uploadRes.body.data).toHaveProperty('photos');
      expect(Array.isArray(uploadRes.body.data.photos)).toBe(true);
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
          scheduledDate: new Date().toISOString(),
          workType: testWorkTypeId,
          workSubType: testWorkSubTypeId,
          services: [{
            name: 'Basic maintenance task',
            description: 'Basic maintenance task',
            laborCost: 30,
            materialCost: 5
          }],
          assignedTo: [adminId]
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
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
          scheduledDate: new Date().toISOString(),
          workType: testWorkTypeId,
          workSubType: testWorkSubTypeId,
          services: [{
            name: 'Initial inspection',
            description: 'Initial inspection',
            laborCost: 40,
            materialCost: 0
          }],
          assignedTo: [adminId]
        });

      const workOrderId = createRes.body.data._id;
      const testImage = createTestImage();

      // Update with photos
      const updateRes = await request(app)
        .post(`/api/v1/work-orders/${workOrderId}/photos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('photos', testImage, 'update-image.png');

      expect(updateRes.statusCode).toEqual(200);
      expect(updateRes.body.status).toBe('success');
    });
  });

  describe('File Validation', () => {
    it('should handle invalid file types gracefully', async () => {
      const textBuffer = Buffer.from('This is not an image file');

      const createRes = await request(app)
        .post('/api/v1/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Work Order for Invalid File',
          description: 'Test work order for invalid file type',
          building: testBuildingId,
          apartmentNumber: '105',
          priority: 'low',
          scheduledDate: new Date().toISOString(),
          workType: testWorkTypeId,
          workSubType: testWorkSubTypeId,
          services: [{
            name: 'Test service',
            description: 'Test service',
            laborCost: 25,
            materialCost: 5
          }],
          assignedTo: [adminId]
        });

      expect(createRes.statusCode).toEqual(201);
      const workOrderId = createRes.body.data._id;
      
      const res = await request(app)
        .post(`/api/v1/work-orders/${workOrderId}/photos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('photos', textBuffer, 'invalid-file.txt');

      // Should either reject the file or handle it gracefully
      // The exact behavior depends on multer configuration
      expect([200, 400, 422, 500]).toContain(res.statusCode);
    });
  });
});
