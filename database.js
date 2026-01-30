const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const db = new sqlite3.Database('./critpvp.db');

db.serialize(() => {
    // UPDATED: Added ign and discord columns
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT,
        ign TEXT,
        discord TEXT,
        role TEXT DEFAULT 'user'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        type TEXT,
        answers TEXT,
        status TEXT DEFAULT 'Pending',
        reason TEXT DEFAULT '',
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Create Default Admin
    const adminEmail = 'ayrixmc@critpvp.xyz';
    const adminPass = 'ayrixmc@';
    
    db.get("SELECT * FROM users WHERE email = ?", [adminEmail], (err, row) => {
        if (!row) {
            const hash = bcrypt.hashSync(adminPass, 10);
            // Admin doesn't need IGN/Discord strictly, but we pass placeholders
            db.run("INSERT INTO users (email, password, role, ign, discord) VALUES (?, ?, ?, ?, ?)", 
                [adminEmail, hash, 'admin', 'Admin', 'Admin#0000']);
            console.log("Admin account created.");
        }
    });
});

module.exports = db;