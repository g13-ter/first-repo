console.log('Full-Stack App loaded');

let currentUser = null;
const STORAGE_KEY = 'ipt_demo_v1';

const DEFAULT_ADMIN_ACCOUNT = {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    password: 'Password123',
    role: 'admin',
    verified: true
};

window.db = {
    accounts: [],
    employees: [],
    departments: [],
    requests: []
};

const PROTECTED_ROUTES = ['profile', 'employees', 'accounts', 'departments', 'requests'];
const ADMIN_ROUTES = ['employees', 'accounts', 'departments'];
const ROLE_LABELS = {
    admin: 'Admin',
    employee: 'Employee',
    user: 'User'
};
const formatRoleLabel = role => ROLE_LABELS[role] || 'User';

function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const data = JSON.parse(raw);
            if (
                data &&
                Array.isArray(data.accounts) &&
                Array.isArray(data.employees) &&
                Array.isArray(data.departments) &&
                Array.isArray(data.requests)
            ) {
                window.db = data;
                if (ensureDefaultAdminAccount()) {
                    saveToStorage();
                }
                return;
            }
        }
    } catch (error) {
        console.warn('Storage parse error; seeding defaults', error);
    }

    window.db = {
        accounts: [{ ...DEFAULT_ADMIN_ACCOUNT }],
        employees: [],
        departments: [
            { name: 'Engineering', description: 'Software team' },
            { name: 'HR', description: 'Human Resources' }
        ],
        requests: []
    };
    saveToStorage();
}

function ensureDefaultAdminAccount() {
    if (!Array.isArray(window.db.accounts)) {
        window.db.accounts = [];
    }
    const existing = window.db.accounts.find(acc => acc.email === DEFAULT_ADMIN_ACCOUNT.email);
    if (!existing) {
        window.db.accounts.unshift({ ...DEFAULT_ADMIN_ACCOUNT });
        return true;
    }

    let updated = false;
    if (existing.role !== 'admin') {
        existing.role = 'admin';
        updated = true;
    }
    if (!existing.verified) {
        existing.verified = true;
        updated = true;
    }
    if (existing.password !== DEFAULT_ADMIN_ACCOUNT.password) {
        existing.password = DEFAULT_ADMIN_ACCOUNT.password;
        updated = true;
    }
    return updated;
}

function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

function saveDB() {
    saveToStorage();
}

const getEl = id => document.getElementById(id);
const getValue = id => {
    const el = getEl(id);
    return el ? el.value : '';
};
const setValue = (id, value) => {
    const el = getEl(id);
    if (el) el.value = value;
};
const setText = (id, text) => {
    const el = getEl(id);
    if (el) el.textContent = text;
};
const setChecked = (id, state) => {
    const el = getEl(id);
    if (el) el.checked = !!state;
};
const resetForm = id => {
    const form = getEl(id);
    if (form) form.reset();
};
const findAccount = email => window.db.accounts.find(acc => acc.email === email);

let toastContainer = null;
function ensureToastContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = 2000;
        document.body.appendChild(toastContainer);
    }
}

function showToast(message, type = 'info') {
    ensureToastContainer();
    const map = {
        success: 'text-bg-success',
        danger: 'text-bg-danger',
        warning: 'text-bg-warning',
        info: 'text-bg-info'
    };
    const cls = map[type] || 'text-bg-secondary';
    const toast = document.createElement('div');
    toast.className = `toast align-items-center ${cls}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>`;
    toastContainer.appendChild(toast);
    const bootstrapToast = new bootstrap.Toast(toast, { delay: 2500 });
    bootstrapToast.show();
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
}

function markInvalid(el) {
    if (!el) return;
    el.classList.add('is-invalid');
    el.addEventListener('input', () => el.classList.remove('is-invalid'), { once: true });
}

function navigateTo(hash) {
    console.log('navigateTo called with:', hash);
    window.location.hash = hash;
}

function handleRouting() {
    const hash = window.location.hash || '#/';
    let route = hash.substring(2);
    console.log('handleRouting - hash:', hash, 'route:', route);
    
    if (route === 'verify-email') route = 'verify';

    window.scrollTo(0, 0);

    if (PROTECTED_ROUTES.includes(route) && !currentUser) {
        console.log('Protected route, redirecting to login');
        if (hash !== '#/login') {
            window.location.hash = '#/login';
        }
        return;
    }

    if (ADMIN_ROUTES.includes(route) && currentUser && currentUser.role !== 'admin') {
        showToast('Admin access required', 'danger');
        if (hash !== '#/') {
            window.location.hash = '#/';
        }
        return;
    }

    console.log('Removing active class from all pages');
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    const pageId = route || 'home';
    const pageElement = getEl(`${pageId}-page`);

    if (pageElement) {
        pageElement.classList.add('active');
        
        if (pageId === 'employees') loadEmployees();
        if (pageId === 'accounts') loadAccounts();
        if (pageId === 'departments') loadDepartments();
        if (pageId === 'requests') loadRequests();
        if (pageId === 'profile') loadProfile();
        if (pageId === 'verify') loadVerify();
    } else {
        const homePage = getEl('home-page');
        if (homePage) {
            homePage.classList.add('active');
        }
    }
}

function setAuthState(isAuth, user = null) {
    currentUser = user;

    if (isAuth) {
        document.body.classList.remove('not-authenticated');
        document.body.classList.add('authenticated');
        if (user && user.role === 'admin') {
            document.body.classList.add('is-admin');
        } else {
            document.body.classList.remove('is-admin');
        }
        setText('username', formatRoleLabel(user.role));
    } else {
        document.body.classList.remove('authenticated', 'is-admin');
        document.body.classList.add('not-authenticated');
    }
}

function checkAuth() {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const account = findAccount(token);
    if (account && account.verified) {
        setAuthState(true, account);
    } else {
        localStorage.removeItem('auth_token');
    }
}

function handleRegister(event) {
    event.preventDefault();

    const firstName = getValue('regFirstName');
    const lastName = getValue('regLastName');
    const email = getValue('regEmail');
    const password = getValue('regPassword');

    if (password.length < 6) {
        markInvalid(getEl('regPassword'));
        showToast('Password must be at least 6 characters', 'warning');
        return;
    }

    if (findAccount(email)) {
        markInvalid(getEl('regEmail'));
        showToast('Email already registered', 'warning');
        return;
    }

    const newAccount = {
        firstName,
        lastName,
        email,
        password,
        role: 'user',
        verified: false
    };

    window.db.accounts.push(newAccount);
    saveDB();

    localStorage.setItem('unverified_email', email);
    showToast('Please verify your email.', 'info');
    navigateTo('#/verify');
}

function simulateVerification() {
    const email = localStorage.getItem('unverified_email');
    if (!email) {
        showToast('No pending verification', 'warning');
        return;
    }

    const account = findAccount(email);
    if (account) {
        account.verified = true;
        saveDB();
        localStorage.removeItem('unverified_email');
        showToast('Email verified! You can now login.', 'success');
        navigateTo('#/login');
    }
}

function loadVerify() {
    const email = localStorage.getItem('unverified_email');
    setText('verifyEmail', email || 'No pending verification');
}

function handleLogin(event) {
    event.preventDefault();

    const email = getValue('loginEmail');
    const password = getValue('loginPassword');
    const account = findAccount(email);

    if (!account || account.password !== password) {
        markInvalid(getEl('loginEmail'));
        markInvalid(getEl('loginPassword'));
        showToast('Invalid email or password', 'danger');
        return;
    }

    if (!account.verified) {
        markInvalid(getEl('loginEmail'));
        showToast('Account not verified by an admin yet', 'warning');
        return;
    }

    localStorage.setItem('auth_token', email);
    setAuthState(true, account);
    showToast('Welcome back!', 'success');
    navigateTo('#/profile');
}

function logout() {
    localStorage.removeItem('auth_token');
    setAuthState(false);
    showToast('Logged out', 'info');
    navigateTo('#/');
}

function loadProfile() {
    if (!currentUser) return;

    setText('profileName', `${currentUser.firstName} ${currentUser.lastName}`);
    setText('profileEmail', currentUser.email);
    setText('profileRole', formatRoleLabel(currentUser.role));
    cancelEditProfile();
}

function startEditProfile() {
    if (!currentUser) return;

    setValue('editFirstName', currentUser.firstName);
    setValue('editLastName', currentUser.lastName);
    setValue('editEmail', currentUser.email);
     setValue('editPassword', currentUser.password);
    const formCard = getEl('editProfileCard');
    if (formCard) formCard.style.display = 'block';
}

function cancelEditProfile() {
    const formCard = getEl('editProfileCard');
    if (formCard) formCard.style.display = 'none';
    resetForm('editProfileForm');
}

function saveProfile(event) {
    event.preventDefault();
    if (!currentUser) return;

    const newEmail = getValue('editEmail');

    if (newEmail !== currentUser.email && findAccount(newEmail)) {
        markInvalid(getEl('editEmail'));
        showToast('Email already in use', 'warning');
        return;
    }

    const updated = {
        ...currentUser,
        firstName: getValue('editFirstName'),
        lastName: getValue('editLastName'),
        email: newEmail
    };

    const newPassword = getValue('editPassword');
        if (!newPassword) return;

        if (newPassword.length < 6) {
            showToast('password must be at 6 characters', 'warning');
            return;
        }

    const index = window.db.accounts.findIndex(acc => acc.email === currentUser.email);
    if (index !== -1) {
        window.db.accounts[index] = { ...window.db.accounts[index], ...updated };
        saveDB();
    }

    currentUser = updated;
    localStorage.setItem('auth_token', updated.email);
    loadProfile();
    setText('username', formatRoleLabel(updated.role));
    cancelEditProfile();
    showToast('Profile updated!', 'success');
}

let editingEmployeeId = null;
let count = 1;

function toggleEmployeeForm() {
    const form = getEl('employeeFormDiv');
    if (!form) return;
    const isHidden = form.style.display === 'none';
    form.style.display = isHidden ? 'block' : 'none';
    
    if (!isHidden) {
        editingEmployeeId = null;
        resetForm('employeeForm');
        setText('empFormTitle', 'Add Employee');

        const nextId = 'EMP-' + String(count).padStart(3, '0');
        setValue('empId', nextId);
        getEl('empId').readOnly = true;
        count++;
    }
}

function renderEmployeesTable() {
    const table = getEl('employeesTable');
    if (!table) return;

    if (window.db.employees.length === 0) {
        table.innerHTML = '<tr><td colspan="5" class="text-center">No employees.</td></tr>';
        return;
    }

    table.innerHTML = window.db.employees
        .map(emp => {
            const dept = window.db.departments.find(d => d.name === emp.dept);
            const deptName = dept ? dept.name : emp.dept;
            return `
                <tr>
                    <td>${emp.id}</td>
                    <td>${emp.email}</td>
                    <td>${emp.position}</td>
                    <td>${deptName}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="editEmployee('${emp.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteEmployee('${emp.id}')">Delete</button>
                    </td>
                </tr>`;
        })
        .join('');
}

function editEmployee(id) {
    const emp = window.db.employees.find(e => e.id === id);
    if (!emp) return;

    setValue('empId', emp.id);
    setValue('empEmail', emp.email);
    setValue('empPosition', emp.position);
    setValue('empDept', emp.dept);
    setValue('empDate', emp.hireDate);

    editingEmployeeId = id;
    setText('empFormTitle', 'Edit Employee');
    
    getEl('empId').readOnly = true;
    
    const form = getEl('employeeFormDiv');
    if (form) form.style.display = 'block';
}

function loadEmployees() {
    const deptSelect = getEl('empDept');
    if (deptSelect) {
        deptSelect.innerHTML = window.db.departments
            .map(dept => `<option value="${dept.name}">${dept.name}</option>`)
            .join('');
    }
    renderEmployeesTable();
}

function handleEmployeeForm(event) {
    event.preventDefault();

    const email = getValue('empEmail');
    
    if (!findAccount(email)) {
        markInvalid(getEl('empEmail'));
        showToast('User email must match an existing account', 'warning');
        return;
    }

    const formData = {
        id: getValue('empId'),
        email,
        position: getValue('empPosition'),
        dept: getValue('empDept'),
        hireDate: getValue('empDate')
    };

    if (editingEmployeeId) {
        const index = window.db.employees.findIndex(e => e.id === editingEmployeeId);
        if (index !== -1) {
            window.db.employees[index] = formData;
        }
        editingEmployeeId = null;
    } else {
        window.db.employees.unshift(formData);
    }
    
    saveDB();

    resetForm('employeeForm');
    toggleEmployeeForm();
    renderEmployeesTable();
    showToast('Employee saved', 'success');
}

function deleteEmployee(id) {
    if (!confirm(`Delete employee ${id}?`)) return;
    window.db.employees = window.db.employees.filter(emp => emp.id !== id);
    saveDB();
    renderEmployeesTable();
    showToast('Employee deleted', 'success');
}

let editingAccountEmail = null;

function toggleAccountForm() {
    const form = getEl('accountFormDiv');
    if (!form) return;
    const isHidden = form.style.display === 'none';
    form.style.display = isHidden ? 'block' : 'none';

    if (!isHidden) {
        editingAccountEmail = null;
        resetForm('accountForm');
        setText('accFormTitle', 'Add Account');
    }
}

function renderAccountsList() {
    const table = getEl('accountsTable');
    if (!table) return;

    if (window.db.accounts.length === 0) {
        table.innerHTML = '<tr><td colspan="5" class="text-center">No accounts.</td></tr>';
        return;
    }

    table.innerHTML = window.db.accounts
        .map(acc => {
            const encodedEmail = encodeURIComponent(acc.email);
            const verifiedClass = acc.verified ? 'active' : '';
            const verifiedText = acc.verified ? 'Verified' : 'Verify';
            const ariaPressed = acc.verified ? 'true' : 'false';
            const roleLabel = formatRoleLabel(acc.role);
            return `
        <tr>
            <td>${acc.firstName} ${acc.lastName}</td>
            <td>${acc.email}</td>
            <td>${roleLabel}</td>
            <td>
                <button type="button" class="verify-toggle ${verifiedClass}" aria-pressed="${ariaPressed}" onclick="toggleAccountVerified('${encodedEmail}')">
                    <span class="verify-dot"></span>${verifiedText}
                </button>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editAccount('${acc.email}')">Edit</button>
                <button class="btn btn-sm btn-warning" onclick="resetPassword('${acc.email}')">Reset Password</button>
                <button class="btn btn-sm btn-danger" onclick="deleteAccount('${acc.email}')">Delete</button>
            </td>
        </tr>`;
        })
        .join('');
}

function loadAccounts() {
    renderAccountsList();
}

function editAccount(email) {
    const account = findAccount(email);
    if (!account) return;

    setValue('accFirstName', account.firstName);
    setValue('accLastName', account.lastName);
    setValue('accEmail', account.email);
    setValue('accPassword', account.password);
    setValue('accRole', account.role);
    setChecked('accVerified', account.verified);

    editingAccountEmail = email;
    setText('accFormTitle', 'Edit Account');
    const form = getEl('accountFormDiv');
    if (form) form.style.display = 'block';
}

function resetPassword(email) {
    const newPassword = prompt('Enter new password (min 6 characters):');
    if (!newPassword) return;

    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters', 'warning');
        return;
    }

    const account = findAccount(email);
    if (account) {
        account.password = newPassword;
        saveDB();
        showToast('Password reset successfully', 'success');
    }
}

function deleteAccount(email) {
    if (currentUser && currentUser.email === email) {
        showToast('You cannot delete your own account', 'danger');
        return;
    }

    if (!confirm(`Delete account ${email}?`)) return;

    window.db.accounts = window.db.accounts.filter(acc => acc.email !== email);
    saveDB();
    renderAccountsList();
    showToast('Account deleted', 'success');
}

function handleAccountForm(event) {
    event.preventDefault();

    const formData = {
        firstName: getValue('accFirstName'),
        lastName: getValue('accLastName'),
        email: getValue('accEmail'),
        password: getValue('accPassword'),
        role: getValue('accRole'),
        verified: getEl('accVerified') ? getEl('accVerified').checked : false
    };

    if (editingAccountEmail) {
        const index = window.db.accounts.findIndex(acc => acc.email === editingAccountEmail);
        if (index !== -1) {
            window.db.accounts[index] = { ...window.db.accounts[index], ...formData };
        }
        editingAccountEmail = null;
    } else {
        window.db.accounts.unshift(formData);
    }

    saveDB();
    resetForm('accountForm');
    toggleAccountForm();
    renderAccountsList();
    showToast('Account saved', 'success');
}

function toggleAccountVerified(encodedEmail) {
    const email = decodeURIComponent(encodedEmail);
    const account = findAccount(email);
    if (!account) {
        showToast('Account not found', 'danger');
        return;
    }

    account.verified = !account.verified;
    saveDB();
    renderAccountsList();

    if (!account.verified && currentUser && currentUser.email === account.email) {
        logout();
        showToast('Account marked unverified. Logged out.', 'warning');
        return;
    }

    showToast(account.verified ? 'Account verified' : 'Verification removed', account.verified ? 'success' : 'info');
}

let editingDeptName = null;
function toggleDepartmentForm() {
    const form = getEl('departmentFormDiv');
    if (!form) return;
    const isHidden = form.style.display === 'none';
    form.style.display = isHidden ? 'block' : 'none';
    if (!isHidden) {
        editingDeptName = null;
        resetForm('departmentForm');
         setText('deptFormTitle', 'Add Department');
    }
}

function loadDepartments() {
    const table = getEl('departmentsTable');
    if (!table) return;

    if (window.db.departments.length === 0) {
        table.innerHTML = '<tr><td colspan="3" class="text-center">No departments.</td></tr>';
    } else {
        table.innerHTML = window.db.departments
            .map(dept => `
            <tr>
                <td>${dept.name}</td>
                <td>${dept.description}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editDepartment('${dept.name}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteDepartment('${dept.name}')">Delete</button>
                </td>
            </tr>`)
            .join('');
    }
}

function editDepartment(name) {
    const dept = window.db.departments.find(d => d.name === name);
    if (!dept) return;

    setValue('deptName', dept.name);
    setValue('deptDesc', dept.description);
    
    editingDeptName = name;
    setText('deptFormTitle', 'Edit Department');

    const form = getEl('departmentFormDiv');
    if (form) form.style.display = 'block';
}

function handleDepartmentForm(event) {
    event.preventDefault();

    const formData = {
        name: getValue('deptName'),
        description: getValue('deptDesc')
    };

    if (editingDeptName) {
        const index = window.db.departments.findIndex(d => d.name === editingDeptName);
        if (index !== -1) {
            window.db.departments[index] = formData;
        }
        editingDeptName = null;
    } else {
        window.db.departments.unshift(formData);
    }

    saveDB();

    resetForm('departmentForm');
    toggleDepartmentForm();
    loadDepartments();
    showToast('Department saved', 'success');
}

function deleteDepartment(name) {
    const hasEmployees = window.db.employees.some(emp => emp.dept === name);
    if (hasEmployees) {
        showToast(`Cannot delete ${name}: Department has employees.`, 'danger');
        return;
    }

    if (!confirm(`Delete ${name} department?`)) return;

    window.db.departments = window.db.departments.filter(dept => dept.name !== name);
    saveDB();
    loadDepartments();
    showToast('Department deleted', 'success');
}

let requestModalInstance = null;

function openRequestModal() {
    if (!requestModalInstance) {
        const modalEl = getEl('requestModal');
        requestModalInstance = new bootstrap.Modal(modalEl);
    }

    const typeSel = getEl('requestType');
    if (typeSel && typeSel.tagName === 'SELECT') {
        typeSel.selectedIndex = 0;
    } else if (typeSel) {
        typeSel.value = '';
    }

    const container = getEl('requestItems');
    if (container) container.innerHTML = '';
    addRequestItem();
    requestModalInstance.show();
}

function addRequestItem() {
    const container = getEl('requestItems');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'input-group mb-2';
    row.innerHTML = `
        <input type="text" class="form-control" placeholder="Item name">
        <input type="number" class="form-control" style="max-width: 90px;" value="1" min="1">
        <button class="btn btn-outline-danger" type="button" onclick="removeRequestItem(this)"></button>`;
    container.appendChild(row);
}

function removeRequestItem(button) {
    button.parentElement.remove();
}

function submitRequest() {
    const type = getValue('requestType');
    const itemsContainer = getEl('requestItems');
    const rows = itemsContainer ? Array.from(itemsContainer.children) : [];

    if (!type || rows.length === 0) {
        showToast('Please add a type and at least one item.', 'warning');
        return;
    }

    const items = rows.map(row => {
        const [nameInput, qtyInput] = row.querySelectorAll('input');
        return {
            name: nameInput.value || 'Item',
            qty: Number(qtyInput.value || 1)
        };
    });

    if (!currentUser) {
        showToast('You must be logged in to submit a request.', 'warning');
        return;
    }

    window.db.requests.push({
        type,
        items,
        status: 'Pending',
        date: new Date().toISOString(),
        employeeEmail: currentUser.email
    });
    saveDB();

    if (requestModalInstance) {
        requestModalInstance.hide();
    }

    loadRequests();
    showToast('Request submitted', 'success');
}

function loadRequests() {
    const table = getEl('requestsTable');
    const body = getEl('requestsTableBody');
    const noText = getEl('noRequestsText');
    const createBtn = getEl('createRequestBtn');

    const email = currentUser ? currentUser.email : null;
    const myRequests = email ? window.db.requests.filter(r => r.employeeEmail === email) : [];

    if (!table || !body || !noText || !createBtn) return;

    if (myRequests.length === 0) {
        table.style.display = 'none';
        noText.style.display = 'block';
        createBtn.style.display = 'inline-block';
        body.innerHTML = '';
        return;
    }

    noText.style.display = 'none';
    createBtn.style.display = 'none';
    table.style.display = 'table';

    const toBadge = status => {
        const normalized = (status || 'Pending').toLowerCase();
        const cls = normalized === 'approved' ? 'success' : normalized === 'rejected' ? 'danger' : 'warning';
        const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);
        return `<span class="badge bg-${cls}">${label}</span>`;
    };

    body.innerHTML = myRequests
        .map(req => {
            const itemsStr = Array.isArray(req.items)
                ? req.items
                      .map(item => (typeof item === 'string' ? item : `${item.name} x${item.qty}`))
                      .join(', ')
                : '';
            const dateStr = req.date ? new Date(req.date).toLocaleString() : '';
            return `
                <tr>
                    <td>${req.type}</td>
                    <td>${itemsStr}</td>
                    <td>${toBadge(req.status)}</td>
                    <td>${dateStr}</td>
                </tr>`;
        })
        .join('');
}

function initForms() {
    const registerForm = getEl('registerForm');
    if (registerForm) registerForm.addEventListener('submit', handleRegister);

    const loginForm = getEl('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const editProfileForm = getEl('editProfileForm');
    if (editProfileForm) editProfileForm.addEventListener('submit', saveProfile);

    const employeeForm = getEl('employeeForm');
    if (employeeForm) employeeForm.addEventListener('submit', handleEmployeeForm);

    const accountForm = getEl('accountForm');
    if (accountForm) accountForm.addEventListener('submit', handleAccountForm);

    const departmentForm = getEl('departmentForm');
    if (departmentForm) departmentForm.addEventListener('submit', handleDepartmentForm);
}

document.addEventListener('DOMContentLoaded', () => {
    localStorage.removeItem('auth_token');

    loadFromStorage();
    initForms();

    window.addEventListener('hashchange', () => {
        handleRouting();
    });
    
    if (!window.location.hash) {
        window.location.hash = '#/';
    }
    handleRouting();
});
