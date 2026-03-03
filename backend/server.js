const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
// Lightstreamer Node.js client import pattern
const ls = require('lightstreamer-client-node');
const LightstreamerClient = ls.LightstreamerClient;
const Subscription = ls.Subscription;

const app = express();
const PORT = process.env.PORT || 3000;
const path = require('path');

// Serve static files from the React frontend app if STATIC_FILES_PATH is set
// Serve static files from the React frontend app if STATIC_FILES_PATH is set
if (process.env.STATIC_FILES_PATH) {
    app.use(express.static(path.join(__dirname, process.env.STATIC_FILES_PATH)));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, process.env.STATIC_FILES_PATH, 'index.html'));
    });
}


// Ensure database directory exists
const fs = require('fs');
const DB_PATH = process.env.DB_PATH || './readings.db';
const DB_DIR = require('path').dirname(DB_PATH);

if (!fs.existsSync(DB_DIR) && DB_DIR !== '.') {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize SQLite database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log(`Connected to the SQlite database at ${DB_PATH}.`);
    
    // Attempt to add new column if it doesn't exist
    // This is a simple migration strategy for dev environment
    db.run("ALTER TABLE readings ADD COLUMN wpa_state TEXT", (err) => {
        // Ignore error if column already exists
    });

    // Initialize state from existing data
    db.get("SELECT wpa_state FROM readings WHERE wpa_state IS NOT NULL AND wpa_state != 'Unknown' ORDER BY id DESC LIMIT 1", (err, row) => {
        if (!err && row && row.wpa_state) {
            currentUpaState = row.wpa_state;
            console.log(`Initialized currentUpaState from DB: ${currentUpaState}`);
        }
    });
});

db.run(`CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    value REAL,
    wpa_state TEXT
)`);

app.use(cors());

// API Endpoint to get history
app.get('/api/history', (req, res) => {
    const sql = `SELECT timestamp as time, value, wpa_state FROM readings ORDER BY id DESC LIMIT 50`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        // Respond with rows in chronological order (oldest first)
        res.json({
            "message":"success",
            "data": rows.reverse()
        });
    });
});

if (process.env.static_files_path) {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, process.env.static_files_path, 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


// Lightstreamer Connection
const client = new LightstreamerClient("https://push.lightstreamer.com", "ISSLIVE");
client.connect();

let currentUpaState = "Unknown";
let currentUrineLevel = null;
let lastLoggedUpaState = null;
let lastLoggedUrineLevel = null;

const upaStateMap = {
    "0": "INIT", 
    "1": "STOP",
    "2": "SHUTDOWN",
    "3": "STANDBY",
    "4": "PROCESS",
    "5": "HOT SERVICE",
    "6": "FLUSH",
    "7": "WARM SHUTDOWN",
    "8": "NORMAL",
    "13": "UPA PROCESS",
    "32": "PROCESSING"
};

// NODE3000004 is Urine Processor Assembly State
const sub = new Subscription("MERGE", ["NODE3000005", "NODE3000004"], ["Value", "TimeStamp"]);
sub.addListener({
    onItemUpdate: (update) => {
        const item = update.getItemName();
        const val = update.getValue("Value");

        if (item === "NODE3000004") {
            const mappedState = upaStateMap[String(val)] || val;
            currentUpaState = mappedState;
            console.log("UPA State Updated in memory:", currentUpaState);
        } else if (item === "NODE3000005") {
            const numericVal = parseFloat(val);
            if (!isNaN(numericVal)) {
                currentUrineLevel = numericVal;
            }
        }
    }
});
client.subscribe(sub);

// Update database every second if changed
setInterval(() => {
    // Check if we have data to log
    if (currentUrineLevel !== null) {
        // Log only if value or state has changed since last log
        if (currentUrineLevel !== lastLoggedUrineLevel || currentUpaState !== lastLoggedUpaState) {
            
            const timeString = new Date().toISOString();
            
            const stmt = db.prepare("INSERT INTO readings (timestamp, value, wpa_state) VALUES (?, ?, ?)");
            stmt.run(timeString, currentUrineLevel, currentUpaState);
            stmt.finalize();
            
            console.log(`Logged: ${timeString} - ${currentUrineLevel}% [State: ${currentUpaState}]`);
            
            // Update last logged values
            lastLoggedUrineLevel = currentUrineLevel;
            lastLoggedUpaState = currentUpaState;
        }
    }
}, 1000);

