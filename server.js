const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const db = require('./db'); // Importing the new Postgres DB

const app = express();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Important: Trust proxy is required for Vercel/Express sessions
app.set('trust proxy', 1);

app.use(session({
    secret: 'critpvp-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true, maxAge: 24 * 60 * 60 * 1000 } // Secure for Vercel (HTTPS)
}));

// ===========================
// USER ROUTES
// ===========================

app.post('/api/register', async (req, res) => {
    const { email, password, ign, discord } = req.body; 
    const hash = bcrypt.hashSync(password, 10);
    
    try {
        await db.query(
            "INSERT INTO users (email, password, ign, discord) VALUES ($1, $2, $3, $4)", 
            [email, hash, ign, discord]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("Register Error:", err);
        res.json({ success: false, message: "Email already exists." });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.json({ success: false, message: "Invalid credentials." });
        }
        req.session.userId = user.id;
        req.session.role = user.role;
        res.json({ success: true, role: user.role });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
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

app.post('/api/submit', async (req, res) => {
    if (!req.session.userId) return res.status(403).json({ success: false });
    const { type, answers } = req.body;
    
    try {
        await db.query(
            "INSERT INTO applications (user_id, type, answers) VALUES ($1, $2, $3)", 
            [req.session.userId, type, JSON.stringify(answers)]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false });
    }
});

app.get('/api/my-applications', async (req, res) => {
    if (!req.session.userId) return res.status(403).json([]);
    try {
        const result = await db.query("SELECT * FROM applications WHERE user_id = $1", [req.session.userId]);
        res.json(result.rows);
    } catch (err) {
        res.json([]);
    }
});

// ===========================
// ADMIN ROUTES
// ===========================

app.get('/api/admin/applications', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).json([]);
    
    const sql = `
        SELECT applications.id as app_id, applications.*, users.email, users.ign, users.discord 
        FROM applications 
        JOIN users ON applications.user_id = users.id 
        ORDER BY timestamp DESC
    `;

    try {
        const result = await db.query(sql);
        res.json(result.rows);
    } catch (err) {
        console.error("Admin Error:", err);
        res.json([]);
    }
});

app.post('/api/admin/status', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).json({ success: false });
    const { id, status, reason } = req.body;
    
    try {
        await db.query(
            "UPDATE applications SET status = $1, reason = $2 WHERE id = $3", 
            [status, reason, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("Update Error:", err);
        res.json({ success: false });
    }
});

// Vercel Export (Do not use app.listen)
module.exports = app;