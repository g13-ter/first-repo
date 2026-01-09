console.log('Full-Stack App loaded');

let currentUser = null;

window.db = {
    accounts: JSON.parse(localStorage.getItem('accounts')) || [],
    employees: JSON.parse(localStorage.getItem('employees')) || [],
    departments: JSON.parse(localStorage.getItem('departments')) || [
        { name: 'Engineering', description: 'Software team' },
        { name: 'HR', description: 'Human Resources' }
    ],
    requests: JSON.parse(localStorage.getItem('requests')) || []
};

function saveDB() {
    localStorage.setItem('accounts', JSON.stringify(window.db.accounts));
    localStorage.setItem('employees', JSON.stringify(window.db.employees));
    localStorage.setItem('departments', JSON.stringify(window.db.departments));
    localStorage.setItem('requests', JSON.stringify(window.db.requests));
}

function navigateTo(hash) {
    window.location.hash = hash;
}

function handleRouting() {
    const hash = window.location.hash || '#/';
    const route = hash.substring(2); 
    
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    const protectedRoutes = ['profile', 'employees', 'accounts', 'departments', 'requests'];
    const adminRoutes = ['employees', 'accounts', 'departments'];
    
    if (protectedRoutes.includes(route) && !currentUser) {
        navigateTo('#/login');
        return;
    }
    
    if (adminRoutes.includes(route) && currentUser && currentUser.role !== 'admin') {
        alert('Admin access required');
        navigateTo('#/');
        return;
    }
    
    let pageId = route || 'home';
    let pageElement = document.getElementById(pageId + '-page');
    
    if (pageElement) {
        pageElement.classList.add('active');
        
        if (pageId === 'employees') loadEmployees();
        if (pageId === 'accounts') loadAccounts();
        if (pageId === 'departments') loadDepartments();
        if (pageId === 'requests') loadRequests();
        if (pageId === 'profile') loadProfile();
    } else {
        document.getElementById('home-page').classList.add('active');
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
        
        const roleName = user.role === 'admin' ? 'Admin' : 'Employee';
        document.getElementById('username').textContent = roleName;
    } else {
        document.body.classList.remove('authenticated', 'is-admin');
        document.body.classList.add('not-authenticated');
    }
}

function handleRegister(event) {
    event.preventDefault();
    
    const firstName = document.getElementById('regFirstName').value;
    const lastName = document.getElementById('regLastName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    const exists = window.db.accounts.find(acc => acc.email === email);
    if (exists) {
        alert('Email already registered');
        return;
    }
    
    const newAccount = {
        firstName,
        lastName,
        email,
        password,
        role,
        verified: false
    };
    
    window.db.accounts.push(newAccount);
    saveDB();
    
    localStorage.setItem('unverified_email', email);
    
    document.getElementById('verifyEmail').textContent = email;
    
    navigateTo('#/verify');
}

function simulateVerification() {
    const email = localStorage.getItem('unverified_email');
    
    if (!email) {
        alert('No pending verification');
        return;
    }
    
    const account = window.db.accounts.find(acc => acc.email === email);
    if (account) {
        account.verified = true;
        saveDB();
        localStorage.removeItem('unverified_email');
        alert('Email verified! You can now login.');
        navigateTo('#/login');
    }
}

function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    const account = window.db.accounts.find(acc => 
        acc.email === email && 
        acc.password === password && 
        acc.verified === true
    );
    
    if (account) {
        localStorage.setItem('auth_token', email);
        
        setAuthState(true, account);
        
        navigateTo('#/profile');
    } else {
        alert('Invalid email/password or email not verified');
    }
}

function logout() {
    localStorage.removeItem('auth_token');
    setAuthState(false);
    navigateTo('#/');
}

function checkAuth() {
    const token = localStorage.getItem('auth_token');
    
    if (token) {
        const account = window.db.accounts.find(acc => acc.email === token);
        if (account && account.verified) {
            setAuthState(true, account);
        } else {
            localStorage.removeItem('auth_token');
        }
    }
}

function loadProfile() {
    if (!currentUser) return;
    
    document.getElementById('profileName').textContent = currentUser.firstName + ' ' + currentUser.lastName;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profileRole').textContent = currentUser.role === 'admin' ? 'Admin' : 'Employee';
}

function startEditProfile() {
    if (!currentUser) return;
    
    document.getElementById('editFirstName').value = currentUser.firstName;
    document.getElementById('editLastName').value = currentUser.lastName;
    document.getElementById('editEmail').value = currentUser.email;
    
    document.getElementById('editProfileForm').style.display = 'block';
}

function cancelEditProfile() {
    document.getElementById('editProfileForm').style.display = 'none';
}

function saveProfile(event) {
    event.preventDefault();
    
    if (!currentUser) return;
    
    const updated = {
        ...currentUser,
        firstName: document.getElementById('editFirstName').value,
        lastName: document.getElementById('editLastName').value,
        email: document.getElementById('editEmail').value
    };
    
    // Update in accounts
    const index = window.db.accounts.findIndex(acc => acc.email === currentUser.email);
    if (index !== -1) {
        window.db.accounts[index] = { ...window.db.accounts[index], ...updated };
        saveDB();
    }
    
    currentUser = updated;
    localStorage.setItem('auth_token', updated.email);
    
    loadProfile();
    const roleName = updated.role === 'admin' ? 'Admin' : 'Employee';
    document.getElementById('username').textContent = roleName;
    
    cancelEditProfile();
    alert('Profile updated!');
}

function toggleEmployeeForm() {
    const form = document.getElementById('employeeFormDiv');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function renderEmployeesTable() {
    const table = document.getElementById('employeesTable');
    
    if (window.db.employees.length === 0) {
        table.innerHTML = '<tr><td colspan="5" class="text-center">No employees.</td></tr>';
        return;
    }
    
    table.innerHTML = window.db.employees.map(emp => {
        const dept = window.db.departments.find(d => d.name === emp.dept);
        const deptName = dept ? dept.name : emp.dept;
        
        return `
            <tr>
                <td>${emp.id}</td>
                <td>${emp.email}</td>
                <td>${emp.position}</td>
                <td>${deptName}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="alert('Edit coming soon!')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteEmployee('${emp.id}')">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

function loadEmployees() {
    const deptSelect = document.getElementById('empDept');
    deptSelect.innerHTML = window.db.departments.map(dept => 
        `<option value="${dept.name}">${dept.name}</option>`
    ).join('');
    
    renderEmployeesTable();
}

function handleEmployeeForm(event) {
    event.preventDefault();
    
    const email = document.getElementById('empEmail').value;
    
    const accountExists = window.db.accounts.find(acc => acc.email === email);
    if (!accountExists) {
        alert('User email must match an existing account');
        return;
    }
    
    const employee = {
        id: document.getElementById('empId').value,
        email: email,
        position: document.getElementById('empPosition').value,
        dept: document.getElementById('empDept').value,
        hireDate: document.getElementById('empDate').value
    };
    
    window.db.employees.push(employee);
    saveDB();
    
    document.getElementById('employeeForm').reset();
    toggleEmployeeForm();
    renderEmployeesTable();
}

function deleteEmployee(id) {
    if (!confirm(`Delete employee ${id}?`)) return;
    
    window.db.employees = window.db.employees.filter(emp => emp.id !== id);
    saveDB();
    renderEmployeesTable();
}

function toggleAccountForm() {
    const form = document.getElementById('accountFormDiv');
    const isHidden = form.style.display === 'none';
    form.style.display = isHidden ? 'block' : 'none';
    
    if (!isHidden) {
        editingAccountEmail = null;
        document.getElementById('accountForm').reset();
    }
}

function renderAccountsList() {
    const table = document.getElementById('accountsTable');
    
    if (window.db.accounts.length === 0) {
        table.innerHTML = '<tr><td colspan="5" class="text-center">No accounts.</td></tr>';
        return;
    }
    
    let rows = window.db.accounts.map(acc => `
        <tr>
            <td>${acc.firstName} ${acc.lastName}</td>
            <td>${acc.email}</td>
            <td>${acc.role === 'admin' ? 'Admin' : 'Employee'}</td>
            <td>${acc.verified ? '<span class="text-success">✓</span>' : ''}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editAccount('${acc.email}')">Edit</button>
                <button class="btn btn-sm btn-warning" onclick="resetPassword('${acc.email}')">Reset Password</button>
                <button class="btn btn-sm btn-danger" onclick="deleteAccount('${acc.email}')">Delete</button>
            </td>
        </tr>
    `).join('');
    
    table.innerHTML = rows;
}

function loadAccounts() {
    renderAccountsList();
}

let editingAccountEmail = null;

function editAccount(email) {
    const account = window.db.accounts.find(acc => acc.email === email);
    if (!account) return;
    
    document.getElementById('accFirstName').value = account.firstName;
    document.getElementById('accLastName').value = account.lastName;
    document.getElementById('accEmail').value = account.email;
    document.getElementById('accPassword').value = account.password;
    document.getElementById('accRole').value = account.role;
    document.getElementById('accVerified').checked = account.verified;
    
    editingAccountEmail = email;
    document.getElementById('accountFormDiv').style.display = 'block';
}

function resetPassword(email) {
    const newPassword = prompt('Enter new password (min 6 characters):');
    
    if (!newPassword) return;
    
    if (newPassword.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    const account = window.db.accounts.find(acc => acc.email === email);
    if (account) {
        account.password = newPassword;
        saveDB();
        alert('Password reset successfully');
    }
}

function deleteAccount(email) {
    if (currentUser && currentUser.email === email) {
        alert('You cannot delete your own account');
        return;
    }
    
    if (!confirm(`Delete account ${email}?`)) return;
    
    window.db.accounts = window.db.accounts.filter(acc => acc.email !== email);
    saveDB();
    renderAccountsList();
}

function handleAccountForm(event) {
    event.preventDefault();
    
    const formData = {
        firstName: document.getElementById('accFirstName').value,
        lastName: document.getElementById('accLastName').value,
        email: document.getElementById('accEmail').value,
        password: document.getElementById('accPassword').value,
        role: document.getElementById('accRole').value,
        verified: document.getElementById('accVerified').checked
    };
    
    if (editingAccountEmail) {
        const index = window.db.accounts.findIndex(acc => acc.email === editingAccountEmail);
        if (index !== -1) {
            window.db.accounts[index] = { ...window.db.accounts[index], ...formData };
        }
        editingAccountEmail = null;
    } else {
        window.db.accounts.push(formData);
    }
    
    saveDB();
    
    document.getElementById('accountForm').reset();
    toggleAccountForm();
    renderAccountsList();
}

function toggleDepartmentForm() {
    const form = document.getElementById('departmentFormDiv');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function loadDepartments() {
    const table = document.getElementById('departmentsTable');
    
    if (window.db.departments.length === 0) {
        table.innerHTML = '<tr><td colspan="3" class="text-center">No departments.</td></tr>';
    } else {
        table.innerHTML = window.db.departments.map(dept => `
            <tr>
                <td>${dept.name}</td>
                <td>${dept.description}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="alert('Edit coming soon!')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteDepartment('${dept.name}')">Delete</button>
                </td>
            </tr>
        `).join('');
    }
}

function handleDepartmentForm(event) {
    event.preventDefault();
    
    const department = {
        name: document.getElementById('deptName').value,
        description: document.getElementById('deptDesc').value
    };
    
    window.db.departments.push(department);
    saveDB();
    
    document.getElementById('departmentForm').reset();
    toggleDepartmentForm();
    loadDepartments();
}

function deleteDepartment(name) {
    if (confirm(`Delete ${name} department?`)) {
        window.db.departments = window.db.departments.filter(dept => dept.name !== name);
        saveDB();
        loadDepartments();
    }
}

let requestModalInstance = null;

function openRequestModal() {
    if (!requestModalInstance) {
        const modalEl = document.getElementById('requestModal');
        requestModalInstance = new bootstrap.Modal(modalEl);
    }
    
    document.getElementById('requestType').value = '';
    document.getElementById('requestItems').innerHTML = '';
    addRequestItem();
    
    requestModalInstance.show();
}

function addRequestItem() {
    const container = document.getElementById('requestItems');
    const row = document.createElement('div');
    row.className = 'input-group mb-2';
    row.innerHTML = `
        <input type="text" class="form-control" placeholder="Item name">
        <input type="number" class="form-control" style="max-width: 90px;" value="1" min="1">
        <button class="btn btn-outline-danger" type="button" onclick="removeRequestItem(this)">×</button>
    `;
    container.appendChild(row);
}

function removeRequestItem(button) {
    button.parentElement.remove();
}

function submitRequest() {
    const type = document.getElementById('requestType').value.trim();
    const itemsContainer = document.getElementById('requestItems');
    const rows = Array.from(itemsContainer.children);
    
    if (!type || rows.length === 0) {
        alert('Please add a type and at least one item.');
        return;
    }
    
    const items = rows.map(r => {
        const [nameInput, qtyInput] = r.querySelectorAll('input');
        return `${nameInput.value || 'Item'} x${qtyInput.value || 1}`;
    });
    
    window.db.requests.push({ type, items });
    saveDB();
    
    if (requestModalInstance) {
        requestModalInstance.hide();
    }
    
    loadRequests();
}

function loadRequests() {
    const table = document.getElementById('requestsTable');
    const body = document.getElementById('requestsTableBody');
    const noText = document.getElementById('noRequestsText');
    const createBtn = document.getElementById('createRequestBtn');
    
    if (window.db.requests.length === 0) {
        table.style.display = 'none';
        noText.style.display = 'block';
        createBtn.style.display = 'inline-block';
        body.innerHTML = '';
    } else {
        noText.style.display = 'none';
        createBtn.style.display = 'none';
        table.style.display = 'table';
        
        body.innerHTML = window.db.requests.map(r => `
            <tr>
                <td>${r.type}</td>
                <td>${r.items.join(', ')}</td>
            </tr>
        `).join('');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const employeeForm = document.getElementById('employeeForm');
    if (employeeForm) {
        employeeForm.addEventListener('submit', handleEmployeeForm);
    }
    
    const accountForm = document.getElementById('accountForm');
    if (accountForm) {
        accountForm.addEventListener('submit', handleAccountForm);
    }
    
    const departmentForm = document.getElementById('departmentForm');
    if (departmentForm) {
        departmentForm.addEventListener('submit', handleDepartmentForm);
    }
    
    checkAuth();
    
    window.addEventListener('hashchange', handleRouting);
    
    if (!window.location.hash) {
        window.location.hash = '#/';
    }
    
    handleRouting();
});
