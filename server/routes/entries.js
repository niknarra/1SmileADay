const express = require('express');
const db = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Rating labels for reference
// 1 = Small win, 2 = Made my day, 3 = Pure joy

// Minimum character requirement
const MIN_CHARS = 100;

// Get dashboard data (streak, missed days, today's entry, stats)
router.get('/dashboard', (req, res) => {
    try {
        const userId = req.user.id;
        const user = db.getUserById(userId);
        const today = db.formatDate(new Date());
        
        const streak = db.getStreak(userId);
        const missedDays = db.getMissedDays(userId, user.signup_date);
        const todayEntry = db.getEntry(userId, today);
        const totalEntries = db.getTotalEntries(userId);

        res.json({
            streak,
            missedDays,
            todayEntry: todayEntry ? {
                date: todayEntry.date,
                text: todayEntry.text,
                rating: todayEntry.rating,
                skipped: !!todayEntry.skipped
            } : null,
            totalEntries,
            today
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get entries for a specific month (for calendar)
router.get('/month/:year/:month', (req, res) => {
    try {
        const { year, month } = req.params;
        const entries = db.getEntriesForMonth(req.user.id, parseInt(year), parseInt(month));
        
        // Convert to a map for easy lookup
        const entriesMap = {};
        entries.forEach(entry => {
            entriesMap[entry.date] = {
                text: entry.text,
                rating: entry.rating,
                skipped: !!entry.skipped
            };
        });

        res.json({ entries: entriesMap });
    } catch (error) {
        console.error('Get month entries error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get a single entry
router.get('/:date', (req, res) => {
    try {
        const entry = db.getEntry(req.user.id, req.params.date);
        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }
        res.json({
            date: entry.date,
            text: entry.text,
            rating: entry.rating,
            skipped: !!entry.skipped,
            createdAt: entry.created_at,
            updatedAt: entry.updated_at
        });
    } catch (error) {
        console.error('Get entry error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create or update entry
router.post('/', (req, res) => {
    try {
        const { date, text, rating, skipped } = req.body;

        if (!date) {
            return res.status(400).json({ error: 'Date is required' });
        }

        if (!skipped && (!text || !text.trim())) {
            return res.status(400).json({ error: 'Entry text is required' });
        }

        if (!skipped && text.trim().length < MIN_CHARS) {
            return res.status(400).json({ error: `Entry must be at least ${MIN_CHARS} characters` });
        }

        // Validate rating if provided (1 = Small win, 2 = Made my day, 3 = Pure joy)
        if (rating !== undefined && rating !== null && ![1, 2, 3].includes(rating)) {
            return res.status(400).json({ error: 'Invalid rating value' });
        }

        // Validate date is not in the future
        const entryDate = new Date(date + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (entryDate > today) {
            return res.status(400).json({ error: 'Cannot create entry for future date' });
        }

        db.createOrUpdateEntry(
            req.user.id, 
            date, 
            skipped ? null : text.trim(), 
            !!skipped,
            skipped ? null : (rating || null)
        );

        res.json({ 
            message: skipped ? 'Day skipped' : 'Entry saved',
            date,
            rating: skipped ? null : (rating || null),
            skipped: !!skipped
        });
    } catch (error) {
        console.error('Save entry error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get random entry
router.get('/action/random', (req, res) => {
    try {
        const entry = db.getRandomEntry(req.user.id);
        if (!entry) {
            return res.status(404).json({ error: 'No entries found' });
        }
        res.json({
            date: entry.date,
            text: entry.text,
            rating: entry.rating
        });
    } catch (error) {
        console.error('Random entry error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user stats for profile
router.get('/action/stats', (req, res) => {
    try {
        const userId = req.user.id;
        const totalEntries = db.getTotalEntries(userId);
        const currentStreak = db.getStreak(userId);
        const longestStreak = db.getLongestStreak(userId);

        res.json({
            totalEntries,
            currentStreak,
            longestStreak
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Export all entries
router.get('/action/export', (req, res) => {
    try {
        const user = db.getUserById(req.user.id);
        const entries = db.getAllEntries(req.user.id);
        const streak = db.getStreak(req.user.id);

        const ratingLabels = { 1: 'Small win', 2: 'Made my day', 3: 'Pure joy' };

        const exportData = {
            exportedAt: new Date().toISOString(),
            version: 3,
            user: { email: user.email },
            entries: entries.reduce((acc, entry) => {
                acc[entry.date] = {
                    text: entry.text,
                    rating: entry.rating,
                    ratingLabel: entry.rating ? ratingLabels[entry.rating] : null,
                    skipped: !!entry.skipped,
                    createdAt: entry.created_at,
                    updatedAt: entry.updated_at
                };
                return acc;
            }, {}),
            stats: {
                totalEntries: db.getTotalEntries(req.user.id),
                currentStreak: streak
            }
        };

        res.json(exportData);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
