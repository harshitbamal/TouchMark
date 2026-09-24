const User = require('../models/User');
const Student = require('../models/Student');
const bcrypt = require('bcryptjs');
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

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Check if roll number exists
    const existingRoll = await Student.findOne({ rollNumber });
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
      rollNumber,
      email,
      phone: phone || '',
      isFingerprintRegistered: false,
      classes: []
    });

    // Create user - password will be hashed by pre-save hook
    const user = await User.create({
      email,
      password: password,  // ✅ Pass plain password - model will hash it
      name,
      role: 'student',
      rollNumber,
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
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
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

// Login
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    console.log('=== LOGIN ATTEMPT ===');
    console.log('Email:', email);
    console.log('Role:', role);

    // HARDCODED ADMIN LOGIN
    if (email === 'admin@rd.com' && password === 'admin123') {
      const token = jwt.sign(
        { id: 'admin', email: 'admin@rd.com', role: 'admin' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      console.log('Admin login successful');
      return res.json({
        success: true,
        token,
        user: {
          id: 'admin',
          email: 'admin@rd.com',
          name: 'Administrator',
          role: 'admin'
        }
      });
    }

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

    // Check role if provided
    if (role && user.role !== role) {
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

    console.log('Login successful for:', email);

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

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    console.log('Getting current user for:', req.user); // Debug log

    // Admin check
    if (req.user.id === 'admin') {
      return res.json({
        success: true,
        user: {
          id: 'admin',
          email: 'admin@rd.com',
          name: 'Administrator',
          role: 'admin'
        }
      });
    }

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
