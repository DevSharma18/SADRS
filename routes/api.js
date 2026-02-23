const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const axios = require('axios');

// Authentication routes
router.post('/auth/login', (req, res) => {
    console.log('Login attempt received IP:', req.ip);
    console.log('Login body:', req.body);
    const { username, password } = req.body;

    try {
        const user = db.users.find(u => u.username === username);

        if (!user) {
            console.log('User not found:', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = bcrypt.compareSync(password, user.password_hash);

        if (!validPassword) {
            console.log('Invalid password for user:', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Set session
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.userRole = user.role;

        // Log activity
        db.activity_logs.push({
            id: db.activity_logs.length + 1,
            event_type: 'user',
            atm_id: null,
            description: `User ${username} logged in`,
            severity: 'info',
            user_id: user.id,
            created_at: new Date().toISOString()
        });

        console.log('Login successful for user:', username);

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

router.post('/auth/logout', requireAuth, (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

router.get('/auth/check', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({
            authenticated: true,
            user: {
                id: req.session.userId,
                username: req.session.username,
                role: req.session.userRole
            }
        });
    } else {
        res.json({ authenticated: false });
    }
});

// Dashboard statistics
router.get('/stats', requireAuth, (req, res) => {
    try {
        const totalAtms = db.atms.length;
        const activeAlerts = db.alerts.filter(a => a.status === 'active').length;
        const onlineCameras = db.cameras.filter(c => c.status === 'online').length;
        const totalCameras = db.cameras.length;
        const offlineAtms = db.atms.filter(a => a.status === 'offline').length;

        res.json({
            totalAtms,
            activeAlerts,
            camerasOnline: onlineCameras,
            totalCameras,
            systemStatus: offlineAtms === 0 ? 'operational' : 'warning'
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Alerts routes
router.get('/alerts', requireAuth, (req, res) => {
    try {
        let alerts = [...db.alerts];

        if (req.query.status) {
            alerts = alerts.filter(a => a.status === req.query.status);
        }
        if (req.query.severity) {
            alerts = alerts.filter(a => a.severity === req.query.severity);
        }

        alerts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        res.json(alerts);
    } catch (error) {
        console.error('Alerts error:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

router.get('/alerts/:id', requireAuth, (req, res) => {
    try {
        const alert = db.alerts.find(a => a.id === parseInt(req.params.id));
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        res.json(alert);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch alert' });
    }
});

router.put('/alerts/:id', requireAuth, (req, res) => {
    try {
        const { status } = req.body;
        const alert = db.alerts.find(a => a.id === parseInt(req.params.id));

        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        alert.status = status;
        if (status === 'resolved') {
            alert.resolved_at = new Date().toISOString();
        }

        // Log activity
        db.activity_logs.push({
            id: db.activity_logs.length + 1,
            event_type: 'alert',
            atm_id: alert.atm_id,
            description: `Alert ${req.params.id} status changed to ${status}`,
            severity: 'info',
            user_id: req.session.userId,
            created_at: new Date().toISOString()
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Update alert error:', error);
        res.status(500).json({ error: 'Failed to update alert' });
    }
});

router.delete('/alerts/:id', requireAuth, (req, res) => {
    try {
        const index = db.alerts.findIndex(a => a.id === parseInt(req.params.id));

        if (index === -1) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        db.alerts.splice(index, 1);

        // Log activity
        db.activity_logs.push({
            id: db.activity_logs.length + 1,
            event_type: 'alert',
            atm_id: null,
            description: `Alert ${req.params.id} dismissed`,
            severity: 'info',
            user_id: req.session.userId,
            created_at: new Date().toISOString()
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete alert' });
    }
});

// ATMs routes
router.get('/atms', requireAuth, (req, res) => {
    try {
        const atmsWithCameras = db.atms.map(atm => ({
            ...atm,
            cameraCount: db.cameras.filter(c => c.atm_id === atm.id).length
        }));

        res.json(atmsWithCameras);
    } catch (error) {
        console.error('ATMs error:', error);
        res.status(500).json({ error: 'Failed to fetch ATMs' });
    }
});

router.get('/atms/:id', requireAuth, (req, res) => {
    try {
        const atm = db.atms.find(a => a.id === req.params.id);
        if (!atm) {
            return res.status(404).json({ error: 'ATM not found' });
        }

        const cameras = db.cameras.filter(c => c.atm_id === req.params.id);
        const alerts = db.alerts
            .filter(a => a.atm_id === req.params.id)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 10);

        res.json({ ...atm, cameras, alerts });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch ATM details' });
    }
});

router.put('/atms/:id', requireAuth, (req, res) => {
    try {
        const { status, location, address } = req.body;
        const atm = db.atms.find(a => a.id === req.params.id);

        if (!atm) {
            return res.status(404).json({ error: 'ATM not found' });
        }

        if (status) atm.status = status;
        if (location) atm.location = location;
        if (address) atm.address = address;

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update ATM' });
    }
});

// Cameras routes
router.get('/cameras', requireAuth, (req, res) => {
    try {
        let cameras = db.cameras.map(camera => {
            const atm = db.atms.find(a => a.id === camera.atm_id);
            return {
                ...camera,
                atm_location: atm ? atm.location : 'Unknown'
            };
        });

        if (req.query.atm_id) {
            cameras = cameras.filter(c => c.atm_id === req.query.atm_id);
        }
        if (req.query.status) {
            cameras = cameras.filter(c => c.status === req.query.status);
        }

        res.json(cameras);
    } catch (error) {
        console.error('Cameras error:', error);
        res.status(500).json({ error: 'Failed to fetch cameras' });
    }
});

router.put('/cameras/:id', requireAuth, (req, res) => {
    try {
        const { status } = req.body;
        const camera = db.cameras.find(c => c.id === parseInt(req.params.id));

        if (!camera) {
            return res.status(404).json({ error: 'Camera not found' });
        }

        camera.status = status;
        camera.last_seen = new Date().toISOString();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update camera' });
    }
});

// Activity logs routes
router.get('/logs', requireAuth, (req, res) => {
    try {
        let logs = [...db.activity_logs];

        if (req.query.event_type) {
            logs = logs.filter(l => l.event_type === req.query.event_type);
        }
        if (req.query.severity) {
            logs = logs.filter(l => l.severity === req.query.severity);
        }

        logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const limit = parseInt(req.query.limit) || 100;
        res.json(logs.slice(0, limit));
    } catch (error) {
        console.error('Logs error:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

router.post('/logs', requireAuth, (req, res) => {
    try {
        const { event_type, atm_id, description, severity } = req.body;

        const newLog = {
            id: db.activity_logs.length + 1,
            event_type,
            atm_id: atm_id || null,
            description,
            severity: severity || 'info',
            user_id: req.session.userId,
            created_at: new Date().toISOString()
        };

        db.activity_logs.push(newLog);
        res.json({ success: true, id: newLog.id });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create log entry' });
    }
});

// Settings routes
router.get('/settings', requireAuth, (req, res) => {
    try {
        const settingsObj = {};
        db.settings.forEach(s => {
            settingsObj[s.key] = s.value;
        });
        res.json(settingsObj);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

router.put('/settings', requireAuth, (req, res) => {
    try {
        const settings = req.body;

        Object.keys(settings).forEach(key => {
            const existing = db.settings.find(s => s.key === key);
            if (existing) {
                existing.value = settings[key];
                existing.updated_at = new Date().toISOString();
            } else {
                db.settings.push({
                    key,
                    value: settings[key],
                    updated_at: new Date().toISOString()
                });
            }
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Threat Routes
router.post('/analyze', requireAuth, async (req, res) => {
    try {
        const { camera_id, atm_id } = req.body;

        // Call Python ML Service
        const response = await axios.post('http://127.0.0.1:5001/analyze', new URLSearchParams({
            camera_id: camera_id || 'unknown',
            atm_id: atm_id || 'unknown'
        }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

        const threatAnalysis = response.data;

        // Save as a threat if suspicious or worse
        let savedThreat = null;
        if (threatAnalysis.threat_level !== 'safe') {
            savedThreat = {
                id: db.threats.length + 1,
                camera_id,
                atm_id,
                ...threatAnalysis,
                status: 'active'
            };

            db.threats.unshift(savedThreat);

            // Emit socket event
            if (req.io) {
                req.io.emit('threat_detected', savedThreat);
            }

            // Also log it
            db.activity_logs.unshift({
                id: db.activity_logs.length + 1,
                event_type: 'alert',
                atm_id,
                description: `Threat detected: ${threatAnalysis.label}. Weapons: ${threatAnalysis.weapons_detected.join(',') || 'None'}`,
                severity: threatAnalysis.threat_level === 'high' || threatAnalysis.threat_level === 'critical' ? 'critical' : 'warning',
                user_id: req.session.userId,
                created_at: new Date().toISOString()
            });
        }

        return res.json({ success: true, threat: savedThreat || threatAnalysis });
    } catch (error) {
        console.error('Analyze error:', error.message);
        res.status(500).json({ error: 'Analysis failed' });
    }
});

router.get('/threats', requireAuth, (req, res) => {
    let threats = [...db.threats];
    if (req.query.status) {
        threats = threats.filter(t => t.status === req.query.status);
    }
    res.json(threats);
});

router.put('/threats/:id', requireAuth, (req, res) => {
    const { status } = req.body;
    const threat = db.threats.find(t => t.id === parseInt(req.params.id));
    if (threat) {
        threat.status = status;
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

module.exports = router;
