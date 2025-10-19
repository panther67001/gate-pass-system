// ================================
// Smart Gate Pass Management System
// Frontend with API Integration
// ================================

// API Base URL
const API_URL = 'http://localhost:3000/api';

// Global Application State
const appState = {
  currentUser: null,
  currentRole: null,
  isLoggedIn: false,
  currentPage: 'landing-page',
  selectedRole: null,
  pendingAction: null,
  selectedPassId: null
};

// ================================
// Utility Functions
// ================================

// Format date and time
function formatDateTime(dateStr, timeStr = null) {
  const date = new Date(dateStr);
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  };
  let formatted = date.toLocaleDateString('en-US', options);
  if (timeStr) {
    formatted += ` at ${timeStr}`;
  }
  return formatted;
}

// Show toast notification
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  
  toastMessage.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Show/Hide pages
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add('active');
    appState.currentPage = pageId;
  }
}

// ================================
// Authentication Functions
// ================================

// Show login page
function showLogin(role) {
  appState.selectedRole = role;
  document.getElementById('login-title').textContent = `Login as ${role.charAt(0).toUpperCase() + role.slice(1)}`;
  document.getElementById('signup-link').onclick = () => showSignup(role);
  showPage('login-page');
}

// Show signup page
function showSignup(role) {
  appState.selectedRole = role;
  document.getElementById('signup-title').textContent = `Sign Up as ${role.charAt(0).toUpperCase() + role.slice(1)}`;
  
  // Show/hide role-specific fields
  document.querySelectorAll('.form-fields').forEach(fields => {
    fields.style.display = 'none';
  });
  
  const roleFields = document.querySelector(`.${role}-fields`);
  if (roleFields) {
    roleFields.style.display = 'flex';
  }
  
  document.getElementById('login-link').onclick = () => showLogin(role);
  showPage('signup-page');
}

// Handle login
async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const role = appState.selectedRole;
  
  if (!email || !password) {
    showToast('Please fill in all fields', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      showToast(data.error || 'Login failed', 'error');
      return;
    }
    
    // Login successful
    appState.currentUser = data.user;
    appState.currentRole = role;
    appState.isLoggedIn = true;
    
    showToast(`Welcome, ${data.user.name}!`, 'success');
    document.getElementById('login-form').reset();
    
    // Navigate to appropriate dashboard
    if (role === 'student') {
      showStudentDashboard();
    } else if (role === 'hod') {
      showHodDashboard();
    } else if (role === 'security') {
      showSecurityDashboard();
    }
  } catch (error) {
    console.error('Login error:', error);
    showToast('Login failed. Please try again.', 'error');
  }
}

// Handle signup
async function handleSignup(event) {
  event.preventDefault();
  
  const name = document.getElementById('signup-name').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const role = appState.selectedRole;
  
  if (!name || !password || !confirmPassword) {
    showToast('Please fill in all required fields', 'error');
    return;
  }
  
  if (password !== confirmPassword) {
    showToast('Passwords do not match', 'error');
    return;
  }
  
  if (password.length < 6) {
    showToast('Password must be at least 6 characters long', 'error');
    return;
  }
  
  const userData = { name, password, role };
  
  // Add role-specific fields
  if (role === 'student') {
    const rollNumber = document.getElementById('signup-roll').value.trim();
    const department = document.getElementById('signup-department').value;
    const email = document.getElementById('signup-email').value.trim();
    
    if (!rollNumber || !department || !email) {
      showToast('Please fill in all student details', 'error');
      return;
    }
    
    userData.rollNumber = rollNumber;
    userData.department = department;
    userData.email = email;
  } else if (role === 'hod') {
    const employeeId = document.getElementById('hod-empid').value.trim();
    const department = document.getElementById('hod-department').value;
    const email = document.getElementById('hod-email').value.trim();
    
    if (!employeeId || !department || !email) {
      showToast('Please fill in all HOD details', 'error');
      return;
    }
    
    userData.employeeId = employeeId;
    userData.department = department;
    userData.email = email;
  } else if (role === 'security') {
    const employeeId = document.getElementById('security-empid').value.trim();
    const email = `${employeeId}@college.edu`; // Auto-generate email for security
    
    if (!employeeId) {
      showToast('Please enter employee ID', 'error');
      return;
    }
    
    userData.employeeId = employeeId;
    userData.email = email;
  }
  
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      showToast(data.error || 'Registration failed', 'error');
      return;
    }
    
    showToast('Account created successfully! Please login.', 'success');
    document.getElementById('signup-form').reset();
    showLogin(role);
  } catch (error) {
    console.error('Signup error:', error);
    showToast('Registration failed. Please try again.', 'error');
  }
}

// Logout
function logout() {
  appState.currentUser = null;
  appState.currentRole = null;
  appState.isLoggedIn = false;
  appState.selectedRole = null;
  
  showToast('Logged out successfully', 'info');
  showPage('landing-page');
}

// ================================
// Student Functions
// ================================

async function showStudentDashboard() {
  if (!appState.isLoggedIn || appState.currentRole !== 'student') {
    showPage('landing-page');
    return;
  }
  
  const user = appState.currentUser;
  
  // Update header
  document.getElementById('student-welcome').textContent = `Welcome, ${user.name}`;
  document.getElementById('student-details').textContent = `Roll: ${user.rollNumber} | Department: ${user.department}`;
  
  try {
    // Fetch gate passes
    const response = await fetch(`${API_URL}/gatepasses/student/${user.id}`);
    const gatePasses = await response.json();
    
    // Update stats
    const totalRequests = gatePasses.length;
    const approvedRequests = gatePasses.filter(p => p.status === 'approved').length;
    const rejectedRequests = gatePasses.filter(p => p.status === 'rejected').length;
    const pendingRequests = gatePasses.filter(p => p.status === 'pending').length;
    
    document.getElementById('total-requests').textContent = totalRequests;
    document.getElementById('approved-requests').textContent = approvedRequests;
    document.getElementById('rejected-requests').textContent = rejectedRequests;
    document.getElementById('pending-requests').textContent = pendingRequests;
    
    // Update current status and history
    updateCurrentStatus(gatePasses);
    updateStudentHistory(gatePasses);
    
    showPage('student-dashboard');
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showToast('Failed to load dashboard', 'error');
  }
}

function updateCurrentStatus(userPasses) {
  const statusContainer = document.getElementById('current-status');
  
  const latestPass = userPasses
    .filter(pass => pass.status === 'pending' || pass.status === 'approved')
    .sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate))[0];
  
  if (latestPass) {
    statusContainer.innerHTML = `
      <div class="status-card">
        <h4>Current Request Status</h4>
        <div class="status-info">
          <p><strong>Pass ID:</strong> ${latestPass.passId}</p>
          <p><strong>Reason:</strong> ${latestPass.reason}</p>
          <p><strong>Date:</strong> ${formatDateTime(latestPass.dateOfExit, latestPass.returnTime)}</p>
          <p><strong>Status:</strong> <span class="status-badge ${latestPass.status}">${latestPass.status.toUpperCase()}</span></p>
          ${latestPass.status === 'approved' ? 
            `<button class="btn btn--primary btn--sm" onclick="viewDigitalPass('${latestPass.passId}')">View Digital Pass</button>` : 
            ''
          }
        </div>
      </div>
    `;
  } else {
    statusContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3>No Active Requests</h3>
        <p>You don't have any active gate pass requests</p>
      </div>
    `;
  }
}

function updateStudentHistory(userPasses) {
  const tbody = document.querySelector('#student-history-table tbody');
  
  if (userPasses.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center">
          <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <h3>No Request History</h3>
            <p>Your gate pass requests will appear here</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  const sortedPasses = userPasses.sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate));
  
  tbody.innerHTML = sortedPasses.map(pass => `
    <tr>
      <td>${pass.passId}</td>
      <td>${formatDateTime(pass.dateOfExit)}</td>
      <td>${pass.reason}</td>
      <td><span class="status-badge ${pass.status}">${pass.status.toUpperCase()}</span></td>
      <td>
        ${pass.status === 'approved' ? 
          `<button class="btn btn--primary btn--sm" onclick="viewDigitalPass('${pass.passId}')">View Pass</button>` :
          pass.status === 'rejected' && pass.hodRemarks ? 
            `<button class="btn btn--outline btn--sm" onclick="showRemarks('${pass.hodRemarks}')">View Remarks</button>` :
            '-'
        }
      </td>
    </tr>
  `).join('');
}

function showRemarks(remarks) {
  showToast(`HOD Remarks: ${remarks}`, 'info');
}

function showRequestForm() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('request-date').min = today;
  showPage('request-form');
}

async function handleGatePassRequest(event) {
  event.preventDefault();
  
  const reason = document.getElementById('request-reason').value.trim();
  const destination = document.getElementById('request-destination').value.trim();
  const dateOfExit = document.getElementById('request-date').value;
  const returnTime = document.getElementById('request-time').value;
  
  if (!reason || !destination || !dateOfExit || !returnTime) {
    showToast('Please fill in all fields', 'error');
    return;
  }
  
  const selectedDate = new Date(dateOfExit);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (selectedDate < today) {
    showToast('Exit date cannot be in the past', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/gatepasses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: appState.currentUser.id,
        reason,
        destination,
        dateOfExit,
        returnTime
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      showToast(data.error || 'Failed to submit request', 'error');
      return;
    }
    
    showToast(`Gate pass request submitted! Pass ID: ${data.gatePass.passId}`, 'success');
    document.getElementById('gate-pass-form').reset();
    showStudentDashboard();
  } catch (error) {
    console.error('Error submitting request:', error);
    showToast('Failed to submit request', 'error');
  }
}

async function viewDigitalPass(passId) {
  try {
    const response = await fetch(`${API_URL}/gatepasses/${passId}`);
    const pass = await response.json();
    
    if (!response.ok || pass.status !== 'approved') {
      showToast('Pass not found or not approved', 'error');
      return;
    }
    
    // Populate pass details
    document.getElementById('pass-student-name').textContent = pass.studentName;
    document.getElementById('pass-roll-number').textContent = pass.rollNumber;
    document.getElementById('pass-department').textContent = pass.department;
    document.getElementById('pass-id').textContent = pass.passId;
    document.getElementById('pass-reason').textContent = pass.reason;
    document.getElementById('pass-destination').textContent = pass.destination;
    document.getElementById('pass-date-time').textContent = formatDateTime(pass.dateOfExit, pass.returnTime);
    document.getElementById('pass-approved-by').textContent = pass.approvedBy;
    
    const approvalDate = new Date(pass.approvedDate);
    document.getElementById('pass-approval-date').textContent = formatDateTime(approvalDate);
    
    showPage('digital-pass');
  } catch (error) {
    console.error('Error fetching pass:', error);
    showToast('Failed to load pass', 'error');
  }
}

function printPass() {
  const passElement = document.getElementById('digital-pass');
  if (!passElement) {
    showToast('No digital pass found to print', 'error');
    return;
  }

  const printContents = passElement.innerHTML;
  const originalContents = document.body.innerHTML;

  document.body.innerHTML = printContents;
  window.print();
  document.body.innerHTML = originalContents;
  showStudentDashboard();
}
// ================================
// Global Function Exports
// ================================
window.printPass = printPass;
window.showHodDashboard = showHodDashboard;
window.approveRequest = approveRequest;
window.rejectRequest = rejectRequest;
window.submitWithRemarks = submitWithRemarks;
window.closeRemarksModal = closeRemarksModal;
window.showSecurityDashboard = showSecurityDashboard;
window.markEntry = markEntry;
window.markExit = markExit;
window.clearSearch = clearSearch;
window.closeModal = closeModal;
window.showRemarks = showRemarks;
window.showPage = showPage;

console.log('Smart Gate Pass Management System initialized');
console.log('Connected to API at:', API_URL);



// ================================
// HOD Functions
// ================================

async function showHodDashboard() {
  if (!appState.isLoggedIn || appState.currentRole !== 'hod') {
    showPage('landing-page');
    return;
  }
  
  const user = appState.currentUser;
  
  // Update header
  document.getElementById('hod-welcome').textContent = `Welcome, ${user.name}`;
  document.getElementById('hod-details').textContent = `Department: ${user.department}`;
  
  try {
    // Fetch department passes
    const response = await fetch(`${API_URL}/gatepasses/department/${user.department}`);
    const gatePasses = await response.json();
    
    // Update stats
    const pendingRequests = gatePasses.filter(p => p.status === 'pending').length;
    const approvedRequests = gatePasses.filter(p => p.status === 'approved').length;
    const rejectedRequests = gatePasses.filter(p => p.status === 'rejected').length;
    
    const today = new Date().toISOString().split('T')[0];
    const todayActivity = gatePasses.filter(p => 
      p.approvedDate && p.approvedDate.startsWith(today)
    ).length;
    
    document.getElementById('hod-pending-requests').textContent = pendingRequests;
    document.getElementById('hod-approved-requests').textContent = approvedRequests;
    document.getElementById('hod-rejected-requests').textContent = rejectedRequests;
    document.getElementById('hod-today-activity').textContent = todayActivity;
    
    // Update pending requests and activity
    updatePendingRequests(gatePasses.filter(p => p.status === 'pending'));
    updateHodActivity(gatePasses.filter(p => p.status !== 'pending'));
    
    showPage('hod-dashboard');
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showToast('Failed to load dashboard', 'error');
  }
}

function updatePendingRequests(pendingPasses) {
  const container = document.getElementById('pending-requests-container');
  
  if (pendingPasses.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">✅</div>
        <h3>No Pending Requests</h3>
        <p>All gate pass requests have been processed</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = pendingPasses.map(pass => `
    <div class="request-card">
      <div class="request-card-header">
        <div class="student-info">
          <h4>${pass.studentName}</h4>
          <p>Roll: ${pass.rollNumber} | ${pass.department}</p>
        </div>
        <div class="request-date">
          Submitted: ${formatDateTime(pass.submittedDate)}
        </div>
      </div>
      
      <div class="request-details">
        <div class="detail-row">
          <span class="label">Reason:</span>
          <span class="value">${pass.reason}</span>
        </div>
        <div class="detail-row">
          <span class="label">Destination:</span>
          <span class="value">${pass.destination}</span>
        </div>
        <div class="detail-row">
          <span class="label">Exit Date:</span>
          <span class="value">${formatDateTime(pass.dateOfExit, pass.returnTime)}</span>
        </div>
      </div>
      
      <div class="request-actions">
        <button class="btn btn--success btn--sm" onclick="approveRequest('${pass.passId}')">✓ Approve</button>
        <button class="btn btn--danger btn--sm" onclick="rejectRequest('${pass.passId}')">✗ Reject</button>
      </div>
    </div>
  `).join('');
}

function updateHodActivity(processedPasses) {
  const tbody = document.querySelector('#hod-activity-table tbody');
  
  if (processedPasses.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center">
          <div class="empty-state">
            <div class="empty-state-icon">📊</div>
            <h3>No Activity Yet</h3>
            <p>Processed requests will appear here</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  const sortedPasses = processedPasses.sort((a, b) => 
    new Date(b.approvedDate || b.submittedDate) - new Date(a.approvedDate || a.submittedDate)
  );
  
  tbody.innerHTML = sortedPasses.map(pass => `
    <tr>
      <td>${pass.studentName}</td>
      <td>${pass.rollNumber}</td>
      <td>${pass.reason}</td>
      <td><span class="status-badge ${pass.status}">${pass.status.toUpperCase()}</span></td>
      <td>${pass.approvedDate ? formatDateTime(pass.approvedDate) : '-'}</td>
    </tr>
  `).join('');
}

async function approveRequest(passId) {
  try {
    const response = await fetch(`${API_URL}/gatepasses/${passId}/approve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approvedBy: appState.currentUser.name,
        hodRemarks: 'Approved'
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      showToast(data.error || 'Failed to approve', 'error');
      return;
    }
    
    showToast(`Request ${passId} approved successfully`, 'success');
    showHodDashboard();
  } catch (error) {
    console.error('Error approving request:', error);
    showToast('Failed to approve request', 'error');
  }
}

function rejectRequest(passId) {
  appState.pendingAction = { type: 'reject', passId };
  document.getElementById('remarks-text').value = '';
  document.getElementById('remarks-modal').classList.add('active');
}

async function submitWithRemarks() {
  const remarks = document.getElementById('remarks-text').value.trim();
  
  if (!remarks) {
    showToast('Please provide remarks for rejection', 'error');
    return;
  }
  
  const passId = appState.pendingAction.passId;
  
  try {
    const response = await fetch(`${API_URL}/gatepasses/${passId}/reject`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approvedBy: appState.currentUser.name,
        hodRemarks: remarks
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      showToast(data.error || 'Failed to reject', 'error');
      return;
    }
    
    showToast(`Request ${passId} rejected`, 'info');
    closeRemarksModal();
    showHodDashboard();
  } catch (error) {
    console.error('Error rejecting request:', error);
    showToast('Failed to reject request', 'error');
  }
}

function closeRemarksModal() {
  document.getElementById('remarks-modal').classList.remove('active');
  appState.pendingAction = null;
}

// ================================
// Security Functions
// ================================

async function showSecurityDashboard() {
  if (!appState.isLoggedIn || appState.currentRole !== 'security') {
    showPage('landing-page');
    return;
  }
  
  const user = appState.currentUser;
  
  document.getElementById('security-welcome').textContent = `Welcome, ${user.name}`;
  
  try {
    // Fetch logs
    const response = await fetch(`${API_URL}/logs`);
    const logs = await response.json();
    
    // Calculate stats
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = logs.filter(log => 
      log.entryTime && log.entryTime.startsWith(today)
    ).length;
    
    const todayExits = logs.filter(log => 
      log.exitTime && log.exitTime.startsWith(today)
    ).length;
    
    const currentlyOut = logs.filter(log => 
      log.entryTime && !log.exitTime
    ).length;
    
    document.getElementById('today-entries').textContent = todayEntries;
    document.getElementById('today-exits').textContent = todayExits;
    document.getElementById('currently-out').textContent = currentlyOut;
    
    updateEntryExitTable(logs);
    showPage('security-dashboard');
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showToast('Failed to load dashboard', 'error');
  }
}

async function handleValidation(event) {
  event.preventDefault();
  
  const searchInput = document.getElementById('search-input').value.trim();
  
  if (!searchInput) {
    showToast('Please enter roll number or pass ID', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/search/${searchInput}`);
    const pass = await response.json();
    
    await displayValidationResult(pass, searchInput);
  } catch (error) {
    console.error('Search error:', error);
    showToast('Search failed', 'error');
  }
}

async function displayValidationResult(pass, searchInput) {
  const resultContainer = document.getElementById('validation-result');
  
  if (!pass) {
    resultContainer.innerHTML = `
      <div class="validation-card invalid">
        <div class="validation-header">
          <h4>✖ Invalid Pass</h4>
          <span class="validation-status invalid">NOT FOUND</span>
        </div>
        <p>No approved gate pass found for "${searchInput}"</p>
      </div>
    `;
    return;
  }
  
  if (pass.status !== 'approved') {
    resultContainer.innerHTML = `
      <div class="validation-card invalid">
        <div class="validation-header">
          <h4>✖ Invalid Pass</h4>
          <span class="validation-status invalid">NOT APPROVED</span>
        </div>
        <p>Pass ${pass.passId} is ${pass.status}</p>
        ${pass.status === 'rejected' ? `<p><strong>Reason:</strong> ${pass.hodRemarks}</p>` : ''}
      </div>
    `;
    return;
  }
  
  // Get or create log
  try {
    const logResponse = await fetch(`${API_URL}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passId: pass.passId })
    });
    
    const log = await logResponse.json();
    const hasEntered = !!log.entryTime;
    const hasExited = !!log.exitTime;
    
    resultContainer.innerHTML = `
      <div class="validation-card valid">
        <div class="validation-header">
          <h4>✅ Valid Pass</h4>
          <span class="validation-status valid">APPROVED</span>
        </div>
        
        <div class="pass-info">
          <div class="info-row">
            <span class="label">Student Name:</span>
            <span class="value">${pass.studentName}</span>
          </div>
          <div class="info-row">
            <span class="label">Roll Number:</span>
            <span class="value">${pass.rollNumber}</span>
          </div>
          <div class="info-row">
            <span class="label">Department:</span>
            <span class="value">${pass.department}</span>
          </div>
          <div class="info-row">
            <span class="label">Reason:</span>
            <span class="value">${pass.reason}</span>
          </div>
          <div class="info-row">
            <span class="label">Destination:</span>
            <span class="value">${pass.destination}</span>
          </div>
          <div class="info-row">
            <span class="label">Exit Date:</span>
            <span class="value">${formatDateTime(pass.dateOfExit, pass.returnTime)}</span>
          </div>
          ${hasEntered ? `
            <div class="info-row">
              <span class="label">Entry Time:</span>
              <span class="value">${formatDateTime(log.entryTime)}</span>
            </div>
          ` : ''}
          ${hasExited ? `
            <div class="info-row">
              <span class="label">Exit Time:</span>
              <span class="value">${formatDateTime(log.exitTime)}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="validation-actions">
          ${!hasEntered ? 
            `<button class="btn btn--success" onclick="markEntry('${pass.passId}')">🚪 Mark Entry</button>` :
            !hasExited ?
              `<button class="btn btn--primary" onclick="markExit('${pass.passId}')">🚶 Mark Exit</button>` :
              `<span class="status-badge approved">COMPLETED</span>`
          }
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error fetching log:', error);
  }
}

async function markEntry(passId) {
  try {
    const response = await fetch(`${API_URL}/logs/${passId}/entry`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markedBy: appState.currentUser.name })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      showToast(data.error || 'Failed to mark entry', 'error');
      return;
    }
    
    showToast('Entry marked successfully', 'success');
    
    // Re-search to refresh display
    const searchInput = document.getElementById('search-input').value;
    const searchResponse = await fetch(`${API_URL}/search/${searchInput}`);
    const pass = await searchResponse.json();
    await displayValidationResult(pass, searchInput);
    
    showSecurityDashboard();
  } catch (error) {
    console.error('Error marking entry:', error);
    showToast('Failed to mark entry', 'error');
  }
}

async function markExit(passId) {
  try {
    const response = await fetch(`${API_URL}/logs/${passId}/exit`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      showToast(data.error || 'Failed to mark exit', 'error');
      return;
    }
    
    showToast('Exit marked successfully', 'success');
    
    // Re-search to refresh display
    const searchInput = document.getElementById('search-input').value;
    const searchResponse = await fetch(`${API_URL}/search/${searchInput}`);
    const pass = await searchResponse.json();
    await displayValidationResult(pass, searchInput);
    
    showSecurityDashboard();
  } catch (error) {
    console.error('Error marking exit:', error);
    showToast('Failed to mark exit', 'error');
  }
}

function clearSearch() {
  document.getElementById('search-input').value = '';
  document.getElementById('validation-result').innerHTML = '';
}

function updateEntryExitTable(logs) {
  const tbody = document.querySelector('#entry-exit-table tbody');
  
  if (logs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center">
          <div class="empty-state">
            <div class="empty-state-icon">📝</div>
            <h3>No Entry/Exit Records</h3>
            <p>Entry and exit logs will appear here</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  const sortedLogs = logs
    .filter(log => log.entryTime || log.exitTime)
    .sort((a, b) => {
      const aTime = a.exitTime || a.entryTime;
      const bTime = b.exitTime || b.entryTime;
      return new Date(bTime) - new Date(aTime);
    });
  
  tbody.innerHTML = sortedLogs.map(log => {
    let status = 'In Progress';
    let statusClass = 'pending';
    
    if (log.entryTime && log.exitTime) {
      status = 'Completed';
      statusClass = 'approved';
    } else if (log.entryTime) {
      status = 'Out';
      statusClass = 'warning';
    }
    
    return `
      <tr>
        <td>${log.studentName}</td>
        <td>${log.rollNumber}</td>
        <td>${log.department}</td>
        <td>${log.entryTime ? formatDateTime(log.entryTime) : '-'}</td>
        <td>${log.exitTime ? formatDateTime(log.exitTime) : '-'}</td>
        <td><span class="status-badge ${statusClass}">${status}</span></td>
      </tr>
    `;
  }).join('');
}

// ================================
// Modal Functions
// ================================

function closeModal() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.classList.remove('active');
  });
}

// ================================
// Event Listeners
// ================================

document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
  }
  
  const gatePassForm = document.getElementById('gate-pass-form');
  if (gatePassForm) {
    gatePassForm.addEventListener('submit', handleGatePassRequest);
  }
  
  const validationForm = document.getElementById('validation-form');
  if (validationForm) {
    validationForm.addEventListener('submit', handleValidation);
  }
  
  document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
      closeModal();
    }
  });
  
  showPage('landing-page');
});

// ================================
// Global Functions
// ================================

window.showLogin = showLogin;
window.showSignup = showSignup;
window.logout = logout;
window.showStudentDashboard = showStudentDashboard;
window.showRequestForm = showRequestForm;
window.viewDigitalPass = viewDigitalPass;
window.print