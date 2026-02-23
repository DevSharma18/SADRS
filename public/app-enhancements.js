const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3001' : '';
// Enhanced app.js additions for new features

// Load Analytics Page
async function loadAnalytics(container) {
    try {
        const analyticsHTML = await fetch(${API_BASE}/pages/analytics.html').then(r => r.text());
        container.innerHTML = analyticsHTML;

        // Initialize charts after DOM is loaded
        setTimeout(() => {
            initializeCharts();
        }, 100);
    } catch (error) {
        console.error('Analytics load error:', error);
        container.innerHTML = '<p>Error loading analytics</p>';
    }
}

// Initialize Chart.js charts
function initializeCharts() {
    // Alerts Trend Chart
    const alertsCtx = document.getElementById('alertsChart');
    if (alertsCtx) {
        new Chart(alertsCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Alerts',
                    data: [12, 19, 8, 15, 10, 13, 7],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#94a3b8' } },
                    x: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#94a3b8' } }
                }
            }
        });
    }

    // Severity Chart
    const severityCtx = document.getElementById('severityChart');
    if (severityCtx) {
        new Chart(severityCtx, {
            type: 'doughnut',
            data: {
                labels: ['Critical', 'High', 'Medium', 'Low'],
                datasets: [{
                    data: [1, 1, 2, 1],
                    backgroundColor: ['#dc2626', '#f97316', '#eab308', '#22c55e'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 15 } }
                }
            }
        });
    }

    // Uptime Chart
    const uptimeCtx = document.getElementById('uptimeChart');
    if (uptimeCtx) {
        new Chart(uptimeCtx, {
            type: 'bar',
            data: {
                labels: ['ATM001', 'ATM002', 'ATM003', 'ATM004', 'ATM005', 'ATM006'],
                datasets: [{
                    label: 'Uptime %',
                    data: [100, 100, 98, 85, 99, 100],
                    backgroundColor: '#10b981',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#94a3b8' } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                }
            }
        });
    }
}

// Load Map Page
async function loadMap(container) {
    try {
        const mapHTML = await fetch(${API_BASE}/pages/map.html').then(r => r.text());
        container.innerHTML = mapHTML;

        // Initialize map markers
        setTimeout(() => {
            renderMapMarkers();
        }, 100);
    } catch (error) {
        console.error('Map load error:', error);
        container.innerHTML = '<p>Error loading map</p>';
    }
}

// Render map markers
async function renderMapMarkers() {
    try {
        const response = await fetch(${API_BASE}/api/atms');
        const atms = await response.json();

        const alertsResponse = await fetch(${API_BASE}/api/alerts?status=active');
        const alerts = await alertsResponse.json();

        const markersContainer = document.getElementById('mapMarkers');
        if (!markersContainer) return;

        markersContainer.innerHTML = atms.map((atm, index) => {
            const hasAlert = alerts.some(a => a.atm_id === atm.id);
            const xPos = 10 + (index % 3) * 30;
            const yPos = 10 + Math.floor(index / 3) * 30;

            return `
                <div class="map-marker ${atm.status} ${hasAlert ? 'has-alert' : ''}" 
                     style="left: ${xPos}%; top: ${yPos}%;"
                     onclick="showATMSidebar('${atm.id}')">
                    🏧
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Map markers error:', error);
    }
}

// Show ATM sidebar
async function showATMSidebar(atmId) {
    try {
        const response = await fetch(`/api/atms/${atmId}`);
        const atm = await response.json();

        const sidebar = document.getElementById('atmDetailsSidebar');
        const titleEl = document.getElementById('sidebarTitle');
        const contentEl = document.getElementById('sidebarContent');

        if (!sidebar || !titleEl || !contentEl) return;

        titleEl.textContent = atm.id;
        contentEl.innerHTML = `
            <div style="margin-bottom: var(--spacing-lg);">
                <h4 style="margin-bottom: var(--spacing-sm);">Location</h4>
                <p style="color: var(--text-secondary);">${atm.location}</p>
                <p style="color: var(--text-muted); font-size: 0.875rem;">${atm.address}</p>
            </div>
            
            <div style="margin-bottom: var(--spacing-lg);">
                <h4 style="margin-bottom: var(--spacing-sm);">Status</h4>
                <span class="badge badge-${atm.status}">${atm.status}</span>
            </div>
            
            <div style="margin-bottom: var(--spacing-lg);">
                <h4 style="margin-bottom: var(--spacing-sm);">Cameras (${atm.cameras.length})</h4>
                ${atm.cameras.map(cam => `
                    <div style="padding: var(--spacing-sm); background: var(--bg-tertiary); border-radius: var(--radius-sm); margin-bottom: var(--spacing-sm);">
                        <div style="font-weight: 600;">${cam.camera_ip}</div>
                        <div style="font-size: 0.875rem; color: var(--text-muted);">${cam.position}</div>
                        <span class="badge badge-${cam.status}" style="margin-top: var(--spacing-xs);">${cam.status}</span>
                    </div>
                `).join('')}
            </div>
            
            <div>
                <h4 style="margin-bottom: var(--spacing-sm);">Recent Alerts (${atm.alerts.length})</h4>
                ${atm.alerts.length > 0 ? atm.alerts.map(alert => `
                    <div style="padding: var(--spacing-sm); background: var(--bg-tertiary); border-radius: var(--radius-sm); margin-bottom: var(--spacing-sm);">
                        <span class="badge badge-${alert.severity}">${alert.severity}</span>
                        <div style="margin-top: var(--spacing-xs); font-size: 0.875rem;">${alert.description}</div>
                    </div>
                `).join('') : '<p style="color: var(--text-muted);">No recent alerts</p>'}
            </div>
        `;

        sidebar.style.display = 'block';
    } catch (error) {
        console.error('Sidebar error:', error);
    }
}

// Close ATM sidebar
function closeATMSidebar() {
    const sidebar = document.getElementById('atmDetailsSidebar');
    if (sidebar) {
        sidebar.style.display = 'none';
    }
}

// Filter map markers
async function filterMapMarkers() {
    await renderMapMarkers();
}

// Center map
function centerMap() {
    alert('Map centering feature - would reset view to default position');
}

// Fit all markers
function fitAllMarkers() {
    alert('Fit all markers feature - would adjust zoom to show all ATMs');
}

// Load Users Page
async function loadUsers(container) {
    try {
        const usersHTML = await fetch(${API_BASE}/pages/users.html').then(r => r.text());
        container.innerHTML = usersHTML;

        setTimeout(() => {
            loadUsersTable();
        }, 100);
    } catch (error) {
        console.error('Users load error:', error);
        container.innerHTML = '<p>Error loading users</p>';
    }
}

// Load users table
function loadUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    // Mock user data (in real app, would fetch from API)
    const users = [
        { id: 1, username: 'admin', role: 'admin', created_at: new Date().toISOString(), last_login: new Date().toISOString(), status: 'active' },
        { id: 2, username: 'operator1', role: 'operator', created_at: new Date(Date.now() - 86400000).toISOString(), last_login: new Date(Date.now() - 3600000).toISOString(), status: 'active' },
        { id: 3, username: 'operator2', role: 'operator', created_at: new Date(Date.now() - 172800000).toISOString(), last_login: new Date(Date.now() - 7200000).toISOString(), status: 'active' }
    ];

    tbody.innerHTML = users.map(user => `
        <tr>
            <td><strong>${user.username}</strong></td>
            <td><span class="badge" style="background: rgba(59, 130, 246, 0.2); color: var(--accent-primary);">${user.role}</span></td>
            <td>${formatDate(user.created_at)}</td>
            <td>${formatDate(user.last_login)}</td>
            <td><span class="badge badge-online">${user.status}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="editUser(${user.id})">Edit</button>
                ${user.role !== 'admin' ? `<button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">Delete</button>` : ''}
            </td>
        </tr>
    `).join('');
}

// Show add user modal
function showAddUserModal() {
    const modal = document.getElementById('addUserModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Close add user modal
function closeAddUserModal() {
    const modal = document.getElementById('addUserModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('addUserForm').reset();
    }
}

// Add user
async function addUser(event) {
    event.preventDefault();

    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newUserRole').value;

    // In real app, would make API call here
    alert(`User ${username} would be created with role: ${role}`);
    closeAddUserModal();
    loadUsersTable();
}

// Edit user
function editUser(userId) {
    alert(`Edit user ${userId} - would open edit modal`);
}

// Delete user
function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        alert(`User ${userId} would be deleted`);
        loadUsersTable();
    }
}

// Export alerts to CSV
async function exportAlertsCSV() {
    try {
        const response = await fetch(${API_BASE}/api/alerts');
        const alerts = await response.json();

        // Create CSV content
        const headers = ['ATM ID', 'Location', 'Description', 'Severity', 'Status', 'Created At'];
        const rows = alerts.map(alert => [
            alert.atm_id,
            alert.location,
            alert.description,
            alert.severity,
            alert.status,
            new Date(alert.created_at).toLocaleString()
        ]);

        let csvContent = headers.join(',') + '\n';
        csvContent += rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        // Download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `alerts_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        alert('Alerts exported successfully!');
    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export alerts');
    }
}
