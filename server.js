const express = require('express');
require('dotenv').config();
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ==========================================
// IMAGE UPLOAD SETUP (Multer)
// ==========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'uploads/'); },
    filename: (req, file, cb) => { cb(null, Date.now() + path.extname(file.originalname)); }
});
const upload = multer({ storage: storage });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// DATABASE CONNECTION (CLOUD SECURE)
// ==========================================
const db = mysql.createConnection({
    host: process.env.DB_HOST, 
    user: process.env.DB_USER, 
    password: process.env.DB_PASS, 
    database: process.env.DB_NAME, 
    port: process.env.DB_PORT
});

db.connect(err => {
    if (err) console.error('❌ Cloud DB Error:', err.message);
    else console.log('✅ Connected to LIVE Cloud MySQL Database!');
});

// ==========================================
// EMAIL SETUP
// ==========================================
const transporter = nodemailer.createTransport({
    service: 'gmail', auth: { user: 'test@gmail.com', pass: 'password' }
});

app.post('/api/send-email', (req, res) => {
    console.log(`📧 Simulated Email sent to ${req.body.to_email}`);
    res.status(200).json({ message: 'Email logic executed!' });
});

// ==========================================
// REAL-TIME CHAT ENGINE (Socket.io)
// ==========================================
io.on('connection', (socket) => {
    socket.on('join_chat', (data) => {
        const room = `chat_${data.item_id}_${Math.min(data.sender_id, data.receiver_id)}_${Math.max(data.sender_id, data.receiver_id)}`;
        socket.join(room);
    });

    socket.on('send_message', (data) => {
        const room = `chat_${data.item_id}_${Math.min(data.sender_id, data.receiver_id)}_${Math.max(data.sender_id, data.receiver_id)}`;
        db.query('INSERT INTO messages (sender_id, receiver_id, item_id, message_text) VALUES (?, ?, ?, ?)',
            [data.sender_id, data.receiver_id, data.item_id, data.message_text], (err) => {
                if (!err) io.to(room).emit('receive_message', data);
            });
    });
});

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================
app.post('/api/register', (req, res) => {
    const { username, email, password, phone } = req.body;
    db.query('INSERT INTO users (username, email, password_hash, phone_number) VALUES (?, ?, ?, ?)', [username, email, password, phone], (err) => {
        if (err) return res.status(500).json({ message: 'Error saving user' });
        res.status(201).json({ message: 'Registration successful!' });
    });
});

app.post('/api/login', (req, res) => {
    db.query('SELECT * FROM users WHERE email = ? AND password_hash = ?', [req.body.email, req.body.password], (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
        res.status(200).json({ message: 'Login successful', user_id: results[0].user_id, username: results[0].username });
    });
});

// ==========================================
// REPORT POSTING ROUTES (Lost & Found)
// ==========================================
app.post('/api/report-lost', upload.single('image'), (req, res) => {
    const { user_id, category_id, item_name, description, date_lost, location_lost, contact_info } = req.body;
    const img = req.file ? '/uploads/' + req.file.filename : null;
    db.query('INSERT INTO lost_items (user_id, category_id, item_name, description, date_lost, location_lost, contact_info, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [user_id, category_id, item_name, description, date_lost, location_lost, contact_info, img], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(200).json({ message: "Reported successfully!" });
        });
});

app.post('/api/report-found', upload.single('image'), (req, res) => {
    const { user_id, category_id, item_name, description, date_found, location_found, contact_info } = req.body;
    const img = req.file ? '/uploads/' + req.file.filename : null;
    db.query('INSERT INTO found_items (user_id, category_id, item_name, description, date_found, location_found, contact_info, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [user_id, category_id, item_name, description, date_found, location_found, contact_info, img], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(200).json({ message: "Reported successfully!" });
        });
});

// ==========================================
// DATA FETCHING ROUTES
// ==========================================
app.get('/api/lost-items', (req, res) => {
    db.query('SELECT l.*, c.category_name FROM lost_items l JOIN item_categories c ON l.category_id = c.category_id ORDER BY l.date_lost DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results || []);
    });
});

app.get('/api/found-items', (req, res) => {
    db.query('SELECT f.*, c.category_name FROM found_items f JOIN item_categories c ON f.category_id = c.category_id ORDER BY f.date_found DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results || []);
    });
});

app.get('/api/matches', (req, res) => {
    const sql = `SELECT l.item_name AS lost_name, f.item_name AS found_name, c.category_name, l.date_lost, f.date_found, f.location_found 
                 FROM lost_items l JOIN found_items f ON l.category_id = f.category_id JOIN item_categories c ON l.category_id = c.category_id 
                 WHERE f.date_found >= l.date_lost`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results || []);
    });
});

app.get('/api/chat-history/:item_id/:u1/:u2', (req, res) => {
    const sql = `SELECT * FROM messages WHERE item_id = ? AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) ORDER BY sent_at ASC`;
    db.query(sql, [req.params.item_id, req.params.u1, req.params.u2, req.params.u2, req.params.u1], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results || []);
    });
});

// ==========================================
// DELETE ROUTES (LOST & FOUND)
// ==========================================
app.delete('/api/delete-lost/:id', (req, res) => {
    db.query('DELETE FROM lost_items WHERE lost_item_id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Lost item resolved!' });
    });
});

// NAYA: Found item delete karne ki API (Admin ke Wipe Item button ke liye)
app.delete('/api/delete-found/:id', (req, res) => {
    db.query('DELETE FROM found_items WHERE found_item_id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Found item resolved!' });
    });
});

// ==========================================
// ADMIN USER MANAGEMENT ROUTES
// ==========================================

// NAYA: Frontend exactly '/api/users' dhund raha tha
app.get('/api/users', (req, res) => {
    db.query('SELECT user_id, username, email FROM users ORDER BY user_id DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results || []);
    });
});

app.delete('/api/admin/users/:id', (req, res) => {
    db.query('DELETE FROM users WHERE user_id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'User deleted' });
    });
});

// ==========================================
// START SERVER
// ==========================================
server.listen(3000, () => {
    console.log('🚀 Server is running on http://localhost:3000');
});