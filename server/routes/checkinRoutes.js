const express = require('express');
const { protect } = require('../controllers/authController');
const { createCheckin, createCheckout, getCheckinHistory, getCurrentCheckinStatus } = require('../controllers/checkinController');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.post('/checkin', upload.single('photo'), createCheckin);
router.post('/checkout', upload.single('photo'), createCheckout);
router.get('/history', getCheckinHistory);
router.get('/status', getCurrentCheckinStatus);

module.exports = router;
