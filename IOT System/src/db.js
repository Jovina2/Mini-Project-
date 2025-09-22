const mysql = require('mysql2');

// The configuration object for the connection pool
const poolConfig = {
  host: 'localhost',
  user: 'root',              // your existing MySQL username
  password: 'ABCDqwer@Password', // your MySQL root password
  database: 'saferidenotify',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
  // REMOVED the authPlugins block as it's not needed for mysql2
};

// Create the connection pool
const db = mysql.createPool(poolConfig);

// Optional: Test the connection on startup to get immediate feedback
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection failed: " + err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Database connection was closed.');
    }
    if (err.code === 'ER_CON_COUNT_ERROR') {
      console.error('Database has too many connections.');
    }
    if (err.code === 'ECONNREFUSED') {
      console.error('Database connection was refused. Is your MySQL server running?');
    }
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('Access denied. Check your username and password.');
    }
    if (err.code === 'ER_BAD_DB_ERROR') {
        console.error('Database not found. Check your database name.');
    }
    return;
  }
  if (connection) {
    console.log("✅ Connected to MySQL Database!");
    connection.release(); // Return the connection to the pool
  }
});

module.exports = db;