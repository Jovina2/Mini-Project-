const express = require('express');
const router = express.Router();
const db = require('./db'); // adjust path if needed

// Test route
router.get('/', (req, res) => {
  res.send('🚨 Accident API is working!');
});

// Get all accidents
router.get('/all', (req, res) => {
  const sql = "SELECT * FROM accidents ORDER BY timestamp DESC";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ message: 'Error fetching accidents' });
    }
    res.json(results);
  });
});

// Report accident
router.post('/report', (req, res) => {
  const { deviceId, location, timestamp } = req.body;
  const sql = `INSERT INTO accidents (device_id, location, timestamp, false_alert, status)
               VALUES (?, ?, ?, 0, 'alert sent to responders')`;

  db.query(sql, [deviceId, location, timestamp], (err, result) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ message: 'Error saving accident' });
    }
    res.status(201).json({ message: 'Accident recorded', accidentId: result.insertId });
  });
});

// Cancel accident
router.post('/cancel', (req, res) => {
  const { deviceId, timestamp } = req.body;
  const sql = `INSERT INTO accidents (device_id, location, timestamp, false_alert, status)
               VALUES (?, 'N/A', ?, 1, 'false alert')`;

  db.query(sql, [deviceId, timestamp], (err, result) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ message: 'Error saving cancellation' });
    }
    res.status(201).json({ message: 'False alert recorded', accidentId: result.insertId });
  });
});
