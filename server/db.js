const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/smiles.db');
let db;

function init() {
    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Create users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            signup_date TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create entries table
    db.exec(`
        CREATE TABLE IF NOT EXISTS entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            text TEXT,
            rating INTEGER DEFAULT NULL,
            skipped INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id, date)
        )
    `);

    // Add rating column if it doesn't exist (migration for existing databases)
    try {
        db.exec(`ALTER TABLE entries ADD COLUMN rating INTEGER DEFAULT NULL`);
    } catch (e) {
        // Column already exists, ignore
    }

    console.log('Database initialized');
    return db;
}

function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call init() first.');
    }
    return db;
}

// User operations
function createUser(email, hashedPassword, signupDate) {
    const stmt = getDb().prepare(`
        INSERT INTO users (email, password, signup_date) 
        VALUES (?, ?, ?)
    `);
    const result = stmt.run(email, hashedPassword, signupDate);
    return result.lastInsertRowid;
}

function getUserByEmail(email) {
    const stmt = getDb().prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
}

function getUserById(id) {
    const stmt = getDb().prepare('SELECT id, email, signup_date, created_at FROM users WHERE id = ?');
    return stmt.get(id);
}

function updateUserPassword(id, hashedPassword) {
    const stmt = getDb().prepare('UPDATE users SET password = ? WHERE id = ?');
    stmt.run(hashedPassword, id);
}

// Entry operations
function createOrUpdateEntry(userId, date, text, skipped = false, rating = null) {
    const now = new Date().toISOString();
    const stmt = getDb().prepare(`
        INSERT INTO entries (user_id, date, text, rating, skipped, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, date) DO UPDATE SET
            text = excluded.text,
            rating = excluded.rating,
            skipped = excluded.skipped,
            updated_at = excluded.updated_at
    `);
    stmt.run(userId, date, text, rating, skipped ? 1 : 0, now, now);
}

function getEntry(userId, date) {
    const stmt = getDb().prepare(`
        SELECT * FROM entries WHERE user_id = ? AND date = ?
    `);
    return stmt.get(userId, date);
}

function getAllEntries(userId) {
    const stmt = getDb().prepare(`
        SELECT * FROM entries WHERE user_id = ? ORDER BY date DESC
    `);
    return stmt.all(userId);
}

function getEntriesForMonth(userId, year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    const stmt = getDb().prepare(`
        SELECT * FROM entries 
        WHERE user_id = ? AND date >= ? AND date <= ?
        ORDER BY date ASC
    `);
    return stmt.all(userId, startDate, endDate);
}

function getStreak(userId) {
    const entries = getDb().prepare(`
        SELECT date, skipped FROM entries 
        WHERE user_id = ? AND skipped = 0 AND text IS NOT NULL
        ORDER BY date DESC
    `).all(userId);

    if (entries.length === 0) return 0;

    let streak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
        const dateStr = formatDate(checkDate);
        const entry = entries.find(e => e.date === dateStr);
        
        if (entry) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
}

function getRandomEntry(userId) {
    const stmt = getDb().prepare(`
        SELECT * FROM entries 
        WHERE user_id = ? AND skipped = 0 AND text IS NOT NULL
        ORDER BY RANDOM() 
        LIMIT 1
    `);
    return stmt.get(userId);
}

function getTotalEntries(userId) {
    const stmt = getDb().prepare(`
        SELECT COUNT(*) as count FROM entries 
        WHERE user_id = ? AND skipped = 0 AND text IS NOT NULL
    `);
    return stmt.get(userId).count;
}

function getMissedDays(userId, signupDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const signup = new Date(signupDate + 'T00:00:00');
    const missedDays = [];
    
    let checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - 1); // Start from yesterday
    
    while (checkDate >= signup) {
        const dateStr = formatDate(checkDate);
        const entry = getEntry(userId, dateStr);
        
        if (!entry) {
            missedDays.push(dateStr);
        }
        
        checkDate.setDate(checkDate.getDate() - 1);
    }
    
    return missedDays.reverse(); // Oldest first
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getLongestStreak(userId) {
    const entries = getDb().prepare(`
        SELECT date FROM entries 
        WHERE user_id = ? AND skipped = 0 AND text IS NOT NULL
        ORDER BY date ASC
    `).all(userId);

    if (entries.length === 0) return 0;

    let longestStreak = 1;
    let currentStreak = 1;
    
    for (let i = 1; i < entries.length; i++) {
        const prevDate = new Date(entries[i - 1].date + 'T00:00:00');
        const currDate = new Date(entries[i].date + 'T00:00:00');
        
        // Check if dates are consecutive
        const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            currentStreak++;
            longestStreak = Math.max(longestStreak, currentStreak);
        } else {
            currentStreak = 1;
        }
    }

    return longestStreak;
}

module.exports = {
    init,
    getDb,
    createUser,
    getUserByEmail,
    getUserById,
    updateUserPassword,
    createOrUpdateEntry,
    getEntry,
    getAllEntries,
    getEntriesForMonth,
    getStreak,
    getLongestStreak,
    getRandomEntry,
    getTotalEntries,
    getMissedDays,
    formatDate
};
