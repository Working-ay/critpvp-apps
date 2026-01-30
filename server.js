const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'critpvp-secret-key',
    resave: false,
    saveUninitialized: true
}));

// ===========================
// USER ROUTES
// ===========================

// Register Route (Fixed: Handles IGN and Discord)
app.post('/api/register', (req, res) => {
    const { email, password, ign, discord } = req.body; 
    const hash = bcrypt.hashSync(password, 10);
    
    db.run("INSERT INTO users (email, password, ign, discord) VALUES (?, ?, ?, ?)", 
        [email, hash, ign, discord], 
        function(err) {
            if (err) {
                console.log("Register Error:", err);
                return res.json({ success: false, message: "Email already exists." });
            }
            res.json({ success: true });
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.json({ success: false, message: "Invalid credentials." });
        }
        req.session.userId = user.id;
        req.session.role = user.role;
        res.json({ success: true, role: user.role });
    });
});

app.get('/api/check-session', (req, res) => {
    if (req.session.userId) {
        res.json({ loggedIn: true, role: req.session.role });
    } else {
        res.json({ loggedIn: false });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// ===========================
// APPLICATION ROUTES
// ===========================

app.post('/api/submit', (req, res) => {
    if (!req.session.userId) return res.status(403).json({ success: false });
    const { type, answers } = req.body;
    db.run("INSERT INTO applications (user_id, type, answers) VALUES (?, ?, ?)", 
        [req.session.userId, type, JSON.stringify(answers)], (err) => {
            if (err) return res.json({ success: false });
            res.json({ success: true });
    });
});

app.get('/api/my-applications', (req, res) => {
    if (!req.session.userId) return res.status(403).json([]);
    db.all("SELECT * FROM applications WHERE user_id = ?", [req.session.userId], (err, rows) => {
        res.json(rows);
    });
});

// ===========================
// ADMIN ROUTES
// ===========================

// Get All Applications (Fixed: Includes IGN, Discord, and Unique App ID)
app.get('/api/admin/applications', (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).json([]);
    
    // We select applications.id as 'app_id' specifically to avoid conflict with users.id
    const sql = `
        SELECT applications.id as app_id, applications.*, users.email, users.ign, users.discord 
        FROM applications 
        JOIN users ON applications.user_id = users.id 
        ORDER BY timestamp DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Admin Fetch Error:", err);
            return res.json([]);
        }
        res.json(rows);
    });
});

// Update Application Status (Fixed: Missing in your previous code)
app.post('/api/admin/status', (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).json({ success: false });
    const { id, status, reason } = req.body;
    
    console.log(`Admin updating App ID ${id} to ${status}`);

    db.run("UPDATE applications SET status = ?, reason = ? WHERE id = ?", [status, reason, id], function(err) {
        if (err) {
            console.error("Status Update Error:", err);
            return res.json({ success: false });
        }
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});