const request = require('supertest');
const mongoose = require('mongoose');
const { connect, closeDatabase, clearDatabase } = require('../config/test-db');
const app = require('../app');
const WorkOrder = require('../models/WorkOrder');
const User = require('../models/User');
const Building = require('../models/Building');

// Test data
let testToken;
let testWorkOrderId;
let testBuildingId;
let testWorkerId;
let testAdminId;

// Create test data before running tests
beforeAll(async () => {
  // Connect to in-memory database
  await connect();

  // Create a test admin user
  const admin = await User.create({
    name: 'Test Admin',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin',
    phone: '1234567890'
  });

  testAdminId = admin._id;

  // Create a test worker
  const worker = await User.create({
    name: 'Test Worker',
    email: 'worker@test.com',
    password: 'password123',
    role: 'worker',
    phone: '0987654321'
  });
  testWorkerId = worker._id;

  // Create a test building
  const building = await Building.create({
    name: 'Test Building',
    address: '123 Test St',
    city: 'Test City',
    state: 'Test State',
    zipCode: '12345',
    manager: user._id
  });
  testBuildingId = building._id;

  // Login to get token
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'admin@test.com',
      password: 'password123'
    });
  
  testToken = res.body.token;
  
  // Create a test work order
  const workOrder = await WorkOrder.create({
    title: 'Test Work Order',
    description: 'Test work order description',
    building: testBuildingId,
    apartmentNumber: '101',
    priority: 'medium',
    status: 'pending',
    createdBy: testAdminId,
    services: [{
      type: 'cleaning',
      description: 'Test cleaning service',
      laborCost: 50,
      materialCost: 10
    }],
    assignedTo: [{
      worker: testWorkerId,
      assignedBy: testAdminId,
      assignedAt: new Date()
    }]
  });
  
  testWorkOrderId = workOrder._id;
});

// Clean up test data after tests
afterAll(async () => {
  await clearDatabase();
  await closeDatabase();
});

// Clean up after each test
afterEach(async () => {
  await clearDatabase();
});

describe('Work Order API', () => {
  describe('Create Work Order', () => {
    it('should create a new work order', async () => {
      const workOrderData = {
        title: 'New Test Work Order',
        description: 'New test work order description',
        building: testBuildingId,
        apartmentNumber: '102',
        priority: 'high',
        services: [
          {
            type: 'maintenance',
            description: 'Fix the sink',
            laborCost: 75,
            materialCost: 25
          }
        ],
        assignedTo: [testWorkerId]
      };

      const res = await request(app)
        .post('/api/v1/work-orders')
        .set('Authorization', `Bearer ${testToken}`)
        .send(workOrderData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.workOrder).toHaveProperty('_id');
      expect(res.body.data.workOrder.building).toBe(testBuildingId.toString());
      expect(res.body.data.workOrder.apartmentNumber).toBe('102');
      expect(res.body.data.workOrder.priority).toBe('high');
    });
  });

  describe('Get Work Order', () => {
    it('should get a work order by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/work-orders/${testWorkOrderId}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.workOrder._id).toBe(testWorkOrderId);
    });
  });

  describe('Update Work Order', () => {
    it('should update a work order', async () => {
      const updateData = {
        description: 'Updated work order description',
        priority: 'high',
        services: [
          {
            type: 'cleaning',
            description: 'Deep clean the apartment',
            laborCost: 75,
            materialCost: 15
          }
        ]
      };

      const res = await request(app)
        .patch(`/api/v1/work-orders/${testWorkOrderId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateData);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.workOrder.description).toBe(updateData.description);
      expect(res.body.data.workOrder.priority).toBe(updateData.priority);
    });
  });

  describe('List Work Orders', () => {
    it('should get all work orders', async () => {
      const res = await request(app)
        .get('/api/v1/work-orders')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.workOrders)).toBeTruthy();
      expect(res.body.data.workOrders.length).toBeGreaterThan(0);
    });
  });

  describe('Delete Work Order', () => {
    it('should soft delete a work order', async () => {
      const res = await request(app)
        .delete(`/api/v1/work-orders/${testWorkOrderId}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toEqual(204);

      // Verify soft delete
      const workOrder = await WorkOrder.findById(testWorkOrderId);
      expect(workOrder.isDeleted).toBe(true);
    });
  });
});
