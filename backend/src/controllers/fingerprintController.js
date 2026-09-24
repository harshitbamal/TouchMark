const Student = require('../models/Student');
const arduinoService = require('../services/arduinoService');

const fingerprintController = {
  // Start fingerprint registration
  startRegistration: async (req, res, next) => {
    try {
      const { studentId } = req.body;

      if (!studentId) {
        return res.status(400).json({
          success: false,
          message: 'Student ID is required'
        });
      }

      // Check if student exists
      const student = await Student.findById(studentId);

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      if (student.isFingerprintRegistered) {
        return res.status(400).json({
          success: false,
          message: 'Student already has fingerprint registered'
        });
      }

      // Find next available template ID (Arduino-compatible)
      // Get the highest fingerprintId currently in use
      const highestStudent = await Student.findOne({ 
        fingerprintId: { $ne: null } 
      }).sort({ fingerprintId: -1 });

      // Next ID is highest + 1, or 1 if no fingerprints registered yet
      const nextTemplateId = highestStudent ? highestStudent.fingerprintId + 1 : 1;

      console.log(`📝 Assigning template ID ${nextTemplateId} to ${student.name}`);

      // Send enrollment command to Arduino with the template ID
      const result = await arduinoService.enrollFingerprint(nextTemplateId);

      if (result.success) {
        // Update database with the SAME template ID Arduino used
        student.fingerprintId = result.templateId;
        student.isFingerprintRegistered = true;
        await student.save();

        console.log(`✅ Student ${student.name} registered with template ID ${result.templateId}`);

        res.json({
          success: true,
          message: 'Fingerprint registered successfully',
          templateId: result.templateId,
          student: {
            id: student._id,
            name: student.name,
            rollNumber: student.rollNumber,
            fingerprintId: result.templateId
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Fingerprint registration failed'
        });
      }

    } catch (error) {
      console.error('❌ Fingerprint registration error:', error);
      
      // Handle duplicate key error specifically
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Fingerprint ID already exists. Please try again.'
        });
      }
      
      res.status(500).json({
        success: false,
        message: error.message || 'Registration failed'
      });
    }
  },

  // Verify fingerprint (for manual attendance marking)
  verify: async (req, res, next) => {
    try {
      console.log('🔍 Starting fingerprint verification...');
      const result = await arduinoService.verifyFingerprint();

      if (result.success) {
        console.log(`✅ Arduino found fingerprint with template ID: ${result.templateId}`);
        
        // Find student by template ID
        const student = await Student.findOne({ 
          fingerprintId: result.templateId 
        }).populate('classes', 'name code');

        if (student) {
          console.log(`✅ Student found: ${student.name} (${student.rollNumber})`);
          
          res.json({
            success: true,
            student: {
              id: student._id,
              name: student.name,
              rollNumber: student.rollNumber,
              email: student.email,
              classes: student.classes,
              fingerprintId: student.fingerprintId,
              isFingerprintRegistered: student.isFingerprintRegistered
            },
            templateId: result.templateId,
            message: `Student identified: ${student.name}`
          });
        } else {
          console.log(`❌ No student found with fingerprintId: ${result.templateId}`);
          console.log('💡 Tip: Check if student was registered correctly');
          
          res.status(404).json({
            success: false,
            message: `Student not found for fingerprint ID ${result.templateId}. Please register this fingerprint first.`,
            templateId: result.templateId,
            needsEnrollment: true
          });
        }
      } else {
        console.log('❌ Arduino did not recognize fingerprint');
        res.status(400).json({
          success: false,
          message: 'Fingerprint not recognized'
        });
      }

    } catch (error) {
      console.error('❌ Fingerprint verification error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Verification failed'
      });
    }
  },

  // Verify and auto-mark attendance (one-step process)
  verifyAndMarkAttendance: async (req, res, next) => {
    try {
      const { classId } = req.body;

      if (!classId) {
        return res.status(400).json({
          success: false,
          message: 'Class ID is required'
        });
      }

      console.log('🔍 Verifying fingerprint and marking attendance...');
      
      // Verify fingerprint
      const result = await arduinoService.verifyFingerprint();

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Fingerprint not recognized. Please try again.'
        });
      }

      console.log(`✅ Fingerprint verified: Template ID ${result.templateId}`);

      // Find student
      const student = await Student.findOne({ 
        fingerprintId: result.templateId 
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found. Please enroll fingerprint first.',
          templateId: result.templateId,
          needsEnrollment: true
        });
      }

      // Check if enrolled in class
      const Class = require('../models/Class');
      const classData = await Class.findById(classId);
      
      if (!classData) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      if (!student.classes.includes(classId)) {
        return res.status(400).json({
          success: false,
          message: `${student.name} is not enrolled in ${classData.name}`,
          student: {
            id: student._id,
            name: student.name,
            rollNumber: student.rollNumber
          }
        });
      }

      // Check if already marked today
      const Attendance = require('../models/Attendance');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const existingAttendance = await Attendance.findOne({
        student: student._id,
        class: classId,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      });

      if (existingAttendance) {
        return res.json({
          success: true,
          alreadyMarked: true,
          message: `Welcome ${student.name}! Attendance already marked.`,
          student: {
            id: student._id,
            name: student.name,
            rollNumber: student.rollNumber,
            photo: student.profileImage
          },
          attendance: existingAttendance
        });
      }

      // Mark attendance
      const attendance = await Attendance.create({
        student: student._id,
        class: classId,
        status: 'present',
        markedBy: 'fingerprint',
        date: new Date()
      });

      console.log(`✅ Attendance marked for ${student.name}`);

      res.json({
        success: true,
        alreadyMarked: false,
        message: `Attendance marked for ${student.name}`,
        student: {
          id: student._id,
          name: student.name,
          rollNumber: student.rollNumber,
          email: student.email,
          photo: student.profileImage
        },
        attendance: {
          id: attendance._id,
          date: attendance.date,
          status: attendance.status
        }
      });

    } catch (error) {
      console.error('❌ Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to mark attendance'
      });
    }
  },

  // Check Arduino connection status
  checkStatus: async (req, res, next) => {
    try {
      const connected = arduinoService.isConnected();
      const enrolledCount = await Student.countDocuments({ isFingerprintRegistered: true });
      res.json({
        success: true,
        connected,
        ready: connected,
        enrolled_count: enrolledCount,
        message: connected ? 'Arduino is connected' : 'Arduino is not connected'
      });
    } catch (error) {
      next(error);
    }
  },

  // Stream scanner connection changes so clients do not need to poll.
  statusEvents: async (req, res, next) => {
    let keepAlive;
    let enrolledCount = 0;
    const sendStatus = (state) => {
      if (res.writableEnded || res.destroyed) return;
      res.write(`data: ${JSON.stringify({
        state,
        ready: arduinoService.isConnected(),
        enrolled_count: enrolledCount
      })}\n\n`);
      res.flush?.();
    };

    try {
      enrolledCount = await Student.countDocuments({ isFingerprintRegistered: true });
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      });
      res.flushHeaders?.();
      sendStatus(arduinoService.isConnected() ? 'connected' : 'reconnecting');

      const onStatus = ({ state }) => sendStatus(state);
      arduinoService.on('connection-status', onStatus);
      keepAlive = setInterval(() => {
        res.write(': keep-alive\n\n');
        res.flush?.();
      }, 20000);

      res.on('close', () => {
        clearInterval(keepAlive);
        arduinoService.off('connection-status', onStatus);
      });
    } catch (error) {
      if (!res.headersSent) next(error);
      else res.end();
    }
  },

  // Delete fingerprint registration
  deleteRegistration: async (req, res, next) => {
    try {
      const { studentId } = req.params;

      const student = await Student.findById(studentId);

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      if (!student.isFingerprintRegistered) {
        return res.status(400).json({
          success: false,
          message: 'Student has no fingerprint registered'
        });
      }

      // Delete from Arduino
      if (student.fingerprintId) {
        await arduinoService.deleteFingerprint(student.fingerprintId);
      }

      // Update database
      student.fingerprintId = null;
      student.isFingerprintRegistered = false;
      await student.save();

      res.json({
        success: true,
        message: 'Fingerprint registration deleted successfully'
      });

    } catch (error) {
      console.error('Delete fingerprint error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Delete failed'
      });
    }
  },

  // Get all registered fingerprints
  getRegistered: async (req, res, next) => {
    try {
      const students = await Student.find({ 
        isFingerprintRegistered: true 
      }).select('name rollNumber fingerprintId email').sort({ fingerprintId: 1 });

      console.log('📋 Registered fingerprints:');
      students.forEach(s => {
        console.log(`  - ${s.name} (${s.rollNumber}): Template ID ${s.fingerprintId}`);
      });

      res.json({
        success: true,
        count: students.length,
        students,
        message: students.length === 0 ? 'No fingerprints registered yet' : `${students.length} fingerprints registered`
      });

    } catch (error) {
      next(error);
    }
  }
};

module.exports = fingerprintController;
