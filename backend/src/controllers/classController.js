const Class = require('../models/Class');
const Student = require('../models/Student');

const classController = {
  // Get all classes
  getAll: async (req, res, next) => {
    try {
      const classesQuery = Class.find({ isActive: true }).select('-enrollmentRequests').sort({ code: 1 });
      if (req.user.role !== 'student') classesQuery.populate('students', 'name rollNumber email');
      const classes = await classesQuery;

      const studentId = req.user.role === 'student' ? req.user.studentId : null;
      const studentClasses = studentId
        ? await Class.find({ 'enrollmentRequests.student': studentId }).select('_id')
        : [];
      const pendingClassIds = new Set(studentClasses.map((item) => item._id.toString()));
      const result = classes.map((item) => {
        const data = item.toObject();
        if (studentId) {
          const alreadyEnrolled = data.students.some((student) => (student._id || student).toString() === studentId.toString());
          data.enrollmentStatus = alreadyEnrolled ? 'enrolled' : pendingClassIds.has(data._id.toString()) ? 'pending' : 'available';
        }
        return data;
      });

      res.json({
        success: true,
        count: result.length,
        classes: result
      });

    } catch (error) {
      next(error);
    }
  },

  // Get class by ID
  getById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const classData = await Class.findById(id)
        .populate('students', 'name rollNumber email isFingerprintRegistered');

      if (!classData) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      res.json({
        success: true,
        class: classData
      });

    } catch (error) {
      next(error);
    }
  },

  // Create class
  create: async (req, res, next) => {
    try {
      const { name, code, subject, teacher, schedule } = req.body;

      if (!name || !code) {
        return res.status(400).json({
          success: false,
          message: 'Name and code are required'
        });
      }

      const classData = await Class.create({
        name,
        code: code.toUpperCase(),
        subject,
        teacher,
        schedule
      });

      res.status(201).json({
        success: true,
        message: 'Class created successfully',
        class: classData
      });

    } catch (error) {
      next(error);
    }
  },

  // Update class
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, code, subject, teacher, schedule } = req.body;

      const classData = await Class.findByIdAndUpdate(
        id,
        { 
          name, 
          code: code ? code.toUpperCase() : undefined, 
          subject, 
          teacher, 
          schedule 
        },
        { new: true, runValidators: true }
      );

      if (!classData) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      res.json({
        success: true,
        message: 'Class updated successfully',
        class: classData
      });

    } catch (error) {
      next(error);
    }
  },

  // Delete class (soft delete)
  delete: async (req, res, next) => {
    try {
      const { id } = req.params;

      const classData = await Class.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      );

      if (!classData) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      res.json({
        success: true,
        message: 'Class deleted successfully'
      });

    } catch (error) {
      next(error);
    }
  },

  // Add student to class
  addStudent: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { studentId } = req.body;

      if (!studentId) {
        return res.status(400).json({
          success: false,
          message: 'Student ID is required'
        });
      }

      const classData = await Class.findById(id);
      const student = await Student.findById(studentId);

      if (!classData) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      // Add to class if not already added
      if (!classData.students.some((id) => id.toString() === studentId.toString())) {
        classData.students.push(studentId);
      }
      classData.enrollmentRequests = classData.enrollmentRequests.filter(
        (request) => request.student.toString() !== studentId.toString()
      );
      await classData.save();

      // Add to student if not already added
      if (!student.classes.includes(id)) {
        student.classes.push(id);
        await student.save();
      }

      res.json({
        success: true,
        message: 'Student added to class successfully'
      });

    } catch (error) {
      next(error);
    }
  },

  requestEnrollment: async (req, res, next) => {
    try {
      if (req.user.role !== 'student' || !req.user.studentId) {
        return res.status(403).json({ success: false, message: 'Student access required' });
      }
      const classData = await Class.findOne({ _id: req.params.id, isActive: true });
      if (!classData) return res.status(404).json({ success: false, message: 'Class not found' });

      const studentId = req.user.studentId.toString();
      const student = await Student.findById(studentId);
      if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });
      if (classData.students.some((id) => id.toString() === studentId)) {
        return res.status(409).json({ success: false, message: 'You are already enrolled in this class' });
      }
      if (classData.enrollmentRequests.some((request) => request.student.toString() === studentId)) {
        return res.status(409).json({ success: false, message: 'Your request is already pending' });
      }

      classData.enrollmentRequests.push({ student: student._id });
      await classData.save();
      return res.status(201).json({ success: true, message: 'Enrollment request sent for approval' });
    } catch (error) {
      next(error);
    }
  },

  getEnrollmentRequests: async (req, res, next) => {
    try {
      const classes = await Class.find({ 'enrollmentRequests.0': { $exists: true } })
        .populate('enrollmentRequests.student', 'name rollNumber email')
        .sort({ code: 1 });
      const requests = classes.flatMap((classData) => classData.enrollmentRequests
        .filter((request) => request.student)
        .map((request) => ({
          id: request._id,
          student: request.student,
          requestedAt: request.requestedAt,
          class: { id: classData._id, name: classData.name, code: classData.code },
        })));
      return res.json({ success: true, requests });
    } catch (error) {
      next(error);
    }
  },

  reviewEnrollmentRequest: async (req, res, next) => {
    try {
      const { id: classId, studentId } = req.params;
      const action = req.params.action;
      const classData = await Class.findById(classId);
      if (!classData) return res.status(404).json({ success: false, message: 'Class not found' });
      const requestIndex = classData.enrollmentRequests.findIndex(
        (request) => request.student.toString() === studentId
      );
      if (requestIndex === -1) return res.status(404).json({ success: false, message: 'Enrollment request not found' });

      const student = await Student.findById(studentId);
      if (!student) {
        classData.enrollmentRequests.splice(requestIndex, 1);
        await classData.save();
        return res.status(404).json({ success: false, message: 'Student profile not found; request removed' });
      }

      if (action === 'approve') {
        if (!classData.students.some((id) => id.toString() === studentId)) classData.students.push(student._id);
        if (!student.classes.some((id) => id.toString() === classId)) student.classes.push(classData._id);
        await student.save();
      }
      classData.enrollmentRequests.splice(requestIndex, 1);
      await classData.save();
      return res.json({ success: true, message: action === 'approve' ? 'Enrollment approved' : 'Enrollment request declined' });
    } catch (error) {
      next(error);
    }
  },

  // Remove student from class
  removeStudent: async (req, res, next) => {
    try {
      const { id, studentId } = req.params;

      const classData = await Class.findById(id);
      const student = await Student.findById(studentId);

      if (!classData) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      // Remove from class
      classData.students = classData.students.filter(
        s => s.toString() !== studentId
      );
      await classData.save();

      // Remove from student
      if (student) {
        student.classes = student.classes.filter(
          c => c.toString() !== id
        );
        await student.save();
      }

      res.json({
        success: true,
        message: 'Student removed from class successfully'
      });

    } catch (error) {
      next(error);
    }
  },

  // Get class students
  getStudents: async (req, res, next) => {
    try {
      const { id } = req.params;

      const classData = await Class.findById(id)
        .populate('students', 'name rollNumber email isFingerprintRegistered');

      if (!classData) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      res.json({
        success: true,
        count: classData.students.length,
        students: classData.students
      });

    } catch (error) {
      next(error);
    }
  }
};

module.exports = classController;
