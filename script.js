// ====================================================================
// 1. GLOBAL DATA & CONSTANTS
// ====================================================================
const OWNER_ID = 9999;
let loggedInUser = null;
let employeesDatabase = [];
let shopsDatabase = [];
let timeEntriesDatabase = [];
let ownerSettings = {};

// Initial data for the Owner and Imali Randima (Full Access Manager)
// This data will be used to populate Firestore on the very first run.
const INITIAL_DATA = {
    settings: {
        id: 'owner',
        companyName: 'TimeTrack Pro',
        ownerUsername: 'owner',
        profilePhoto: '',
    },
    employees: [
        { id: OWNER_ID, name: 'System Owner', username: 'owner', password: 'Owner@123', role: 'Owner', shopId: 0, fullAccess: true, profilePhoto: '' },
        { id: 1004, name: 'Imali Randima', username: 'imalirandima', password: 'Imali@123', role: 'Manager', shopId: 0, fullAccess: true, profilePhoto: '' },
    ],
    shops: [],
    timeEntries: [],
};

// ====================================================================
// 2. FIREBASE DATA PERSISTENCE (CRUD Wrappers)
// ====================================================================

/**
 * Fetches all data from Firestore.
 */
async function loadData() {
    try {
        if (!window.db) {
            console.error("Firebase not initialized. Check index.html script module.");
            return;
        }

        // 1. Load Settings
        const settingsSnap = await getDocs(collection(db, "settings"));
        if (settingsSnap.empty) {
            // Initialize with default settings if empty
            await setDoc(doc(db, "settings", "owner"), INITIAL_DATA.settings);
            ownerSettings = INITIAL_DATA.settings;
        } else {
            ownerSettings = settingsSnap.docs[0].data();
        }

        // 2. Load Employees
        const employeesSnap = await getDocs(collection(db, "employees"));
        if (employeesSnap.empty) {
            // Initialize with default employees if empty
            for (const emp of INITIAL_DATA.employees) {
                await setDoc(doc(db, "employees", emp.id.toString()), emp);
            }
            employeesDatabase = employeesSnap.docs.map(doc => doc.data());
        } else {
            employeesDatabase = employeesSnap.docs.map(doc => doc.data());
        }

        // 3. Load Shops
        const shopsSnap = await getDocs(collection(db, "shops"));
        shopsDatabase = shopsSnap.docs.map(doc => doc.data());

        // 4. Load Time Entries
        const entriesSnap = await getDocs(collection(db, "timeEntries"));
        timeEntriesDatabase = entriesSnap.docs.map(doc => doc.data());

    } catch (error) {
        console.error("Error loading data from Firestore:", error);
        showAlert("Error loading data. Check console for details.", 'danger');
    }
}

/**
 * Saves a single document to a Firestore collection.
 * @param {string} collectionName 
 * @param {string} docId 
 * @param {object} data 
 */
async function saveDocument(collectionName, docId, data) {
    try {
        await setDoc(doc(db, collectionName, docId), data);
        return true;
    } catch (error) {
        console.error(`Error saving document to ${collectionName}:`, error);
        showAlert(`Error saving data to ${collectionName}.`, 'danger');
        return false;
    }
}

/**
 * Deletes a single document from a Firestore collection.
 * @param {string} collectionName 
 * @param {string} docId 
 */
async function deleteDocument(collectionName, docId) {
    try {
        await deleteDoc(doc(db, collectionName, docId));
        return true;
    } catch (error) {
        console.error(`Error deleting document from ${collectionName}:`, error);
        showAlert(`Error deleting data from ${collectionName}.`, 'danger');
        return false;
    }
}

// ====================================================================
// 3. AUTHENTICATION & SESSION MANAGEMENT (Using Firebase Auth)
// ====================================================================

/**
 * Simulates Firebase Auth login since we are not using email/password.
 * We find the user by username and then set the session.
 */
async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const alertEl = document.getElementById('loginAlert');

    await loadData(); // Ensure latest data is loaded

    const user = employeesDatabase.find(
        emp => emp.username === username && emp.password === password
    );

    if (user) {
        loggedInUser = user;
        sessionStorage.setItem('loggedInUser', JSON.stringify(user));
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        renderAllUI();
    } else {
        alertEl.textContent = 'Invalid username or password.';
        alertEl.style.display = 'block';
    }
}

function checkLoginStatus() {
    const sessionUser = sessionStorage.getItem('loggedInUser');
    if (sessionUser) {
        loggedInUser = JSON.parse(sessionUser);
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        renderAllUI();
    } else {
        document.getElementById('loginPage').style.display = 'grid';
        document.getElementById('mainApp').style.display = 'none';
    }
}

function logout() {
    sessionStorage.removeItem('loggedInUser');
    loggedInUser = null;
    checkLoginStatus();
    // Clear all inputs on logout
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    showAlert('You have been logged out successfully.', 'success');
}

async function changePassword(event) {
    event.preventDefault();
    const currentPass = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmNewPassword').value;

    if (newPass !== confirmPass) {
        showAlert('New passwords do not match.', 'danger');
        return;
    }

    if (currentPass !== loggedInUser.password) {
        showAlert('Current password is incorrect.', 'danger');
        return;
    }

    // Update in database
    const empIndex = employeesDatabase.findIndex(emp => emp.id === loggedInUser.id);
    if (empIndex !== -1) {
        employeesDatabase[empIndex].password = newPass;
        const success = await saveDocument('employees', loggedInUser.id.toString(), employeesDatabase[empIndex]);
        if (success) {
            // Update session
            loggedInUser.password = newPass;
            sessionStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
            showAlert('Password changed successfully!', 'success');
            document.getElementById('changePasswordForm').reset();
        }
    }
}

// ====================================================================
// 4. INITIALIZATION & UI RENDERING
// ====================================================================
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    updateCompanyBranding();
    updateClock();
    setInterval(updateClock, 1000);
    checkLoginStatus();
});

function updateCompanyBranding() {
    document.getElementById('loginCompanyName').textContent = ownerSettings.companyName;
    document.getElementById('headerCompanyName').textContent = ownerSettings.companyName;
    document.getElementById('companyNameWatermark').textContent = `© ${ownerSettings.companyName}`;
}

async function renderAllUI() {
    await loadData(); // Always load latest data before rendering
    updateRoleBasedUI();
    populateDropdowns();
    renderEmployeeTable();
    renderShopsTable();
    renderStatusTable();
    renderManagerList();
    updateReportPreview();
    updateOwnerSettingsUI();
    updateManagerSettingsUI();
    updateDashboard();
}

function updateRoleBasedUI() {
    const isOwner = loggedInUser && loggedInUser.id === OWNER_ID;
    const isFullAccess = loggedInUser && loggedInUser.fullAccess;
    const shopsTab = document.getElementById('shopsTab');
    const shopsTabContent = document.getElementById('shopsTabContent');
    const timeClockCard = document.getElementById('timeClockCard');
    const fullAccessDashboard = document.getElementById('fullAccessDashboard');

    // Tabs visibility
    shopsTab.style.display = isOwner ? 'flex' : 'none';
    if (!isOwner && shopsTabContent.classList.contains('active')) {
        switchTab('dashboard');
    }

    // Dashboard content
    timeClockCard.style.display = isFullAccess ? 'none' : 'block';
    fullAccessDashboard.style.display = isFullAccess ? 'grid' : 'none';

    // User Info
    document.getElementById('dropdownUserName').textContent = loggedInUser.name;
    document.getElementById('dropdownUserRole').textContent = loggedInUser.role + (loggedInUser.fullAccess ? ' (Full Access)' : '');
    
    // Update avatar
    const photoData = loggedInUser.id === OWNER_ID ? ownerSettings.profilePhoto : loggedInUser.profilePhoto;
    updateHeaderAvatar(photoData);
}

function updateHeaderAvatar(photoData) {
    const avatarEl = document.getElementById('userAvatar');
    const defaultIcon = '<i class="fas fa-user"></i>';
    
    if (photoData && photoData.length > 10) {
        avatarEl.innerHTML = `<img src="${photoData}" alt="Profile Photo">`;
    } else {
        avatarEl.innerHTML = defaultIcon;
    }
}

function updateDashboard() {
    const isFullAccess = loggedInUser && loggedInUser.fullAccess;
    if (isFullAccess) {
        renderFullAccessDashboard();
    } else {
        // Standard Manager/Staff Dashboard
        const employeeId = parseInt(document.getElementById('employeeSelect').value);
        if (employeeId) {
            updateClockActionButtons(employeeId);
        }
    }
}

async function renderFullAccessDashboard() {
    // 1. Shop Performance Overview (Current Week)
    const statsContainer = document.getElementById('shopPerformanceStats');
    statsContainer.innerHTML = '';

    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))); // Monday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

    const filteredEntries = timeEntriesDatabase.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= startOfWeek && entryDate <= endOfWeek;
    });

    let totalWorkHours = 0;
    let totalBreakHours = 0;
    let totalWeekendHours = 0;
    const employeesWorked = new Set();

    filteredEntries.forEach(entry => {
        const { workHours, breakHours, weekendHours } = calculateTimeMetrics(entry);
        totalWorkHours += workHours;
        totalBreakHours += breakHours;
        totalWeekendHours += weekendHours;
        employeesWorked.add(entry.employeeId);
    });

    const stats = [
        { label: 'Total Work (hrs)', value: totalWorkHours.toFixed(2), color: 'var(--primary)' },
        { label: 'Total Break (hrs)', value: totalBreakHours.toFixed(2), color: 'var(--info)' },
        { label: 'Total Weekend (hrs)', value: totalWeekendHours.toFixed(2), color: 'var(--danger)' },
        { label: 'Employees Worked', value: employeesWorked.size, color: 'var(--success)' },
    ];

    stats.forEach(stat => {
        statsContainer.innerHTML += `
            <div class="stat-box">
                <div class="stat-number" style="color: ${stat.color};">${stat.value}</div>
                <div class="stat-label">${stat.label}</div>
            </div>
        `;
    });

    // 2. Recent Time Entries
    const recentEntriesBody = document.querySelector('#recentEntriesTable tbody');
    recentEntriesBody.innerHTML = '';

    const sortedEntries = filteredEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);

    sortedEntries.forEach(entry => {
        recentEntriesBody.innerHTML += `
            <tr>
                <td>${getEmployeeName(entry.employeeId)}</td>
                <td>${getShopName(entry.shopId)}</td>
                <td>${new Date(entry.timestamp).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</td>
                <td>${entry.action}</td>
            </tr>
        `;
    });
}

function populateDropdowns() {
    const employeeSelect = document.getElementById('employeeSelect');
    const manualEmployeeSelect = document.getElementById('manualEmployeeSelect');
    const reportShopSelect = document.getElementById('reportShopSelect');
    const employeeShopSelect = document.getElementById('employeeShop');
    const shopManagerSelect = document.getElementById('shopManager');

    // Clear existing options
    [employeeSelect, manualEmployeeSelect, reportShopSelect, employeeShopSelect, shopManagerSelect].forEach(select => select.innerHTML = '');

    // Employee Dropdowns (Time Entry, Manual Entry)
    // All managers can see all employees for time entry
    const allEmployees = employeesDatabase.filter(emp => emp.role === 'Staff');
    
    employeeSelect.innerHTML += '<option value="">Select Employee</option>';
    manualEmployeeSelect.innerHTML += '<option value="">Select Employee</option>';
    
    allEmployees.forEach(emp => {
        const option = `<option value="${emp.id}">${emp.name} (${getShopName(emp.shopId)})</option>`;
        employeeSelect.innerHTML += option;
        manualEmployeeSelect.innerHTML += option;
    });

    // Shop Dropdowns
    reportShopSelect.innerHTML += '<option value="0">All Shops</option>';
    employeeShopSelect.innerHTML += '<option value="">Select Shop</option>';
    shopManagerSelect.innerHTML += '<option value="0">Unassigned</option>';

    shopsDatabase.forEach(shop => {
        reportShopSelect.innerHTML += `<option value="${shop.id}">${shop.name}</option>`;
        employeeShopSelect.innerHTML += `<option value="${shop.id}">${shop.name}</option>`;
    });

    // Manager Dropdown (for Shop Assignment)
    const managers = employeesDatabase.filter(emp => emp.role === 'Manager');
    managers.forEach(manager => {
        const isAssigned = shopsDatabase.some(shop => shop.managerId === manager.id);
        if (!isAssigned) {
            shopManagerSelect.innerHTML += `<option value="${manager.id}">${manager.name}</option>`;
        }
    });
}

function updateOwnerSettingsUI() {
    const isOwner = loggedInUser && loggedInUser.id === OWNER_ID;
    const ownerCard = document.getElementById('ownerSettingsCard');
    const changePassCard = document.getElementById('changePasswordCard');
    
    if (isOwner) {
        ownerCard.style.display = 'block';
        changePassCard.style.gridColumn = '2 / 3';
        document.getElementById('ownerCompanyName').value = ownerSettings.companyName;
        document.getElementById('ownerUsername').value = ownerSettings.ownerUsername;
        document.getElementById('ownerProfilePhotoBase64').value = ownerSettings.profilePhoto;
        updatePhotoPreview(ownerSettings.profilePhoto, 'owner');
    } else {
        ownerCard.style.display = 'none';
        changePassCard.style.gridColumn = '1 / -1';
    }
}

function updateManagerSettingsUI() {
    const isManager = loggedInUser && loggedInUser.role === 'Manager';
    const managerCard = document.getElementById('managerSettingsCard');
    
    if (isManager) {
        managerCard.style.display = 'block';
        document.getElementById('managerName').value = loggedInUser.name;
        document.getElementById('managerUsername').value = loggedInUser.username;
        document.getElementById('managerProfilePhotoBase64').value = loggedInUser.profilePhoto || '';
        updatePhotoPreview(loggedInUser.profilePhoto, 'manager');
    } else {
        managerCard.style.display = 'none';
    }
}

function updatePhotoPreview(data, role) {
    const previewId = role === 'owner' ? 'profilePhotoPreview' : 'managerProfilePhotoPreview';
    const defaultPhoto = 'https://via.placeholder.com/100?text=' + (role === 'owner' ? 'Owner' : 'Manager');
    
    const photoUrl = data && data.length > 10 ? data : defaultPhoto;

    const preview = document.getElementById(previewId);
    if (preview) preview.src = photoUrl;
    
    if (loggedInUser && loggedInUser.role.toLowerCase() === role) {
        updateHeaderAvatar(photoUrl);
    }
}

// ====================================================================
// 5. TIME & DATE UTILITIES
// ====================================================================

function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateString = now.toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const liveClockEl = document.getElementById('liveClock');
    const currentDateEl = document.getElementById('currentDate');
    
    if (liveClockEl) liveClockEl.textContent = timeString;
    if (currentDateEl) currentDateEl.textContent = dateString;
}

function formatDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

// ====================================================================
// 6. CLOCK ACTION & MANUAL ENTRY
// ====================================================================

async function handleClockAction(action) {
    const employeeId = parseInt(document.getElementById('employeeSelect').value);
    if (!employeeId) {
        showAlert('Please select an employee.', 'warning');
        return;
    }

    const employee = employeesDatabase.find(emp => emp.id === employeeId);
    const now = new Date();
    const timestamp = now.toISOString();
    const date = formatDate(now);

    const newEntry = {
        id: Date.now(),
        employeeId: employeeId,
        shopId: employee.shopId,
        date: date,
        timestamp: timestamp,
        action: action,
        status: action === 'in' ? 'Present' : (action === 'breakStart' ? 'Break' : (action === 'breakEnd' ? 'Present' : 'Absent')),
        recordedBy: loggedInUser.name,
    };

    // Update employee status
    employee.status = newEntry.status;
    employee.lastAction = action;
    employee.lastTimestamp = timestamp;

    // Save to Firestore
    const entrySuccess = await saveDocument('timeEntries', newEntry.id.toString(), newEntry);
    const empSuccess = await saveDocument('employees', employee.id.toString(), employee);

    if (entrySuccess && empSuccess) {
        showAlert(`${employee.name} has successfully clocked ${action.toUpperCase()} at ${now.toLocaleTimeString('en-AU')}.`, 'success');
        await renderAllUI();
    }
}

function updateClockActionButtons(employeeId) {
    const employee = employeesDatabase.find(emp => emp.id === employeeId);
    const status = employee ? employee.status : 'Absent';

    document.getElementById('clockInBtn').style.display = status === 'Absent' ? 'block' : 'none';
    document.getElementById('breakStartBtn').style.display = status === 'Present' ? 'block' : 'none';
    document.getElementById('breakEndBtn').style.display = status === 'Break' ? 'block' : 'none';
    document.getElementById('clockOutBtn').style.display = status === 'Present' || status === 'Break' ? 'block' : 'none';
}

function openManualEntryModal() {
    document.getElementById('manualEntryModal').classList.add('active');
    document.getElementById('manualEntryForm').reset();
    setManualDateToToday();
}

function setManualDateToToday() {
    document.getElementById('manualDate').value = formatDate(new Date());
}

async function submitManualEntry(event) {
    event.preventDefault();
    const employeeId = parseInt(document.getElementById('manualEmployeeSelect').value);
    const date = document.getElementById('manualDate').value;
    const timeIn = document.getElementById('manualTimeIn').value;
    const timeOut = document.getElementById('manualTimeOut').value;
    const breakDuration = parseInt(document.getElementById('manualBreakDuration').value);

    if (!employeeId || !date || !timeIn || !timeOut) {
        showAlert('Please fill in all fields.', 'warning');
        return;
    }

    const employee = employeesDatabase.find(emp => emp.id === employeeId);
    const timestampIn = new Date(`${date}T${timeIn}:00`).toISOString();
    const timestampOut = new Date(`${date}T${timeOut}:00`).toISOString();

    const newEntry = {
        id: Date.now(),
        employeeId: employeeId,
        shopId: employee.shopId,
        date: date,
        timestampIn: timestampIn,
        timestampOut: timestampOut,
        breakDuration: breakDuration, // in minutes
        recordedBy: loggedInUser.name,
        isManual: true,
    };

    // Save to Firestore
    const success = await saveDocument('timeEntries', newEntry.id.toString(), newEntry);

    if (success) {
        showAlert(`Manual entry for ${employee.name} submitted successfully.`, 'success');
        closeModal('manualEntryModal');
        await renderAllUI();
    }
}

// ====================================================================
// 7. EMPLOYEE CRUD
// ====================================================================

function openAddEmployeeModal(empId = null) {
    const modal = document.getElementById('addEmployeeModal');
    const title = document.getElementById('employeeModalTitle');
    const form = document.getElementById('employeeForm');
    const employeeRoleGroup = document.getElementById('employeeRoleGroup');
    const employeeShopGroup = document.getElementById('employeeShopGroup');
    const managerFields = document.getElementById('managerFields');
    const isOwner = loggedInUser.id === OWNER_ID;
    const isFullAccessManager = loggedInUser.fullAccess && loggedInUser.id !== OWNER_ID;

    form.reset();
    document.getElementById('employeeId').value = '';
    managerFields.style.display = 'none';
    document.getElementById('employeeFullAccess').checked = false;

    if (empId) {
        title.textContent = 'Edit Employee';
        const employee = employeesDatabase.find(emp => emp.id === empId);
        document.getElementById('employeeId').value = employee.id;
        document.getElementById('employeeName').value = employee.name;
        document.getElementById('employeeRole').value = employee.role;
        document.getElementById('employeeShop').value = employee.shopId;

        if (employee.role === 'Manager') {
            managerFields.style.display = 'block';
            document.getElementById('employeeUsername').value = employee.username;
            document.getElementById('employeePassword').value = employee.password;
            document.getElementById('employeeFullAccess').checked = employee.fullAccess || false;
        }
    } else {
        title.textContent = 'Add New Employee';
    }

    // Role and Shop visibility based on logged-in user
    if (isOwner || isFullAccessManager) {
        // Owner/Full Access Manager can set role and shop
        employeeRoleGroup.style.display = 'block';
        employeeShopGroup.style.display = 'block';
        document.getElementById('employeeRole').disabled = false;
        document.getElementById('employeeShop').disabled = false;
        document.getElementById('fullAccessGroup').style.display = isOwner ? 'block' : 'none';
    } else {
        // Standard Manager can only add Staff to their shop
        employeeRoleGroup.style.display = 'none';
        employeeShopGroup.style.display = 'none';
        document.getElementById('employeeRole').value = 'Staff';
        document.getElementById('employeeShop').value = loggedInUser.shopId;
    }

    modal.classList.add('active');
}

function toggleManagerFields() {
    const role = document.getElementById('employeeRole').value;
    const managerFields = document.getElementById('managerFields');
    managerFields.style.display = role === 'Manager' ? 'block' : 'none';
}

async function saveEmployee(event) {
    event.preventDefault();
    const id = document.getElementById('employeeId').value;
    const name = document.getElementById('employeeName').value;
    let role = document.getElementById('employeeRole').value;
    let shopId = parseInt(document.getElementById('employeeShop').value);
    let username = '';
    let password = '';
    let fullAccess = false;

    const isOwner = loggedInUser.id === OWNER_ID;
    const isFullAccessManager = loggedInUser.fullAccess && loggedInUser.id !== OWNER_ID;

    // Logic for Standard Manager adding Staff
    if (!isOwner && !isFullAccessManager) {
        role = 'Staff';
        shopId = loggedInUser.shopId;
    }

    if (role === 'Manager') {
        username = document.getElementById('employeeUsername').value;
        password = document.getElementById('employeePassword').value;
        fullAccess = document.getElementById('employeeFullAccess').checked;
        if (!username || !password) {
            showAlert('Manager accounts require a username and password.', 'warning');
            return;
        }
    }

    let employeeData = {
        id: id ? parseInt(id) : getNextId(employeesDatabase),
        name: name,
        username: username,
        password: password,
        role: role,
        shopId: shopId,
        fullAccess: fullAccess,
        status: 'Absent',
        profilePhoto: '',
    };

    // Check for duplicate username
    const isDuplicate = employeesDatabase.some(emp => emp.username === username && emp.id !== employeeData.id && username !== '');
    if (isDuplicate) {
        showAlert('Username already exists. Please choose a different one.', 'danger');
        return;
    }

    // Save to Firestore
    const success = await saveDocument('employees', employeeData.id.toString(), employeeData);

    if (success) {
        showAlert(`Employee ${id ? 'updated' : 'added'} successfully.`, 'success');
        closeModal('addEmployeeModal');
        await renderAllUI();
    }
}

async function deleteEmployee(empId) {
    if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) return;

    const employee = employeesDatabase.find(emp => emp.id === empId);
    if (employee.role === 'Owner') {
        showAlert('The System Owner cannot be deleted.', 'danger');
        return;
    }

    // Delete from Firestore
    const success = await deleteDocument('employees', empId.toString());

    if (success) {
        showAlert('Employee deleted successfully.', 'success');
        await renderAllUI();
    }
}

function renderEmployeeTable() {
    const tableBody = document.querySelector('#employeeTable tbody');
    tableBody.innerHTML = '';

    const isOwner = loggedInUser.id === OWNER_ID;
    const isFullAccessManager = loggedInUser.fullAccess && loggedInUser.id !== OWNER_ID;

    let filteredEmployees = employeesDatabase.filter(emp => emp.id !== OWNER_ID);

    // Standard Manager filter
    if (loggedInUser.role === 'Manager' && !loggedInUser.fullAccess) {
        filteredEmployees = filteredEmployees.filter(emp => emp.shopId === loggedInUser.shopId);
    }

    filteredEmployees.forEach(emp => {
        const isManager = emp.role === 'Manager';
        const isDeletable = emp.id !== OWNER_ID;
        const isEditable = isOwner || isFullAccessManager || (loggedInUser.role === 'Manager' && emp.shopId === loggedInUser.shopId);

        let statusClass = 'status-absent';
        if (emp.status === 'Present') statusClass = 'status-present';
        if (emp.status === 'Break') statusClass = 'status-break';

        tableBody.innerHTML += `
            <tr>
                <td>${emp.id}</td>
                <td>${emp.name} ${emp.fullAccess ? '<span class="full-access-badge">FULL ACCESS</span>' : ''}</td>
                <td>${emp.username || 'N/A'}</td>
                <td>${emp.role}</td>
                <td>${getShopName(emp.shopId)}</td>
                <td><span class="status-badge ${statusClass}">${emp.status}</span></td>
                <td>
                    ${isEditable ? `<button class="btn btn-info btn-small" onclick="openAddEmployeeModal(${emp.id})"><i class="fas fa-edit"></i> Edit</button>` : ''}
                    ${isDeletable ? `<button class="btn btn-danger btn-small" onclick="deleteEmployee(${emp.id})"><i class="fas fa-trash"></i> Delete</button>` : ''}
                </td>
            </tr>
        `;
    });
}

// ====================================================================
// 8. SHOP CRUD
// ====================================================================

function openAddShopModal(shopId = null) {
    if (loggedInUser.id !== OWNER_ID) return; // Only Owner can manage shops

    const modal = document.getElementById('addShopModal');
    const title = document.getElementById('shopModalTitle');
    const form = document.getElementById('shopForm');

    form.reset();
    document.getElementById('shopId').value = '';
    document.getElementById('shopManager').innerHTML = '<option value="0">Unassigned</option>';
    populateDropdowns(); // Repopulate manager list

    if (shopId) {
        title.textContent = 'Edit Shop';
        const shop = shopsDatabase.find(s => s.id === shopId);
        document.getElementById('shopId').value = shop.id;
        document.getElementById('shopName').value = shop.name;
        
        // Add current manager back to the list if assigned
        if (shop.managerId !== 0) {
            const manager = employeesDatabase.find(emp => emp.id === shop.managerId);
            if (manager) {
                document.getElementById('shopManager').innerHTML += `<option value="${manager.id}">${manager.name}</option>`;
                document.getElementById('shopManager').value = shop.managerId;
            }
        }
    } else {
        title.textContent = 'Add New Shop';
    }

    modal.classList.add('active');
}

async function saveShop(event) {
    event.preventDefault();
    const id = document.getElementById('shopId').value;
    const name = document.getElementById('shopName').value;
    const managerId = parseInt(document.getElementById('shopManager').value);

    let shopData = {
        id: id ? parseInt(id) : getNextId(shopsDatabase),
        name: name,
        managerId: managerId,
    };

    // Save to Firestore
    const success = await saveDocument('shops', shopData.id.toString(), shopData);

    if (success) {
        showAlert(`Shop ${id ? 'updated' : 'added'} successfully.`, 'success');
        closeModal('addShopModal');
        await renderAllUI();
    }
}

async function deleteShop(shopId) {
    if (!confirm('Are you sure you want to delete this shop? All employees assigned to this shop will become unassigned.')) return;

    // Unassign employees
    const employeesToUpdate = employeesDatabase.filter(emp => emp.shopId === shopId);
    for (const emp of employeesToUpdate) {
        emp.shopId = 0;
        await saveDocument('employees', emp.id.toString(), emp);
    }

    // Delete from Firestore
    const success = await deleteDocument('shops', shopId.toString());

    if (success) {
        showAlert('Shop deleted successfully.', 'success');
        await renderAllUI();
    }
}

function renderShopsTable() {
    const tableBody = document.querySelector('#shopsTable tbody');
    tableBody.innerHTML = '';

    shopsDatabase.forEach(shop => {
        const manager = employeesDatabase.find(emp => emp.id === shop.managerId);
        const managerName = manager ? manager.name : 'Unassigned';

        tableBody.innerHTML += `
            <tr>
                <td>${shop.id}</td>
                <td>${shop.name}</td>
                <td>${managerName}</td>
                <td>
                    <button class="btn btn-info btn-small" onclick="openAddShopModal(${shop.id})"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-danger btn-small" onclick="deleteShop(${shop.id})"><i class="fas fa-trash"></i> Delete</button>
                </td>
            </tr>
        `;
    });
}

function renderManagerList() {
    const managerListEl = document.getElementById('managerList');
    if (!managerListEl) return;
    managerListEl.innerHTML = '';

    const managers = employeesDatabase.filter(emp => emp.role === 'Manager');

    managers.forEach(manager => {
        const shop = shopsDatabase.find(s => s.managerId === manager.id);
        const shopName = shop ? shop.name : 'Unassigned';
        const fullAccessBadge = manager.fullAccess ? '<span class="full-access-badge">FULL ACCESS</span>' : '';

        managerListEl.innerHTML += `
            <div class="manager-item">
                <div class="manager-info">
                    <strong>${manager.name}</strong> ${fullAccessBadge}
                    <span>Username: ${manager.username}</span>
                    <span>Shop: ${shopName}</span>
                </div>
                <button class="btn btn-warning btn-small" onclick="toggleFullAccess(${manager.id}, ${manager.fullAccess})">
                    <i class="fas fa-user-shield"></i> ${manager.fullAccess ? 'Revoke Access' : 'Grant Access'}
                </button>
            </div>
        `;
    });
}

async function toggleFullAccess(managerId, currentStatus) {
    const manager = employeesDatabase.find(emp => emp.id === managerId);
    if (!manager) return;

    manager.fullAccess = !currentStatus;

    // Save to Firestore
    const success = await saveDocument('employees', manager.id.toString(), manager);

    if (success) {
        showAlert(`Full Access for ${manager.name} ${manager.fullAccess ? 'granted' : 'revoked'} successfully.`, 'success');
        await renderAllUI();
    }
}

// ====================================================================
// 9. REPORTING
// ====================================================================

function calculateTimeMetrics(entry) {
    if (entry.isManual) {
        const timeIn = new Date(entry.timestampIn);
        const timeOut = new Date(entry.timestampOut);
        const durationMs = timeOut - timeIn;
        const totalMinutes = durationMs / (1000 * 60);
        const breakMinutes = entry.breakDuration || 0;
        const workMinutes = totalMinutes - breakMinutes;
        const workHours = workMinutes / 60;
        const breakHours = breakMinutes / 60;

        let weekendHours = 0;
        let currentDate = new Date(timeIn);
        while (currentDate <= timeOut) {
            const day = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
            if (day === 0 || day === 6) {
                // Simple approximation: if the entry spans a weekend day, count the whole work duration as weekend work.
                // For a more precise calculation, we would need to track time segments.
                weekendHours = workHours; 
                break;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return { workHours, breakHours, weekendHours };
    }
    
    // Logic for clock actions (more complex, requires pairing)
    return { workHours: 0, breakHours: 0, weekendHours: 0 };
}

async function generateReport() {
    const reportType = document.getElementById('reportType').value;
    const shopId = parseInt(document.getElementById('reportShopSelect').value);
    const dateInput = document.getElementById('reportDate').value;

    if (!dateInput) {
        showAlert('Please select a date/period for the report.', 'warning');
        return;
    }

    const reportData = [];
    let totalWorkHours = 0;
    let totalBreakHours = 0;
    let totalWeekendHours = 0;
    const employeesReported = new Set();

    // Filter time entries based on report type and date
    const filteredEntries = timeEntriesDatabase.filter(entry => {
        const entryDate = new Date(entry.date);
        const filterDate = new Date(dateInput);

        if (shopId !== 0 && entry.shopId !== shopId) return false;

        if (reportType === 'daily') {
            return entry.date === dateInput;
        } else if (reportType === 'weekly') {
            // Check if entry date falls within the week of the filter date
            const startOfWeek = new Date(filterDate.setDate(filterDate.getDate() - filterDate.getDay() + (filterDate.getDay() === 0 ? -6 : 1)));
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            return entryDate >= startOfWeek && entryDate <= endOfWeek;
        } else if (reportType === 'monthly') {
            return entryDate.getMonth() === filterDate.getMonth() && entryDate.getFullYear() === filterDate.getFullYear();
        }
        return false;
    });

    // Process manual entries (for simplicity, we only report manual entries for now)
    const manualEntries = filteredEntries.filter(entry => entry.isManual);

    manualEntries.forEach(entry => {
        const { workHours, breakHours, weekendHours } = calculateTimeMetrics(entry);
        totalWorkHours += workHours;
        totalBreakHours += breakHours;
        totalWeekendHours += weekendHours;
        employeesReported.add(entry.employeeId);

        reportData.push({
            employee: getEmployeeName(entry.employeeId),
            shop: getShopName(entry.shopId),
            date: entry.date,
            clockIn: new Date(entry.timestampIn).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
            clockOut: new Date(entry.timestampOut).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
            breakHours: breakHours.toFixed(2),
            workHours: workHours.toFixed(2),
            weekendHours: weekendHours.toFixed(2),
        });
    });

    // Render report
    const reportTableBody = document.querySelector('#reportTable tbody');
    reportTableBody.innerHTML = '';
    reportData.forEach(row => {
        reportTableBody.innerHTML += `
            <tr>
                <td>${row.employee}</td>
                <td>${row.shop}</td>
                <td>${row.date}</td>
                <td>${row.clockIn}</td>
                <td>${row.clockOut}</td>
                <td>${row.breakHours}</td>
                <td>${row.workHours}</td>
                <td>${row.weekendHours}</td>
            </tr>
        `;
    });

    // Update summary stats
    const statsContainer = document.getElementById('reportSummaryStats');
    statsContainer.innerHTML = '';
    const stats = [
        { label: 'Total Work (hrs)', value: totalWorkHours.toFixed(2), color: 'var(--primary)' },
        { label: 'Total Break (hrs)', value: totalBreakHours.toFixed(2), color: 'var(--info)' },
        { label: 'Total Weekend (hrs)', value: totalWeekendHours.toFixed(2), color: 'var(--danger)' },
        { label: 'Employees Reported', value: employeesReported.size, color: 'var(--success)' },
    ];
    stats.forEach(stat => {
        statsContainer.innerHTML += `
            <div class="stat-box">
                <div class="stat-number" style="color: ${stat.color};">${stat.value}</div>
                <div class="stat-label">${stat.label}</div>
            </div>
        `;
    });

    showAlert(`Report generated for ${reportType} starting ${dateInput}.`, 'success');
}

function exportReport(type) {
    const table = document.getElementById('reportTable');
    if (table.rows.length <= 1) {
        showAlert('No data to export. Please generate a report first.', 'warning');
        return;
    }

    const filename = `TimeTrack_Report_${formatDate(new Date())}`;

    if (type === 'pdf') {
        const element = document.getElementById('reportTable');
        html2pdf().from(element).set({
            margin: 1,
            filename: `${filename}.pdf`,
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'landscape', unit: 'in', format: 'letter' }
        }).save();
    } else if (type === 'excel') {
        const ws = XLSX.utils.table_to_sheet(table);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        XLSX.writeFile(wb, `${filename}.xlsx`);
    }
}

// ====================================================================
// 10. UI/UX UTILITIES
// ====================================================================

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-tabs li').forEach(li => li.classList.remove('active'));

    document.getElementById(`${tabName}Tab`).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

function toggleDropdown() {
    document.getElementById('userDropdown').classList.toggle('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showAlert(message, type) {
    const alertEl = document.getElementById('appAlert');
    alertEl.textContent = message;
    alertEl.className = `alert alert-${type}`;
    alertEl.style.display = 'flex';
    setTimeout(() => {
        alertEl.style.display = 'none';
    }, 5000);
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling;
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

async function saveOwnerSettings(event) {
    event.preventDefault();
    const companyName = document.getElementById('ownerCompanyName').value;
    const ownerUsername = document.getElementById('ownerUsername').value;
    const profilePhoto = document.getElementById('ownerProfilePhotoBase64').value;

    // Update settings object
    ownerSettings.companyName = companyName;
    ownerSettings.ownerUsername = ownerUsername;
    ownerSettings.profilePhoto = profilePhoto;

    // Update Owner employee record (username only)
    const ownerEmp = employeesDatabase.find(emp => emp.id === OWNER_ID);
    ownerEmp.username = ownerUsername;

    // Save to Firestore
    const settingsSuccess = await saveDocument('settings', 'owner', ownerSettings);
    const empSuccess = await saveDocument('employees', OWNER_ID.toString(), ownerEmp);

    if (settingsSuccess && empSuccess) {
        showAlert('Company and Owner settings saved successfully!', 'success');
        // Update session
        loggedInUser.username = ownerUsername;
        sessionStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
        renderAllUI();
    }
}

async function saveManagerSettings(event) {
    event.preventDefault();
    const newName = document.getElementById('managerName').value;
    const newUsername = document.getElementById('managerUsername').value;
    const newProfilePhoto = document.getElementById('managerProfilePhotoBase64').value;

    // Update in database
    const managerIndex = employeesDatabase.findIndex(emp => emp.id === loggedInUser.id);
    if (managerIndex !== -1) {
        employeesDatabase[managerIndex].name = newName;
        employeesDatabase[managerIndex].username = newUsername;
        employeesDatabase[managerIndex].profilePhoto = newProfilePhoto;
        const success = await saveDocument('employees', loggedInUser.id.toString(), employeesDatabase[managerIndex]);
        
        if (success) {
            // Update session
            loggedInUser.name = newName;
            loggedInUser.username = newUsername;
            loggedInUser.profilePhoto = newProfilePhoto;
            sessionStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
            
            showAlert('Profile settings saved successfully!', 'success');
            renderAllUI();
        }
    }
}

function getNextId(db) {
    const maxId = db.reduce((max, item) => Math.max(max, item.id), 0);
    return maxId + 1;
}

function getShopName(shopId) {
    if (shopId === 0) return 'System-Wide';
    const shop = shopsDatabase.find(s => s.id === shopId);
    return shop ? shop.name : 'Unassigned';
}

function getEmployeeName(empId) {
    const employee = employeesDatabase.find(e => e.id === empId);
    return employee ? employee.name : 'N/A';
}

function handlePhotoUpload(event, role) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Image = e.target.result;
        if (role === 'owner') {
            document.getElementById('ownerProfilePhotoBase64').value = base64Image;
            updatePhotoPreview(base64Image, 'owner');
        } else if (role === 'manager') {
            document.getElementById('managerProfilePhotoBase64').value = base64Image;
            updatePhotoPreview(base64Image, 'manager');
        }
    };
    reader.readAsDataURL(file);
}

// Attach event listeners for tab switching
document.querySelectorAll('.nav-tabs li').forEach(tab => {
    tab.addEventListener('click', () => {
        switchTab(tab.getAttribute('data-tab'));
    });
});

// Attach event listener for employee selection change
document.getElementById('employeeSelect').addEventListener('change', (e) => {
    const employeeId = parseInt(e.target.value);
    if (employeeId) {
        updateClockActionButtons(employeeId);
    } else {
        // Hide all buttons if no employee is selected
        document.getElementById('clockInBtn').style.display = 'none';
        document.getElementById('breakStartBtn').style.display = 'none';
        document.getElementById('breakEndBtn').style.display = 'none';
        document.getElementById('clockOutBtn').style.display = 'none';
    }
});

// Attach event listener for manual entry modal closing
document.getElementById('manualEntryModal').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeModal('manualEntryModal');
    }
});

// Attach event listener for login form submission
document.getElementById('loginForm').addEventListener('submit', handleLogin);

// Attach event listener for owner settings form submission
document.getElementById('ownerSettingsForm').addEventListener('submit', saveOwnerSettings);

// Attach event listener for manager settings form submission
document.getElementById('managerSettingsForm').addEventListener('submit', saveManagerSettings);

// Attach event listener for password change form submission
document.getElementById('changePasswordForm').addEventListener('submit', changePassword);

// Attach event listener for report type change
document.getElementById('reportType').addEventListener('change', generateReport);

// Attach event listener for report shop change
document.getElementById('reportShopSelect').addEventListener('change', generateReport);

// Attach event listener for report date change
document.getElementById('reportDate').addEventListener('change', generateReport);

// Attach event listener for dropdown closing on outside click
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('userDropdown');
    const userInfo = document.querySelector('.user-info');
    if (dropdown && userInfo && !userInfo.contains(e.target) && dropdown.classList.contains('active')) {
        dropdown.classList.remove('active');
    }
});
