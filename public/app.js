const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3001' : '';
// Application State
const app = {
    currentUser: null,
    currentPage: 'dashboard',
    socket: null,
    stats: {},
    alerts: [],
    cameras: [],
    atms: [],
    logs: [],
    threats: [],
    settings: {}
};

// Global Toast logic
window.showToast = function (msg, type = 'info') {
    const toast = document.createElement('div');
    const bg = type === 'error' ? '#ef4444' : (type === 'success' ? '#10b981' : '#3b82f6');
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; background: ${bg}; color: white;
        padding: 12px 20px; border-radius: 4px; z-index: 10000; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        transition: opacity 0.3s;
    `;
    toast.innerHTML = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 4000);
};

// Global Fetch Interceptor
const originalFetch = window.fetch;
window.fetch = async function () {
    try {
        const response = await originalFetch.apply(this, arguments);
        if (!response.ok && response.status !== 401 && response.status !== 404) {
            showToast(`API Error: ${response.statusText}`, 'error');
        }
        return response;
    } catch (err) {
        showToast(`Network Error: Backend unreachable`, 'error');
        throw err;
    }
};

// Initialize app on load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupLoginForm();
});

// Check authentication status
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE}/api/auth/check`);
        const data = await response.json();

        if (data.authenticated) {
            app.currentUser = data.user;
            showMainApp();
        } else {
            showLoginScreen();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showLoginScreen();
    }
}

// Setup login form
function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        try {
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                app.currentUser = data.user;
                showMainApp();
            } else {
                errorDiv.textContent = data.error || 'Login failed';
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            errorDiv.textContent = 'Login failed. Please try again.';
            errorDiv.style.display = 'block';
        }
    });
}

// Show login screen
function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
}

// Show main application
function showMainApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';

    // Update user display
    document.getElementById('userDisplay').textContent = app.currentUser.username;

    // Setup navigation
    setupNavigation();

    // Setup logout
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Initialize WebSocket
    initializeWebSocket();

    // Load initial page
    loadPage('dashboard');
}

// Setup navigation
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');

            // Update active state
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Load page
            loadPage(page);
        });
    });
}

// Load page content
async function loadPage(page) {
    app.currentPage = page;
    const contentDiv = document.getElementById('pageContent');

    switch (page) {
        case 'dashboard':
            await loadDashboard(contentDiv);
            break;
        case 'live-feed':
            await loadLiveFeed(contentDiv);
            break;
        case 'atm-management':
            await loadATMManagement(contentDiv);
            break;
        case 'analytics':
            await loadAnalytics(contentDiv);
            break;
        case 'threats':
            await loadThreats(contentDiv);
            break;
        case 'map':
            await loadMap(contentDiv);
            break;
        case 'logs':
            await loadLogs(contentDiv);
            break;
        case 'users':
            await loadUsers(contentDiv);
            break;
        case 'settings':
            await loadSettings(contentDiv);
            break;
    }
}

// Load Dashboard
async function loadDashboard(container) {
    try {
        // Fetch stats
        const statsResponse = await fetch(`${API_BASE}/api/stats`);
        app.stats = await statsResponse.json();

        // Fetch active alerts
        const alertsResponse = await fetch(`${API_BASE}/api/alerts?status=active`);
        app.alerts = await alertsResponse.json();

        // Fetch active threats
        const threatsResponse = await fetch(`${API_BASE}/api/threats?status=active`);
        const activeThreats = await threatsResponse.json();

        container.innerHTML = `
            <div class="page-header">
                <h2>Dashboard</h2>
                <p>Real-time monitoring and alerts overview</p>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">Total ATMs</span>
                        <div class="stat-card-icon" style="background: rgba(59, 130, 246, 0.2); color: var(--accent-primary);">🏧</div>
                    </div>
                    <div class="stat-card-value">${app.stats.totalAtms}</div>
                    <div class="stat-card-change">Active locations</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">Threats Detected</span>
                        <div class="stat-card-icon" style="background: rgba(239, 68, 68, 0.2); color: var(--error);">🚨</div>
                    </div>
                    <div class="stat-card-value">${activeThreats.length}</div>
                    <div class="stat-card-change">Active ML alerts</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">Active Alerts</span>
                        <div class="stat-card-icon" style="background: rgba(239, 68, 68, 0.2); color: var(--warning);">⚠️</div>
                    </div>
                    <div class="stat-card-value">${app.stats.activeAlerts}</div>
                    <div class="stat-card-change">Requires attention</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">Cameras Online</span>
                        <div class="stat-card-icon" style="background: rgba(16, 185, 129, 0.2); color: var(--success);">📹</div>
                    </div>
                    <div class="stat-card-value">${app.stats.camerasOnline}/${app.stats.totalCameras}</div>
                    <div class="stat-card-change">Connected feeds</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">System Status</span>
                        <div class="stat-card-icon" style="background: rgba(34, 197, 94, 0.2); color: var(--success);">✓</div>
                    </div>
                    <div class="stat-card-value">${app.stats.systemStatus.toUpperCase()}</div>
                    <div class="stat-card-change">All systems functional</div>
                </div>
            </div>
            
            <div class="table-container">
                <div class="table-header">
                    <h3 class="table-title">Active Alerts</h3>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-export" onclick="exportAlertsCSV()">📥 Export CSV</button>
                        <button class="btn btn-sm btn-secondary" onclick="refreshAlerts()">Refresh</button>
                    </div>
                </div>
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>ATM ID</th>
                                <th>Location</th>
                                <th>Description</th>
                                <th>Severity</th>
                                <th>Time</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="alertsTableBody">
                            ${renderAlerts()}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Dashboard load error:', error);
        container.innerHTML = '<p>Error loading dashboard</p>';
    }
}

// Render alerts table
function renderAlerts() {
    if (app.alerts.length === 0) {
        return '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No active alerts</td></tr>';
    }

    return app.alerts.map(alert => `
        <tr>
            <td><strong>${alert.atm_id}</strong></td>
            <td>${alert.location}</td>
            <td>${alert.description}</td>
            <td><span class="badge badge-${alert.severity}">${alert.severity}</span></td>
            <td>${formatDate(alert.created_at)}</td>
            <td>
                <button class="btn btn-sm btn-success" onclick="resolveAlert(${alert.id})">Resolve</button>
                <button class="btn btn-sm btn-danger" onclick="dismissAlert(${alert.id})">Dismiss</button>
            </td>
        </tr>
    `).join('');
}

// Load Live Feed
async function loadLiveFeed(container) {
    try {
        const response = await fetch(`${API_BASE}/api/cameras`);
        app.cameras = await response.json();

        container.innerHTML = `
            <div class="page-header">
                <h2>Live Camera Feeds</h2>
                <p>Real-time CCTV monitoring across all ATM locations</p>
            </div>
            
            <div class="filters">
                <div class="filter-group">
                    <label>Filter by Status</label>
                    <select id="cameraStatusFilter" onchange="filterCameras()">
                        <option value="">All Cameras</option>
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Filter by ATM</label>
                    <select id="atmFilter" onchange="filterCameras()">
                        <option value="">All ATMs</option>
                        ${[...new Set(app.cameras.map(c => c.atm_id))].map(id =>
            `<option value="${id}">${id}</option>`
        ).join('')}
                    </select>
                </div>
            </div>
            
            <div class="camera-grid" id="cameraGrid">
                ${renderCameras(app.cameras)}
            </div>
        `;
    } catch (error) {
        console.error('Live feed load error:', error);
        container.innerHTML = '<p>Error loading live feed</p>';
    }
}

// Render cameras
function renderCameras(cameras) {
    if (cameras.length === 0) {
        return '<p style="color: var(--text-muted);">No cameras found</p>';
    }

    return cameras.map(camera => `
        <div class="camera-card">
            <div class="camera-feed">
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect fill='%231a2332' width='320' height='180'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-size='14'%3E${camera.status === 'online' ? 'LIVE FEED' : 'OFFLINE'}%3C/text%3E%3C/svg%3E" alt="Camera Feed">
                <div class="camera-status">
                    <span class="badge badge-${camera.status}">${camera.status}</span>
                </div>
            </div>
            <div class="camera-info">
                <div class="camera-title">
                    <span>${camera.camera_ip}</span>
                    <span style="color: var(--text-muted); font-size: 0.75rem;">${camera.position || 'Unknown'}</span>
                </div>
                <div class="camera-details">${camera.atm_location}</div>
                <div class="camera-bitrate" style="margin-bottom: 8px;">Bitrate: ${camera.bitrate ? camera.bitrate.toFixed(2) : '0.00'} KB/s</div>
                
                <!-- ML Analysis Section -->
                <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
                    <div id="ml-badge-${camera.id}" style="margin-bottom: 8px;"></div>
                    <button class="btn btn-sm btn-primary" onclick="analyzeCamera(${camera.id}, '${camera.atm_id}')" style="width: 100%;">Analyze 🔍</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Filter cameras
async function filterCameras() {
    const statusFilter = document.getElementById('cameraStatusFilter').value;
    const atmFilter = document.getElementById('atmFilter').value;

    try {
        let url = `${API_BASE}/api/cameras?`;
        if (statusFilter) url += `status=${statusFilter}&`;
        if (atmFilter) url += `atm_id=${atmFilter}&`;

        const response = await fetch(url);
        const cameras = await response.json();

        document.getElementById('cameraGrid').innerHTML = renderCameras(cameras);
    } catch (error) {
        console.error('Filter error:', error);
    }
}

// Load ATM Management
async function loadATMManagement(container) {
    try {
        const response = await fetch(`${API_BASE}/api/atms`);
        app.atms = await response.json();

        container.innerHTML = `
            <div class="page-header">
                <h2>ATM Management</h2>
                <p>Monitor and manage all ATM locations</p>
            </div>
            
            <div class="atm-grid">
                ${app.atms.map(atm => `
                    <div class="atm-card">
                        <div class="atm-card-header">
                            <div>
                                <div class="atm-id">${atm.id}</div>
                                <div class="atm-location">${atm.location}</div>
                            </div>
                            <span class="badge badge-${atm.status}">${atm.status}</span>
                        </div>
                        <div class="atm-address">${atm.address}</div>
                        <div class="atm-stats">
                            <div class="atm-stat">
                                <div class="atm-stat-label">Cameras</div>
                                <divclass="atm-stat-value">${atm.cameraCount || 0}</div>
                            </div>
                            <div class="atm-stat">
                                <div class="atm-stat-label">Status</div>
                                <div class="atm-stat-value" style="font-size: 0.875rem;">${atm.status}</div>
                            </div>
                        </div>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-secondary" onclick="viewATMDetails('${atm.id}')">View Details</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('ATM management load error:', error);
        container.innerHTML = '<p>Error loading ATM management</p>';
    }
}

// Load Logs
async function loadLogs(container) {
    try {
        const response = await fetch(`${API_BASE}/api/logs?limit=50`);
        app.logs = await response.json();

        container.innerHTML = `
            <div class="page-header">
                <h2>Activity Logs</h2>
                <p>System activity and event history</p>
            </div>
            
            <div class="filters">
                <div class="filter-group">
                    <label>Event Type</label>
                    <select id="eventTypeFilter" onchange="filterLogs()">
                        <option value="">All Events</option>
                        <option value="system">System</option>
                        <option value="alert">Alert</option>
                        <option value="camera">Camera</option>
                        <option value="user">User</option>
                        <option value="maintenance">Maintenance</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Severity</label>
                    <select id="severityFilter" onchange="filterLogs()">
                        <option value="">All Severities</option>
                        <option value="critical">Critical</option>
                        <option value="warning">Warning</option>
                        <option value="info">Info</option>
                    </select>
                </div>
            </div>
            
            <div class="table-container">
                <div class="table-header">
                    <h3 class="table-title">Recent Activity</h3>
                </div>
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Event Type</th>
                                <th>ATM ID</th>
                                <th>Description</th>
                                <th>Severity</th>
                            </tr>
                        </thead>
                        <tbody id="logsTableBody">
                            ${app.logs.map(log => `
                                <tr>
                                    <td>${formatDate(log.created_at)}</td>
                                    <td><span class="badge" style="background: rgba(59, 130, 246, 0.2); color: var(--accent-primary);">${log.event_type}</span></td>
                                    <td>${log.atm_id || 'N/A'}</td>
                                    <td>${log.description}</td>
                                    <td><span class="badge badge-${log.severity}">${log.severity}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Logs load error:', error);
        container.innerHTML = '<p>Error loading logs</p>';
    }
}

// Filter logs
async function filterLogs() {
    const eventType = document.getElementById('eventTypeFilter').value;
    const severity = document.getElementById('severityFilter').value;

    try {
        let url = `${API_BASE}/api/logs?limit=50`;
        if (eventType) url += `&event_type=${eventType}`;
        if (severity) url += `&severity=${severity}`;

        const response = await fetch(url);
        app.logs = await response.json();

        document.getElementById('logsTableBody').innerHTML = app.logs.map(log => `
            <tr>
                <td>${formatDate(log.created_at)}</td>
                <td><span class="badge" style="background: rgba(59, 130, 246, 0.2); color: var(--accent-primary);">${log.event_type}</span></td>
                <td>${log.atm_id || 'N/A'}</td>
                <td>${log.description}</td>
                <td><span class="badge badge-${log.severity}">${log.severity}</span></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Filter logs error:', error);
    }
}

// Load Settings
async function loadSettings(container) {
    try {
        const response = await fetch(`${API_BASE}/api/settings`);
        app.settings = await response.json();

        container.innerHTML = `
            <div class="page-header">
                <h2>Settings</h2>
                <p>Configure system preferences and alerts</p>
            </div>
            
            <div class="table-container">
                <div class="table-header">
                    <h3 class="table-title">System Configuration</h3>
                </div>
                <div style="padding: var(--spacing-xl);">
                    <div class="form-group">
                        <label>Alert Threshold</label>
                        <input type="number" id="alert_threshold" value="${app.settings.alert_threshold || 5}">
                    </div>
                    <div class="form-group">
                        <label>Video Retention (days)</label>
                        <input type="number" id="video_retention_days" value="${app.settings.video_retention_days || 30}">
                    </div>
                    <div class="form-group">
                        <label>Camera Grid Size</label>
                        <select id="grid_size">
                            <option value="2" ${app.settings.grid_size === '2' ? 'selected' : ''}>2x2</option>
                            <option value="3" ${app.settings.grid_size === '3' ? 'selected' : ''}>3x3</option>
                            <option value="4" ${app.settings.grid_size === '4' ? 'selected' : ''}>4x4</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="notification_enabled" ${app.settings.notification_enabled === 'true' ? 'checked' : ''}>
                            Enable Notifications
                        </label>
                    </div>
                    <button class="btn btn-primary" onclick="saveSettings()">Save Settings</button>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Settings load error:', error);
        container.innerHTML = '<p>Error loading settings</p>';
    }
}

// Save settings
async function saveSettings() {
    try {
        const settings = {
            alert_threshold: document.getElementById('alert_threshold').value,
            video_retention_days: document.getElementById('video_retention_days').value,
            grid_size: document.getElementById('grid_size').value,
            notification_enabled: document.getElementById('notification_enabled').checked.toString()
        };

        const response = await fetch(`${API_BASE}/api/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });

        if (response.ok) {
            alert('Settings saved successfully!');
        }
    } catch (error) {
        console.error('Save settings error:', error);
        alert('Failed to save settings');
    }
}

// Alert actions
async function resolveAlert(id) {
    try {
        await fetch(`${API_BASE}/api/alerts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'resolved' })
        });
        refreshAlerts();
    } catch (error) {
        console.error('Resolve alert error:', error);
    }
}

async function dismissAlert(id) {
    try {
        await fetch(`${API_BASE}/api/alerts/${id}`, {
            method: 'DELETE'
        });
        refreshAlerts();
    } catch (error) {
        console.error('Dismiss alert error:', error);
    }
}

async function refreshAlerts() {
    if (app.currentPage === 'dashboard') {
        await loadPage('dashboard');
    }
}

// View ATM details
async function viewATMDetails(id) {
    try {
        const response = await fetch(`${API_BASE}/api/atms/${id}`);
        const atm = await response.json();

        alert(`ATM Details:\n\nID: ${atm.id}\nLocation: ${atm.location}\nAddress: ${atm.address}\nStatus: ${atm.status}\nCameras: ${atm.cameras.length}\nRecent Alerts: ${atm.alerts.length}`);
    } catch (error) {
        console.error('View ATM error:', error);
    }
}

// Initialize WebSocket
function initializeWebSocket() {
    app.socket = io(API_BASE);

    app.socket.on('connect', () => {
        console.log('WebSocket connected');
        showToast('Real-time connection established', 'success');
    });

    app.socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        showToast('Real-time connection lost. Reconnecting...', 'error');
    });

    app.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
    });

    app.socket.on('alert_update', (data) => {
        console.log('Alert update:', data);
        if (app.currentPage === 'dashboard') {
            refreshAlerts();
        }
    });

    app.socket.on('camera_update', (data) => {
        console.log('Camera update:', data);
    });

    app.socket.on('threat_detected', (data) => {
        // Show a custom toast
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; background: #ef4444; color: white;
            padding: 16px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        let alertMsg = `⚠️ THREAT at ${data.atm_id}: ${data.label}`;
        if (data.weapons_detected && data.weapons_detected.length > 0) {
            alertMsg = `🚨 WEAPON DETECTED at ${data.atm_id}: ${data.weapons_detected.join(', ')}`;
        }
        toast.innerHTML = `<strong>${alertMsg}</strong><br><small>Confidence: ${data.confidence}%</small>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);

        if (app.currentPage === 'threats') {
            loadPage('threats');
        } else if (app.currentPage === 'dashboard') {
            loadPage('dashboard');
        }
    });
}

// Logout
async function logout() {
    try {
        await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' });
        app.currentUser = null;
        if (app.socket) {
            app.socket.disconnect();
        }
        showLoginScreen();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Utility function to format dates
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    // Less than 1 minute
    if (diff < 60000) {
        return 'Just now';
    }

    // Less than 1 hour
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes} min ago`;
    }

    // Less than 24 hours
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }

    // More than 24 hours
    return date.toLocaleString();
}

// ML Analysis Feature
async function analyzeCamera(cameraId, atmId) {
    const badgeDiv = document.getElementById(`ml - badge - ${cameraId} `);
    if (badgeDiv) badgeDiv.innerHTML = '<span style="color:var(--text-muted)">Analyzing...</span>';

    try {
        const response = await fetch(`${API_BASE}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ camera_id: cameraId, atm_id: atmId })
        });
        const data = await response.json();

        if (data.success && data.threat) {
            const level = data.threat.threat_level;
            let color = 'var(--success)';
            let icon = '🟢';

            if (level === 'suspicious') { color = 'var(--warning)'; icon = '🟡'; }
            else if (level === 'high') { color = 'var(--error)'; icon = '🔴'; }
            else if (level === 'critical') { color = '#ff0000'; icon = '🔴💀'; }

            let detailsText = `${data.threat.person_count || 0} person(s)`;
            if (data.threat.detected_objects && data.threat.detected_objects.length) {
                detailsText += `, ${data.threat.detected_objects.join(',')} `;
            }
            if (data.threat.weapons_detected && data.threat.weapons_detected.length) {
                detailsText += `< br > <span style="color:#ff4444;font-weight:bold;">WEAPONS: ${data.threat.weapons_detected.join(',')}</span>`;
            }

            if (badgeDiv) {
                badgeDiv.innerHTML = `
            < div style = "display:flex; justify-content:space-between; align-items:center; font-size:0.875rem;" >
                        <span style="color: ${color}; font-weight:bold;">${icon} ${data.threat.label.toUpperCase()}</span>
                        <span>${data.threat.confidence}% conf</span>
                    </div >
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
                ${detailsText}
            </div>
        `;
            }
        }
    } catch (error) {
        if (badgeDiv) badgeDiv.innerHTML = '<span style="color:var(--error)">Analysis failed</span>';
    }
}

// Threats Page
async function loadThreats(container) {
    try {
        const response = await fetch(`${API_BASE}/api/threats`);
        app.threats = await response.json();

        container.innerHTML = `
            < div class="page-header" >
                <h2>Threat Intelligence</h2>
                <p>ML-detected suspicious activity and weapon threats</p>
            </div >
            <div class="table-container">
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Severity</th>
                                <th>ATM/Cam</th>
                                <th>Label</th>
                                <th>Weapons</th>
                                <th>Details</th>
                                <th>Time</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${app.threats.length === 0 ? '<tr><td colspan="7" style="text-align:center;">No threats detected yet</td></tr>' : ''}
                            ${app.threats.map(t => {
            let badgeClass = 'badge-success';
            if (t.threat_level === 'suspicious') badgeClass = 'badge-warning';
            else if (t.threat_level === 'high') badgeClass = 'badge-danger';
            else if (t.threat_level === 'critical') badgeClass = 'badge-danger';

            return `
                                <tr>
                                    <td><span class="badge ${badgeClass}">${t.threat_level.toUpperCase()}</span></td>
                                    <td>${t.atm_id}<br><small>Cam ${t.camera_id}</small></td>
                                    <td><strong>${t.label}</strong><br><small>${t.confidence}% conf</small></td>
                                    <td style="color: #ff4444; font-weight: bold;">${t.weapons_detected && t.weapons_detected.length ? t.weapons_detected.join(', ') : '-'}</td>
                                    <td>${t.person_count || 0}p / ${t.detected_objects && t.detected_objects.length ? t.detected_objects.join(',') : '-'}</td>
                                    <td>${formatDate(t.timestamp)}</td>
                                    <td>
                                        ${t.status === 'active' ? `<button class="btn btn-sm btn-success" onclick="updateThreatStatus(${t.id}, 'reviewed')">Mark Reviewed</button>` : `<span class="badge badge-success">Reviewed</span>`}
                                    </td>
                                </tr>`;
        }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (e) {
        container.innerHTML = '<p>Error loading threats.</p>';
    }
}

async function updateThreatStatus(id, status) {
    try {
        await fetch(`${API_BASE}/api/threats/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        loadPage('threats');
    } catch (e) {
        console.error(e);
    }
}

// Placeholder for Analytics
async function loadAnalytics(container) {
    container.innerHTML = `
        <div class="page-header">
            <h2>Analytics</h2>
            <p>System analytics overview</p>
        </div>
        <div class="card" style="padding: 2rem; text-align: center;">
            <p style="color: var(--text-muted);">Analytics dashboard is under construction.</p>
        </div>
    `;
}

// Placeholder for Map
async function loadMap(container) {
    container.innerHTML = `
        <div class="page-header">
            <h2>Location Map</h2>
            <p>Geographical distribution of ATMs</p>
        </div>
        <div class="card" style="padding: 2rem; text-align: center;">
            <p style="color: var(--text-muted);">Interactive map is under construction.</p>
        </div>
    `;
}

// Placeholder for Users
async function loadUsers(container) {
    container.innerHTML = `
        <div class="page-header">
            <h2>User Management</h2>
            <p>Manage system access and roles</p>
        </div>
        <div class="card" style="padding: 2rem; text-align: center;">
            <p style="color: var(--text-muted);">User management is under construction.</p>
        </div>
    `;
}
