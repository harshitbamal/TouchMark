const User = require('../models/User');
const Student = require('../models/Student');
const jwt = require('jsonwebtoken');
// Register student
exports.register = async (req, res) => {
  try {
    const { name, rollNumber, email, phone, password } = req.body;

    // Validation
    if (!name || !rollNumber || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRollNumber = rollNumber.trim().toUpperCase();
    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Check if roll number exists
    const existingRoll = await Student.findOne({ rollNumber: normalizedRollNumber });
    if (existingRoll) {
      return res.status(400).json({
        success: false,
        message: 'Roll number already exists'
      });
    }

    // ❌ REMOVE THIS LINE - Don't hash here, let the model do it
    // const hashedPassword = await bcrypt.hash(password, 10);

    // Create student first
    const student = await Student.create({
      name,
      rollNumber: normalizedRollNumber,
      email: normalizedEmail,
      phone: phone || '',
      isFingerprintRegistered: false,
      classes: []
    });

    // Create user - password will be hashed by pre-save hook
    const user = await User.create({
      email: normalizedEmail,
      password: password,  // ✅ Pass plain password - model will hash it
      name,
      role: 'student',
      rollNumber: normalizedRollNumber,
      studentId: student._id
    });

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      userId: user._id
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Admin-only teacher account provisioning
exports.createTeacher = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Temporary password must be at least 8 characters' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const teacher = await User.create({ name: name.trim(), email: normalizedEmail, password, role: 'teacher' });
    return res.status(201).json({
      success: true,
      message: 'Teacher account created',
      user: { id: teacher._id, name: teacher.name, email: teacher.email, role: teacher.role }
    });
  } catch (error) {
    console.error('Create teacher error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Admin provisions a student login and matching student profile together.
exports.createStudent = async (req, res) => {
  let student;
  try {
    const { name, rollNumber, email, phone, password } = req.body;
    if (!name?.trim() || !rollNumber?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ success: false, message: 'Name, roll number, email, and temporary password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Temporary password must be at least 8 characters' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRollNumber = rollNumber.trim().toUpperCase();
    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }
    if (await Student.findOne({ rollNumber: normalizedRollNumber })) {
      return res.status(409).json({ success: false, message: 'Roll number already exists' });
    }

    student = await Student.create({
      name: name.trim(), rollNumber: normalizedRollNumber, email: normalizedEmail,
      phone: phone?.trim() || '', isFingerprintRegistered: false, classes: [],
    });
    const user = await User.create({
      name: name.trim(), email: normalizedEmail, password, role: 'student',
      rollNumber: normalizedRollNumber, studentId: student._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Student account created. Share the temporary password with the student.',
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      student,
    });
  } catch (error) {
    if (student) await Student.findByIdAndDelete(student._id).catch(() => {});
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'Email or roll number already exists' });
    console.error('Create student account error:', error);
    return res.status(500).json({ success: false, message: 'Could not create student account' });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const { password } = req.body;

    // Student login
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user - explicitly select password field
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Use the model's comparePassword method
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        role: user.role,
        studentId: user.studentId
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        rollNumber: user.rollNumber,
        studentId: user.studentId
      }
    });

  } catch (error) {
    console.error('=== LOGIN ERROR ===');
    console.error('Error:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};
// Logout
exports.logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new passwords are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'Account not found' });
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    if (await user.comparePassword(newPassword)) {
      return res.status(400).json({ success: false, message: 'Choose a different password' });
    }

    user.password = newPassword;
    await user.save();
    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ success: false, message: 'Could not change password' });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    console.log('Getting current user for:', req.user); // Debug log

    // Find user
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        rollNumber: user.rollNumber,
        studentId: user.studentId
      }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};
