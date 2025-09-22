const express = require('express');
const path = require('path');
const http = require('http');            
const { Server } = require('socket.io');
const db = require('./db'); // Database connection (optional)

const app = express();
const server = http.createServer(app);   
const io = new Server(server);  

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Store latest vehicle details
let latestVehicleData = {};

// Temporary in-memory user store
let users = [];

// --- Routes ---
// Login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

// User registration
app.post('/register', (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ message: 'All fields are required!' });

  const existingUser = users.find(u => u.username === username);
  if (existingUser) return res.status(400).json({ message: `User '${username}' is already registered!` });

  users.push({ username, password, role });
  console.log('✅ Registration:', { username, role });
  res.status(201).json({ message: `User '${username}' registered successfully!` });
});

// Login endpoint
app.post('/login', (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ message: 'All fields are required!' });

  const existingUser = users.find(u => u.username === username && u.password === password && u.role === role);
  if (!existingUser) return res.status(401).json({ message: 'User not found. Please register first!' });

  console.log('✅ Login:', { username, role });
  res.status(200).json({ message: `User '${username}' logged in successfully!` });
});

// Serve User Home
app.get('/user-home', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'user_home.html'));
});

// Map page (admin/responder)
app.get('/map', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'map.html'));
});

// Alert page
app.get('/alert', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'alert.html'));
});

// Notifications page (admin/responder)
app.get('/notify', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'notify.html'));
});

// IoT updates location and accident data
app.post('/api/update-location', (req, res) => {
  latestVehicleData = req.body;
  console.log('📡 IoT data received:', latestVehicleData);

  // Broadcast to all connected clients if accident detected
  if (latestVehicleData.accident) {
    io.emit('accidentDetected', latestVehicleData);
  }

  res.sendStatus(200);
});

// Manual accident alert from frontend
app.post('/api/accident-alert', (req, res) => {
  latestVehicleData = {
    vehicleId: req.body.vehicleId || "Manual-Vehicle",
    speed: req.body.speed || 0,
    latitude: req.body.latitude || 12.9716,
    longitude: req.body.longitude || 77.5946,
    timestamp: new Date().toISOString(),
    accident: true
  };

  console.log("🚨 Manual Accident Alert:", latestVehicleData);

  // Broadcast to all connected clients
  io.emit('accidentDetected', latestVehicleData);

  res.json({ success: true, message: "Accident alert triggered", data: latestVehicleData });
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log("✅ A user connected");

  // Send latest accident data immediately to new client
  if (latestVehicleData.accident) {
    socket.emit('accidentDetected', latestVehicleData);
  }

  socket.on('disconnect', () => {
    console.log("❌ A user disconnected");
  });
});

// API for frontend to fetch latest vehicle info
app.get('/api/latest-location', (req, res) => {
  res.json(latestVehicleData);
});

// Start server
server.listen(3000, () => {
  console.log("✅ Server running on http://localhost:3000");
});