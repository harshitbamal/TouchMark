const express = require('express');
const router = express.Router();
const fingerprintController = require('../controllers/fingerprintController');
const { authenticateToken, isTeacherOrAdmin } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Check Arduino connection status
router.get('/status', fingerprintController.checkStatus);
router.get('/events', isTeacherOrAdmin, fingerprintController.statusEvents);

// Get all registered fingerprints
router.get('/registered', fingerprintController.getRegistered);

// Start fingerprint registration (admin/teacher only)
router.post('/register', isTeacherOrAdmin, fingerprintController.startRegistration);

// Verify fingerprint
router.post('/verify', fingerprintController.verify);

// Verify fingerprint AND mark attendance (one-step)
router.post('/verify-and-mark', fingerprintController.verifyAndMarkAttendance);

// Delete fingerprint registration (admin/teacher only)
router.delete('/:studentId', isTeacherOrAdmin, fingerprintController.deleteRegistration);

module.exports = router;
