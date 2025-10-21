require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { Server } = require('socket.io');
const twilio = require('twilio');
const nodemailer = require('nodemailer');

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH;
const client = twilio(accountSid, authToken);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- Family / emergency contacts ---
const familyNumbers = ['+918129412983', '+918964125831'];
const familyEmails = ['jovinawengler2003@gmail.com', 'family2@gmail.com'];

// --- Nodemailer setup ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
transporter.verify((err, success) => {
  if (err) console.error("❌ Email transporter error:", err);
  else console.log("✅ Email transporter ready");
});

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- Users persistence ---
const USERS_FILE = path.join(__dirname, 'users.json');
let users = [];
if (fs.existsSync(USERS_FILE)) {
  try {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    console.log(`✅ Loaded ${users.length} users`);
  } catch (err) {
    console.error("❌ Error reading users.json:", err);
  }
}
function saveUsers() {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// --- Accident storage ---
let latestVehicleData = {};
let accidentHistory = [];

// --- Utility: send alerts ---
function sendAccidentSMS(data) {
  const message = `🚨 Accident Detected!
Vehicle ID: ${data.vehicleId}
Location: ${data.latitude},${data.longitude}
Time: ${data.timestamp}`;
  familyNumbers.forEach(number => {
    client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to: number
    }).then(msg => console.log(`📩 SMS sent to ${number}: ${msg.sid}`))
      .catch(err => console.error(`❌ SMS failed to ${number}:`, err.message));
  });
}

function sendAccidentEmail(data) {
  const message = `🚨 Accident Detected!
Vehicle ID: ${data.vehicleId}
Location: ${data.latitude},${data.longitude}
Time: ${data.timestamp}`;
 // 1. Send to default family numbers
  familyNumbers.forEach(number => {
    client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to: number
    })
      .then(msg => console.log(`📩 SMS sent to ${number}: ${msg.sid}`))
      .catch(err => console.error(`❌ SMS failed to ${number}:`, err.message));
  });

  // 2. Send to default family emails
  familyEmails.forEach(email => {
    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "🚨 Accident Alert",
      text: message
    }, (err, info) => {
      if (err) console.error(`❌ Email failed to ${email}:`, err.message);
      else console.log(`📧 Email sent to ${email}: ${info.response}`);
    });
  });

  // 3. Send to all contacts from contacts.json
  for (const username in contactsData) {
    contactsData[username].forEach(contact => {
      // SMS
      if (contact.phone) {
        client.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE,
          to: contact.phone
        })
          .then(msg => console.log(`📩 SMS sent to ${contact.name} (${contact.phone})`))
          .catch(err => console.error(`❌ SMS failed to ${contact.phone}:`, err.message));
      }

      // Email
      if (contact.email) {
        transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: contact.email,
          subject: "🚨 Accident Alert",
          text: message
        }, (err, info) => {
          if (err) console.error(`❌ Email failed to ${contact.email}:`, err.message);
          else console.log(`📧 Email sent to ${contact.email}: ${info.response}`);
        });
      }
    });
  }
}

function sendAccidentAlerts(data) {
  sendAccidentSMS(data);
  sendAccidentEmail(data);
}

// --- Routes ---
// Login page
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'login.html')));

// User registration
app.post('/register', (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ message: "All fields are required" });

  if (users.find(u => u.username === username)) return res.status(400).json({ message: "User already exists" });

  users.push({ username, password, role });
  saveUsers();
  console.log("✅ Registered:", username, role);
  res.json({ success: true, message: "User registered successfully" });
});

// Login
app.post('/login', (req, res) => {
  const { username, password, role } = req.body;
  const user = users.find(u => u.username === username && u.password === password && u.role === role);
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  console.log("✅ Login:", username, role);
  res.json({ success: true, message: "Login successful" });
});

// Serve pages
app.get('/user-home', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'user_home.html')));
app.get('/map', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'map.html')));
app.get('/alert', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'alert.html')));
app.get('/notify', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'notify.html')));
app.get('/contacts', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'contacts.html')));

// IoT updates
app.post('/api/update-location', (req, res) => {
  latestVehicleData = req.body;
   latestVehicleData.timestamp = new Date().toISOString();
  io.emit("accidentDetected", latestVehicleData);
  console.log('📡 IoT data received:', latestVehicleData);
  if (latestVehicleData.accident) {
    latestVehicleData.status = "responding";
    accidentHistory.push(latestVehicleData);
    io.emit('accidentDetected', latestVehicleData);
    sendAccidentAlerts(latestVehicleData);
  }
  res.sendStatus(200);
});

// Socket.IO
io.on('connection', socket => {
  accidentHistory.forEach(acc => socket.emit('accidentDetected', acc));
  socket.on('disconnect', () => console.log("❌ A user disconnected"));
});

// APIs
app.get('/api/latest-location', (req, res) => res.json(latestVehicleData));
app.get('/api/accidents', (req, res) => res.json(accidentHistory));
app.post('/api/resolve-accident', (req, res) => {
  const { vehicleId } = req.body;
  const accident = accidentHistory.find(a => a.vehicleId === vehicleId);
  if (accident) {
    accident.status = "resolved";
    io.emit('accidentResolved', { vehicleId });
    return res.json({ success: true, message: "Accident resolved" });
  }
  res.status(404).json({ success: false, message: "Accident not found" });
});
// --- Contact Management APIs ---
const CONTACTS_FILE = path.join(__dirname, 'contacts.json');
let contactsData = {};

// Load contacts
if (fs.existsSync(CONTACTS_FILE)) {
  try {
    contactsData = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf-8'));
    console.log("✅ Contacts loaded");
  } catch (err) {
    console.error("❌ Error reading contacts.json:", err);
  }
}

// Save contacts helper
function saveContacts() {
  fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contactsData, null, 2));
}

// Get all contacts
app.get('/get-all-contacts', (req, res) => {
  res.json({ contacts: contactsData });
});

// Add contact
app.post('/add-contact', (req, res) => {
  const { username, name, phone, email } = req.body;
  if (!username || !name || !phone) {
    return res.json({ success: false, message: "Username, Name, and Phone are required" });
  }

  if (!contactsData[username]) contactsData[username] = [];
  contactsData[username].push({ name, phone, email });
  saveContacts();

  console.log(`✅ Contact added for ${username}: ${name} (${phone})`);
  res.json({ success: true, message: "Contact added successfully" });
});

// Update contact
app.post('/update-contact', (req, res) => {
  const { username, index, name, phone, email } = req.body;
  if (contactsData[username] && contactsData[username][index]) {
    contactsData[username][index] = { name, phone, email };
    saveContacts();
    return res.json({ success: true, message: "Contact updated successfully" });
  }
  res.json({ success: false, message: "Contact not found" });
});

// Delete contact
app.post('/delete-contact', (req, res) => {
  const { username, index } = req.body;
  if (contactsData[username]) {
    contactsData[username].splice(index, 1);
    if (contactsData[username].length === 0) delete contactsData[username];
    saveContacts();
    return res.json({ success: true, message: "Contact deleted successfully" });
  }
  res.json({ success: false, message: "User not found" });
});
// Start server
server.listen(3000, () => console.log("✅ Server running on http://localhost:3000"));
