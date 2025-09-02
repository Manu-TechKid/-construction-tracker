const request = require('supertest');
const mongoose = require('mongoose');
const { connect, closeDatabase, clearDatabase } = require('../config/test-db');
const app = require('../app');
const User = require('../models/User');
const Building = require('../models/Building');
const WorkOrder = require('../models/WorkOrder');

// Test data
let adminToken, workerToken, managerToken;
let testBuildingId, testWorkOrderId;
let adminId, workerId, managerId;

beforeAll(async () => {
  await connect();

  // Create test users with different roles
  const admin = await User.create({
    name: 'Test Admin',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin',
    phone: '1234567890'
  });
  adminId = admin._id;

  const worker = await User.create({
    name: 'Test Worker',
    email: 'worker@test.com',
    password: 'password123',
    role: 'worker',
    phone: '0987654321'
  });
  workerId = worker._id;

  const manager = await User.create({
    name: 'Test Manager',
    email: 'manager@test.com',
    password: 'password123',
    role: 'manager',
    phone: '5555555555'
  });
  managerId = manager._id;

  // Create test building
  const building = await Building.create({
    name: 'Test Building',
    address: '123 Test St',
    city: 'Test City',
    state: 'Test State',
    zipCode: '12345',
    manager: managerId
  });
  testBuildingId = building._id;

  // Get tokens for each user
  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@test.com', password: 'password123' });
  adminToken = adminLogin.body.token;

  const workerLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'worker@test.com', password: 'password123' });
  workerToken = workerLogin.body.token;

  const managerLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'manager@test.com', password: 'password123' });
  managerToken = managerLogin.body.token;

  // Create a test work order
  const workOrder = await WorkOrder.create({
    title: 'Test Work Order',
    description: 'Test work order for role testing',
    building: testBuildingId,
    apartmentNumber: '101',
    priority: 'medium',
    status: 'pending',
    createdBy: adminId,
    services: [{
      type: 'cleaning',
      description: 'Test cleaning service',
      laborCost: 50,
      materialCost: 10
    }],
    assignedTo: [{
      worker: workerId,
      assignedBy: adminId,
      assignedAt: new Date()
    }]
  });
  testWorkOrderId = workOrder._id;
});

afterAll(async () => {
  await clearDatabase();
  await closeDatabase();
});

describe('Role-Based Access Control', () => {
  describe('Work Order Creation', () => {
    it('should allow admin to create work orders', async () => {
      const workOrderData = {
        title: 'Admin Created Work Order',
        description: 'Work order created by admin',
        building: testBuildingId,
        apartmentNumber: '102',
        priority: 'high',
        services: [{
          type: 'maintenance',
          description: 'Fix the sink',
          laborCost: 75,
          materialCost: 25
        }],
        assignedTo: [workerId]
      };

      const res = await request(app)
        .post('/api/v1/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(workOrderData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
    });

    it('should allow manager to create work orders', async () => {
      const workOrderData = {
        title: 'Manager Created Work Order',
        description: 'Work order created by manager',
        building: testBuildingId,
        apartmentNumber: '103',
        priority: 'medium',
        services: [{
          type: 'cleaning',
          description: 'Clean apartment',
          laborCost: 50,
          materialCost: 10
        }],
        assignedTo: [workerId]
      };

      const res = await request(app)
        .post('/api/v1/work-orders')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(workOrderData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
    });

    it('should deny worker from creating work orders', async () => {
      const workOrderData = {
        title: 'Worker Attempted Work Order',
        description: 'Work order attempted by worker',
        building: testBuildingId,
        apartmentNumber: '104',
        priority: 'low',
        services: [{
          type: 'repair',
          description: 'Fix door',
          laborCost: 30,
          materialCost: 5
        }],
        assignedTo: [workerId]
      };

      const res = await request(app)
        .post('/api/v1/work-orders')
        .set('Authorization', `Bearer ${workerToken}`)
        .send(workOrderData);

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toContain('permission');
    });
  });

  describe('Work Order Updates', () => {
    it('should allow assigned worker to update work order status', async () => {
      const updateData = {
        status: 'in_progress'
      };

      const res = await request(app)
        .patch(`/api/v1/work-orders/${testWorkOrderId}`)
        .set('Authorization', `Bearer ${workerToken}`)
        .send(updateData);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.workOrder.status).toBe('in_progress');
    });

    it('should allow admin to update any work order', async () => {
      const updateData = {
        priority: 'urgent',
        description: 'Updated by admin'
      };

      const res = await request(app)
        .patch(`/api/v1/work-orders/${testWorkOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.workOrder.priority).toBe('urgent');
    });
  });

  describe('Work Order Deletion', () => {
    it('should deny worker from deleting work orders', async () => {
      const res = await request(app)
        .delete(`/api/v1/work-orders/${testWorkOrderId}`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.statusCode).toEqual(403);
    });

    it('should allow admin to delete work orders', async () => {
      const res = await request(app)
        .delete(`/api/v1/work-orders/${testWorkOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(204);
    });
  });
});
