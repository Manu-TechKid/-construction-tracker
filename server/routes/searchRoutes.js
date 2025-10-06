const express = require('express');
const searchController = require('../controllers/searchController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Search routes
router.post('/apartment', searchController.searchApartment);
router.get('/apartment-history', searchController.getApartmentHistory);
router.post('/global', searchController.globalSearch);

module.exports = router;
