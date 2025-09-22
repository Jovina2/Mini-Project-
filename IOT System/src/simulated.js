const axios = require('axios');

// Your server URL
const SERVER_URL = 'http://localhost:3000/api/update-location';

// Example vehicle data
const vehicleData = {
    vehicleId: '12343',
    latitude: 28.6139,
    longitude: 77.2090,
    speed: 46,
    time: new Date().toLocaleTimeString(),
    accident: true // Set true to simulate an accident
};

// Send data to server every 10 seconds (simulate continuous monitoring)
setInterval(async () => {
    try {
        const response = await axios.post(SERVER_URL, vehicleData);
        console.log('📡 Simulated IoT data sent:', vehicleData);
    } catch (error) {
        console.error('❌ Error sending IoT data:', error.message);
    }
}, 10000);

// Optional: send once immediately
(async () => {
    try {
        const response = await axios.post(SERVER_URL, vehicleData);
        console.log('📡 Initial simulated IoT data sent:', vehicleData);
    } catch (error) {
        console.error('❌ Error sending initial IoT data:', error.message);
    }
})();