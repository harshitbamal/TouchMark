const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/teachers', authenticateToken, isAdmin, authController.createTeacher);
router.post('/students', authenticateToken, isAdmin, authController.createStudent);

// Protected routes
router.get('/me', authenticateToken, authController.getCurrentUser);
router.post('/logout', authenticateToken, authController.logout);
router.post('/password', authenticateToken, authController.changePassword);

module.exports = router;
