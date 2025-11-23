const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Public routes (no authentication required)
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);
router.patch('/reset-password/:token', authController.resetPassword);
router.post('/logout', authController.logout);

// Protect all routes after this middleware
router.use(authController.protect);

// Protected routes (requires authentication)
router.get('/me', (req, res) => {
    res.status(200).json({
        status: 'success',
        data: {
            user: req.user
        }
    });
});

router.patch('/change-password', authController.changePassword);

module.exports = router;
