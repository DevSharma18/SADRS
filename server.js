const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const db = require('./database/db');
const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
// Catch and handle malformed JSON gracefully
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('Malformed JSON received:', err.message);
        return res.status(400).json({ error: 'Bad Request - Invalid JSON' });
    }
    next(err);
});
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: 'atm-cctv-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Inject IO into request
app.use((req, res, next) => {
    req.io = io;
    next();
});

// API routes
app.use('/api', apiRoutes);

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Send initial data
    socket.emit('connected', { message: 'WebSocket connected' });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Simulate real-time updates (for demonstration)
setInterval(() => {
    // Randomly update camera status or create alerts
    const random = Math.random();

    if (random > 0.7) {
        // Emit alert update
        const activeAlerts = db.alerts.filter(a => a.status === 'active').length;
        io.emit('alert_update', {
            count: activeAlerts,
            timestamp: new Date().toISOString()
        });
    }

    if (random < 0.3) {
        // Emit camera status update
        const onlineCameras = db.cameras.filter(c => c.status === 'online').length;
        io.emit('camera_update', {
            online: onlineCameras,
            timestamp: new Date().toISOString()
        });
    }
}, 10000); // Every 10 seconds

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('SERVER ERROR CAUGHT:');
    console.error(err.stack || err);
    res.status(500).json({ error: 'Internal server error' });
});

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});

// Start server
server.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`ATM CCTV Monitoring System`);
    console.log(`========================================`);
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Default credentials: admin / admin123`);
    console.log(`========================================\n`);
});

module.exports = { app, io };
