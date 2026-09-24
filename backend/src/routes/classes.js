const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { authenticateToken, isTeacherOrAdmin } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all classes
router.get('/', classController.getAll);

// Staff review student requests; students can submit requests for themselves.
router.get('/enrollment-requests', isTeacherOrAdmin, classController.getEnrollmentRequests);

// Get class by ID
router.get('/:id', classController.getById);

// Get class students
router.get('/:id/students', classController.getStudents);

// Create class (admin/teacher only)
router.post('/', isTeacherOrAdmin, classController.create);

// Update class (admin/teacher only)
router.put('/:id', isTeacherOrAdmin, classController.update);

// Delete class (admin/teacher only)
router.delete('/:id', isTeacherOrAdmin, classController.delete);

router.post('/:id/enrollment-requests', classController.requestEnrollment);
router.post('/:id/enrollment-requests/:studentId/approve', isTeacherOrAdmin, (req, res, next) => {
  req.params.action = 'approve';
  next();
}, classController.reviewEnrollmentRequest);
router.post('/:id/enrollment-requests/:studentId/reject', isTeacherOrAdmin, (req, res, next) => {
  req.params.action = 'reject';
  next();
}, classController.reviewEnrollmentRequest);

// Add student to class (admin/teacher only)
router.post('/:id/students', isTeacherOrAdmin, classController.addStudent);

// Remove student from class (admin/teacher only)
router.delete('/:id/students/:studentId', isTeacherOrAdmin, classController.removeStudent);

module.exports = router;
