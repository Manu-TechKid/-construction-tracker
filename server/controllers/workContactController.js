const WorkContact = require('../models/workContactModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// Use the factory for standard CRUD operations
exports.getAllWorkContacts = factory.getAll(WorkContact);
exports.getWorkContact = factory.getOne(WorkContact);
exports.createWorkContact = factory.createOne(WorkContact);
exports.updateWorkContact = factory.updateOne(WorkContact);
exports.deleteWorkContact = factory.deleteOne(WorkContact);
