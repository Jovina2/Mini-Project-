const statusBar = document.querySelector(".status-bar");
    const vehicleInfo = document.querySelector(".vehicle-info");
    const historyList = document.querySelector(".history-list");

    // Fetch accident data from backend
    async function fetchAccidentData() {
        try {
            const response = await fetch("/accidents"); // GET route from backend
            const data = await response.json();

            // ✅ Update status
            if (data.length > 0) {
                const latest = data[0]; // most recent accident
                if (latest.false_alert) {
                    statusBar.textContent = "Status: False Alarm";
                    statusBar.style.backgroundColor = "#ffc107"; // Yellow
                } else {
                    statusBar.textContent = `Status: ${latest.status}`;
                    statusBar.style.backgroundColor = "#dc3545"; // Red
                }

                // ✅ Update vehicle info
                vehicleInfo.innerHTML = `
                    <h2>Vehicle Info</h2>
                    <p><strong>ID</strong> ${latest.device_id}</p>
                    <p><strong>Location</strong> ${latest.location}</p>
                    <p><strong>Time</strong> ${new Date(latest.timestamp).toLocaleString()}</p>
                    <p><strong>Status</strong> ${latest.status}</p>
                `;
            } else {
                statusBar.textContent = "Status: No Accident";
                statusBar.style.backgroundColor = "#28a745"; // Green
            }

            // ✅ Update notification history
            historyList.innerHTML = "";
            data.forEach(accident => {
                const item = document.createElement("div");
                item.className = "history-item";
                item.innerHTML = `
                    <span>${new Date(accident.timestamp).toLocaleDateString()}</span>
                    <span>${new Date(accident.timestamp).toLocaleTimeString()}</span>
                    <span>${accident.status}</span>
                `;
                historyList.appendChild(item);
            });
        } catch (err) {
            console.error("Error fetching accident data:", err);
        }
    }

    // Call immediately and refresh every 10s
    fetchAccidentData();
    setInterval(fetchAccidentData, 10000);
