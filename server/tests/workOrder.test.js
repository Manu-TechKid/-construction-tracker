const request = require('supertest');
const mongoose = require('mongoose');
const { connect, closeDatabase, clearDatabase } = require('../config/test-db');
const app = require('../app');
const WorkOrder = require('../models/WorkOrder');
const User = require('../models/User');
const Building = require('../models/Building');
const WorkType = require('../models/WorkType');
const WorkSubType = require('../models/WorkSubType');

jest.setTimeout(30000);

const idOf = (value) => {
  if (!value) return value;
  if (typeof value === 'object' && value._id) return value._id;
  return value;
};

// Test data
let testToken;
let testWorkOrderId;
let testBuildingId;
let testWorkerId;
let testAdminId;
let testWorkTypeId;
let testWorkSubTypeId;

// Create test data before running tests
beforeAll(async () => {
  // Connect to in-memory database
  await connect();
});

// Clean up test data after tests
afterAll(async () => {
  await clearDatabase();
  await closeDatabase();
});

beforeEach(async () => {
  await clearDatabase();

  const admin = await User.create({
    name: 'Test Admin',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin',
    phone: '1234567890',
    isActive: true,
    approvalStatus: 'approved'
  });
  testAdminId = admin._id;

  const worker = await User.create({
    name: 'Test Worker',
    email: 'worker@test.com',
    password: 'password123',
    role: 'worker',
    phone: '0987654321',
    isActive: true,
    approvalStatus: 'approved'
  });
  testWorkerId = worker._id;

  const workType = await WorkType.create({
    name: 'Test Work Type',
    code: 'test_type',
    createdBy: testAdminId,
  });
  testWorkTypeId = workType._id;

  const workSubType = await WorkSubType.create({
    name: 'Test Work SubType',
    code: 'test_subtype',
    workType: testWorkTypeId,
    createdBy: testAdminId,
  });
  testWorkSubTypeId = workSubType._id;

  const building = await Building.create({
    name: 'Test Building',
    address: '123 Test St',
    city: 'Test City',
    administrator: testAdminId,
  });
  testBuildingId = building._id;

  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'admin@test.com',
      password: 'password123'
    });
  testToken = res.body.token;

  const workOrder = await WorkOrder.create({
    title: 'Test Work Order',
    description: 'Test work order description',
    building: testBuildingId,
    apartmentNumber: '101',
    priority: 'medium',
    status: 'pending',
    scheduledDate: new Date(),
    workType: testWorkTypeId,
    workSubType: testWorkSubTypeId,
    createdBy: testAdminId,
    services: [{
      name: 'Test service',
      description: 'Test service description',
      laborCost: 50,
      materialCost: 10
    }],
    assignedTo: [{ worker: testWorkerId }]
  });

  testWorkOrderId = String(workOrder._id);
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
        scheduledDate: new Date().toISOString(),
        workType: testWorkTypeId,
        workSubType: testWorkSubTypeId,
        services: [
          {
            name: 'Fix sink',
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
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(String(idOf(res.body.data.building))).toBe(String(testBuildingId));
      expect(res.body.data.apartmentNumber).toBe('102');
      expect(res.body.data.priority).toBe('high');
      expect(res.body.data.scheduledDate).toBeDefined();
      expect(String(idOf(res.body.data.workType))).toBe(String(testWorkTypeId));
      expect(String(idOf(res.body.data.workSubType))).toBe(String(testWorkSubTypeId));
      expect(res.body.data.services).toBeDefined();
      expect(res.body.data.services[0].name).toBe('Fix sink');
    });
  });

  describe('Get Work Order', () => {
    it('should get a work order by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/work-orders/${testWorkOrderId}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(String(res.body.data._id)).toBe(String(testWorkOrderId));
      expect(res.body.data.title).toBe('Test Work Order');
      expect(res.body.data.description).toBe('Test work order description');
      expect(String(idOf(res.body.data.building))).toBe(String(testBuildingId));
      expect(res.body.data.apartmentNumber).toBe('101');
      expect(res.body.data.priority).toBe('medium');
      expect(res.body.data.scheduledDate).toBeDefined();
      expect(String(idOf(res.body.data.workType))).toBe(String(testWorkTypeId));
      expect(String(idOf(res.body.data.workSubType))).toBe(String(testWorkSubTypeId));
      expect(res.body.data.services).toBeDefined();
      expect(res.body.data.services[0].name).toBe('Test service');
    });
  });

  describe('Update Work Order', () => {
    it('should update a work order', async () => {
      const updateData = {
        description: 'Updated work order description',
        priority: 'high',
        scheduledDate: new Date().toISOString(),
        workType: testWorkTypeId,
        workSubType: testWorkSubTypeId,
        services: [
          {
            name: 'Update service',
            description: 'Update service description',
            laborCost: 75,
            materialCost: 25
          }
        ]
      };

      const res = await request(app)
        .patch(`/api/v1/work-orders/${testWorkOrderId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateData);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.description).toBe(updateData.description);
      expect(res.body.data.priority).toBe(updateData.priority);
      expect(res.body.data.scheduledDate).toBeDefined();
      expect(String(idOf(res.body.data.workType))).toBe(String(testWorkTypeId));
      expect(String(idOf(res.body.data.workSubType))).toBe(String(testWorkSubTypeId));
      expect(res.body.data.services).toBeDefined();
      expect(res.body.data.services[0].name).toBe('Update service');
    });
  });

  describe('List Work Orders', () => {
    it('should get all work orders', async () => {
      const res = await request(app)
        .get('/api/v1/work-orders')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.workOrders)).toBeTruthy();
      expect(res.body.data.workOrders.length).toBeGreaterThan(0);
      expect(res.body.data.workOrders[0].title).toBe('Test Work Order');
      expect(res.body.data.workOrders[0].description).toBe('Test work order description');
      expect(String(idOf(res.body.data.workOrders[0].building))).toBe(String(testBuildingId));
      expect(res.body.data.workOrders[0].apartmentNumber).toBe('101');
      expect(res.body.data.workOrders[0].priority).toBe('medium');
      expect(res.body.data.workOrders[0].scheduledDate).toBeDefined();
      expect(String(idOf(res.body.data.workOrders[0].workType))).toBe(String(testWorkTypeId));
      expect(String(idOf(res.body.data.workOrders[0].workSubType))).toBe(String(testWorkSubTypeId));
      expect(res.body.data.workOrders[0].services).toBeDefined();
      expect(res.body.data.workOrders[0].services[0].name).toBe('Test service');
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
      expect(workOrder.deleted).toBe(true);
    });
  });
});
