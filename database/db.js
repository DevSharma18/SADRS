const bcrypt = require('bcrypt');

// Simple in-memory database
const db = {
  users: [],
  atms: [],
  cameras: [],
  alerts: [],
  activity_logs: [],
  settings: [],
  threats: []
};

// Initialize database with seed data
function initializeDatabase() {
  // Create default admin user
  const passwordHash = bcrypt.hashSync('admin123', 10);
  db.users.push({
    id: 1,
    username: 'admin',
    password_hash: passwordHash,
    role: 'admin',
    created_at: new Date().toISOString()
  });

  // Create sample ATMs
  db.atms = [
    { id: 'ATM001', location: 'Downtown Branch', address: '123 Main St, City Center', status: 'online', latitude: 28.6139, longitude: 77.2090, last_seen: new Date().toISOString(), created_at: new Date().toISOString() },
    { id: 'ATM002', location: 'Airport Terminal', address: 'Terminal 2, Airport', status: 'online', latitude: 28.5562, longitude: 77.1000, last_seen: new Date().toISOString(), created_at: new Date().toISOString() },
    { id: 'ATM003', location: 'Shopping Mall', address: 'Grand Mall, 2nd Floor', status: 'online', latitude: 28.5355, longitude: 77.3910, last_seen: new Date().toISOString(), created_at: new Date().toISOString() },
    { id: 'ATM004', location: 'University Campus', address: 'Main Gate, University', status: 'maintenance', latitude: 28.6692, longitude: 77.4538, last_seen: new Date().toISOString(), created_at: new Date().toISOString() },
    { id: 'ATM005', location: 'Railway Station', address: 'Platform 1, Station', status: 'online', latitude: 28.6430, longitude: 77.2197, last_seen: new Date().toISOString(), created_at: new Date().toISOString() },
    { id: 'ATM006', location: 'Hospital Complex', address: 'Medical Center', status: 'online', latitude: 28.6289, longitude: 77.2065, last_seen: new Date().toISOString(), created_at: new Date().toISOString() },
  ];

  // Create cameras
  db.cameras = [
    { id: 1, atm_id: 'ATM001', camera_ip: '192.168.0.1', rtsp_url: 'rtsp://192.168.0.1/stream1', status: 'online', bitrate: 324.63, position: 'Entrance', last_seen: new Date().toISOString() },
    { id: 2, atm_id: 'ATM001', camera_ip: '192.168.0.2', rtsp_url: 'rtsp://192.168.0.2/stream1', status: 'online', bitrate: 255.27, position: 'ATM Face', last_seen: new Date().toISOString() },
    { id: 3, atm_id: 'ATM002', camera_ip: '192.168.1.1', rtsp_url: 'rtsp://192.168.1.1/stream1', status: 'online', bitrate: 499.43, position: 'Entrance', last_seen: new Date().toISOString() },
    { id: 4, atm_id: 'ATM002', camera_ip: '192.168.1.2', rtsp_url: 'rtsp://192.168.1.2/stream1', status: 'online', bitrate: 244.36, position: 'ATM Face', last_seen: new Date().toISOString() },
    { id: 5, atm_id: 'ATM002', camera_ip: '192.168.1.3', rtsp_url: 'rtsp://192.168.1.3/stream1', status: 'online', bitrate: 258.08, position: 'Exit', last_seen: new Date().toISOString() },
    { id: 6, atm_id: 'ATM003', camera_ip: '192.168.1.4', rtsp_url: 'rtsp://192.168.1.4/stream1', status: 'online', bitrate: 233.46, position: 'Entrance', last_seen: new Date().toISOString() },
    { id: 7, atm_id: 'ATM003', camera_ip: '192.168.1.5', rtsp_url: 'rtsp://192.168.1.5/stream1', status: 'online', bitrate: 245.76, position: 'ATM Face', last_seen: new Date().toISOString() },
    { id: 8, atm_id: 'ATM004', camera_ip: '192.168.1.6', rtsp_url: 'rtsp://192.168.1.6/stream1', status: 'offline', bitrate: 0, position: 'Entrance', last_seen: new Date().toISOString() },
    { id: 9, atm_id: 'ATM004', camera_ip: '192.168.1.7', rtsp_url: 'rtsp://192.168.1.7/stream1', status: 'online', bitrate: 256.08, position: 'ATM Face', last_seen: new Date().toISOString() },
    { id: 10, atm_id: 'ATM005', camera_ip: '192.168.1.8', rtsp_url: 'rtsp://192.168.1.8/stream1', status: 'online', bitrate: 321.17, position: 'Entrance', last_seen: new Date().toISOString() },
    { id: 11, atm_id: 'ATM006', camera_ip: '192.168.1.9', rtsp_url: 'rtsp://192.168.1.9/stream1', status: 'online', bitrate: 289.54, position: 'Entrance', last_seen: new Date().toISOString() },
  ];

  // Create alerts
  db.alerts = [
    { id: 1, atm_id: 'ATM001', location: 'Downtown Branch', description: 'Suspicious activity detected near ATM entrance', severity: 'high', status: 'active', created_at: new Date().toISOString(), resolved_at: null },
    { id: 2, atm_id: 'ATM003', location: 'Shopping Mall', description: 'Camera feed quality degraded', severity: 'medium', status: 'active', created_at: new Date().toISOString(), resolved_at: null },
    { id: 3, atm_id: 'ATM004', location: 'University Campus', description: 'ATM offline for scheduled maintenance', severity: 'low', status: 'active', created_at: new Date().toISOString(), resolved_at: null },
    { id: 4, atm_id: 'ATM002', location: 'Airport Terminal', description: 'Unusual transaction pattern detected', severity: 'critical', status: 'active', created_at: new Date().toISOString(), resolved_at: null },
    { id: 5, atm_id: 'ATM005', location: 'Railway Station', description: 'Power fluctuation detected', severity: 'medium', status: 'resolved', created_at: new Date(Date.now() - 3600000).toISOString(), resolved_at: new Date().toISOString() },
  ];

  // Create logs
  db.activity_logs = [
    { id: 1, event_type: 'system', atm_id: 'ATM001', description: 'System startup completed', severity: 'info', user_id: null, created_at: new Date().toISOString() },
    { id: 2, event_type: 'alert', atm_id: 'ATM002', description: 'Critical alert generated', severity: 'critical', user_id: null, created_at: new Date().toISOString() },
    { id: 3, event_type: 'camera', atm_id: 'ATM004', description: 'Camera offline', severity: 'warning', user_id: null, created_at: new Date().toISOString() },
    { id: 4, event_type: 'maintenance', atm_id: 'ATM004', description: 'Scheduled maintenance started', severity: 'info', user_id: null, created_at: new Date().toISOString() },
    { id: 5, event_type: 'user', atm_id: null, description: 'Admin user logged in', severity: 'info', user_id: 1, created_at: new Date().toISOString() },
  ];

  // Create settings
  db.settings = [
    { key: 'alert_threshold', value: '5', updated_at: new Date().toISOString() },
    { key: 'video_retention_days', value: '30', updated_at: new Date().toISOString() },
    { key: 'notification_enabled', value: 'true', updated_at: new Date().toISOString() },
    { key: 'grid_size', value: '3', updated_at: new Date().toISOString() },
  ];

  // Initialize threats with some history
  db.threats = [
    { id: 1, camera_id: 1, atm_id: 'ATM001', threat_level: 'suspicious', label: 'Suspicious object', confidence: 68.5, detected_objects: ['backpack'], weapons_detected: [], person_count: 1, timestamp: new Date(Date.now() - 86400000).toISOString(), status: 'reviewed' },
  ];

  console.log('Database initialized with seed data');
}

// Initialize on load
initializeDatabase();

module.exports = db;
