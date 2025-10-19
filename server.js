// ================================
// Backend Server with MongoDB
// File: server.js
// ================================

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

// Initialize Express app
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve your HTML, CSS, JS files

// ================================
// MongoDB Connection
// ================================
const MONGODB_URI = 'mongodb://localhost:27017/gatepass-system';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// ================================
// Mongoose Schemas & Models
// ================================

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'hod', 'security'], required: true },
  
  // Student specific
  rollNumber: { type: String, unique: true, sparse: true },
  department: String,
  
  // HOD/Security specific
  employeeId: { type: String, unique: true, sparse: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Gate Pass Schema
const gatePassSchema = new mongoose.Schema({
  passId: { type: String, required: true, unique: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName: { type: String, required: true },
  rollNumber: { type: String, required: true },
  department: { type: String, required: true },
  reason: { type: String, required: true },
  destination: { type: String, required: true },
  dateOfExit: { type: Date, required: true },
  returnTime: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  hodRemarks: String,
  approvedBy: String,
  approvedDate: Date,
  submittedDate: { type: Date, default: Date.now }
}, { timestamps: true });

const GatePass = mongoose.model('GatePass', gatePassSchema);

// Entry Exit Log Schema
const entryExitLogSchema = new mongoose.Schema({
  logId: { type: String, required: true, unique: true },
  passId: { type: mongoose.Schema.Types.ObjectId, ref: 'GatePass', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName: { type: String, required: true },
  rollNumber: { type: String, required: true },
  department: { type: String, required: true },
  entryTime: Date,
  exitTime: Date,
  markedBy: String
}, { timestamps: true });

const EntryExitLog = mongoose.model('EntryExitLog', entryExitLogSchema);

// ================================
// Utility Functions
// ================================

// Generate unique Pass ID
async function generatePassId() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  // Count today's passes
  const count = await GatePass.countDocuments({
    passId: { $regex: `^GP-${year}${month}${day}` }
  });
  
  const sequence = String(count + 1).padStart(4, '0');
  return `GP-${year}${month}${day}-${sequence}`;
}

// Generate unique Log ID
async function generateLogId() {
  const count = await EntryExitLog.countDocuments();
  return `LOG${String(count + 1).padStart(4, '0')}`;
}

// ================================
// API Routes - Authentication
// ================================

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, rollNumber, department, employeeId } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user object
    const userData = {
      name,
      email,
      password: hashedPassword,
      role
    };
    
    // Add role-specific fields
    if (role === 'student') {
      userData.rollNumber = rollNumber;
      userData.department = department;
    } else if (role === 'hod' || role === 'security') {
      userData.employeeId = employeeId;
      if (role === 'hod') userData.department = department;
    }
    
    // Create and save user
    const user = new User(userData);
    await user.save();
    
    res.status(201).json({ 
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    // Find user by email or roll number or employee ID
    let user;
    if (role === 'student') {
      user = await User.findOne({ 
        $or: [{ email }, { rollNumber: email }],
        role: 'student'
      });
    } else if (role === 'hod') {
      user = await User.findOne({
        $or: [{ email }, { employeeId: email }],
        role: 'hod'
      });
    } else if (role === 'security') {
      user = await User.findOne({
        employeeId: email,
        role: 'security'
      });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Return user data (excluding password)
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber,
        department: user.department,
        employeeId: user.employeeId
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ================================
// API Routes - Gate Passes
// ================================

// Create new gate pass (Student)
app.post('/api/gatepasses', async (req, res) => {
  try {
    const { studentId, reason, destination, dateOfExit, returnTime } = req.body;
    
    // Get student details
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Generate pass ID
    const passId = await generatePassId();
    
    // Create gate pass
    const gatePass = new GatePass({
      passId,
      studentId: student._id,
      studentName: student.name,
      rollNumber: student.rollNumber,
      department: student.department,
      reason,
      destination,
      dateOfExit,
      returnTime,
      status: 'pending'
    });
    
    await gatePass.save();
    
    res.status(201).json({
      message: 'Gate pass created successfully',
      gatePass
    });
  } catch (error) {
    console.error('Gate pass creation error:', error);
    res.status(500).json({ error: 'Failed to create gate pass' });
  }
});

// Get gate passes by student ID
app.get('/api/gatepasses/student/:studentId', async (req, res) => {
  try {
    const gatePasses = await GatePass.find({ 
      studentId: req.params.studentId 
    }).sort({ submittedDate: -1 });
    
    res.json(gatePasses);
  } catch (error) {
    console.error('Error fetching gate passes:', error);
    res.status(500).json({ error: 'Failed to fetch gate passes' });
  }
});

// Get gate passes by department (HOD)
app.get('/api/gatepasses/department/:department', async (req, res) => {
  try {
    const gatePasses = await GatePass.find({ 
      department: req.params.department 
    }).sort({ submittedDate: -1 });
    
    res.json(gatePasses);
  } catch (error) {
    console.error('Error fetching gate passes:', error);
    res.status(500).json({ error: 'Failed to fetch gate passes' });
  }
});

// Get single gate pass
app.get('/api/gatepasses/:passId', async (req, res) => {
  try {
    const gatePass = await GatePass.findOne({ passId: req.params.passId });
    if (!gatePass) {
      return res.status(404).json({ error: 'Gate pass not found' });
    }
    res.json(gatePass);
  } catch (error) {
    console.error('Error fetching gate pass:', error);
    res.status(500).json({ error: 'Failed to fetch gate pass' });
  }
});

// Approve gate pass (HOD)
app.patch('/api/gatepasses/:passId/approve', async (req, res) => {
  try {
    const { approvedBy, hodRemarks } = req.body;
    
    const gatePass = await GatePass.findOneAndUpdate(
      { passId: req.params.passId },
      {
        status: 'approved',
        approvedBy,
        approvedDate: new Date(),
        hodRemarks: hodRemarks || 'Approved'
      },
      { new: true }
    );
    
    if (!gatePass) {
      return res.status(404).json({ error: 'Gate pass not found' });
    }
    
    res.json({
      message: 'Gate pass approved',
      gatePass
    });
  } catch (error) {
    console.error('Error approving gate pass:', error);
    res.status(500).json({ error: 'Failed to approve gate pass' });
  }
});

// Reject gate pass (HOD)
app.patch('/api/gatepasses/:passId/reject', async (req, res) => {
  try {
    const { approvedBy, hodRemarks } = req.body;
    
    const gatePass = await GatePass.findOneAndUpdate(
      { passId: req.params.passId },
      {
        status: 'rejected',
        approvedBy,
        approvedDate: new Date(),
        hodRemarks
      },
      { new: true }
    );
    
    if (!gatePass) {
      return res.status(404).json({ error: 'Gate pass not found' });
    }
    
    res.json({
      message: 'Gate pass rejected',
      gatePass
    });
  } catch (error) {
    console.error('Error rejecting gate pass:', error);
    res.status(500).json({ error: 'Failed to reject gate pass' });
  }
});

// ================================
// API Routes - Entry/Exit Logs
// ================================

// Search gate pass (Security)
app.get('/api/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    
    // Search by pass ID or roll number
    const gatePass = await GatePass.findOne({
      $or: [
        { passId: query },
        { rollNumber: query }
      ],
      status: 'approved'
    }).sort({ submittedDate: -1 });
    
    res.json(gatePass);
  } catch (error) {
    console.error('Error searching gate pass:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Create or get entry/exit log
app.post('/api/logs', async (req, res) => {
  try {
    const { passId } = req.body;
    
    // Check if log already exists
    let log = await EntryExitLog.findOne({ passId });
    
    if (!log) {
      // Get gate pass details
      const gatePass = await GatePass.findOne({ passId });
      if (!gatePass) {
        return res.status(404).json({ error: 'Gate pass not found' });
      }
      
      // Generate log ID
      const logId = await generateLogId();
      
      // Create new log
      log = new EntryExitLog({
        logId,
        passId: gatePass._id,
        studentId: gatePass.studentId,
        studentName: gatePass.studentName,
        rollNumber: gatePass.rollNumber,
        department: gatePass.department
      });
      
      await log.save();
    }
    
    res.json(log);
  } catch (error) {
    console.error('Error creating log:', error);
    res.status(500).json({ error: 'Failed to create log' });
  }
});

// Mark entry time
app.patch('/api/logs/:passId/entry', async (req, res) => {
  try {
    const { markedBy } = req.body;
    
    // Find gate pass
    const gatePass = await GatePass.findOne({ passId: req.params.passId });
    if (!gatePass) {
      return res.status(404).json({ error: 'Gate pass not found' });
    }
    
    const log = await EntryExitLog.findOneAndUpdate(
      { passId: gatePass._id },
      {
        entryTime: new Date(),
        markedBy
      },
      { new: true }
    );
    
    res.json({
      message: 'Entry marked successfully',
      log
    });
  } catch (error) {
    console.error('Error marking entry:', error);
    res.status(500).json({ error: 'Failed to mark entry' });
  }
});

// Mark exit time
app.patch('/api/logs/:passId/exit', async (req, res) => {
  try {
    // Find gate pass
    const gatePass = await GatePass.findOne({ passId: req.params.passId });
    if (!gatePass) {
      return res.status(404).json({ error: 'Gate pass not found' });
    }
    
    const log = await EntryExitLog.findOneAndUpdate(
      { passId: gatePass._id },
      { exitTime: new Date() },
      { new: true }
    );
    
    res.json({
      message: 'Exit marked successfully',
      log
    });
  } catch (error) {
    console.error('Error marking exit:', error);
    res.status(500).json({ error: 'Failed to mark exit' });
  }
});

// Get all logs
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await EntryExitLog.find()
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// ================================
// Start Server
// ================================

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 MongoDB connected to: ${MONGODB_URI}`);
});