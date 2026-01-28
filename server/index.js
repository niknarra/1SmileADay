const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const authRoutes = require('./routes/auth');
const entriesRoutes = require('./routes/entries');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Initialize database
db.init();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/entries', entriesRoutes);

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║         1 SMILE A DAY                  ║
║   Server running on port ${PORT}          ║
║   http://localhost:${PORT}                ║
╚════════════════════════════════════════╝
    `);
});
