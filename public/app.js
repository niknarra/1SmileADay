// ============================================
// 1 SMILE A DAY - Frontend Application
// ============================================

// ============================================
// STATE
// ============================================
const state = {
    user: null,
    token: null,
    currentDate: new Date(),
    dashboard: null,
    monthEntries: {},
    isSignUp: false,
    loading: false,
    showTour: false,
    tourStep: 0,
    showProfile: false,
    profileStats: null
};

// ============================================
// API HELPERS
// ============================================
const API_BASE = '/api';

async function api(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ============================================
// AUTH
// ============================================
async function register(email, password) {
    const data = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('smileToken', data.token);
    return data;
}

async function login(email, password) {
    const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('smileToken', data.token);
    return data;
}

async function checkAuth() {
    const token = localStorage.getItem('smileToken');
    if (!token) return false;

    state.token = token;
    try {
        const data = await api('/auth/me');
        state.user = data.user;
        return true;
    } catch (error) {
        localStorage.removeItem('smileToken');
        state.token = null;
        return false;
    }
}

function logout() {
    state.token = null;
    state.user = null;
    state.dashboard = null;
    localStorage.removeItem('smileToken');
    render();
}

// ============================================
// ENTRIES API
// ============================================
async function fetchDashboard() {
    const data = await api('/entries/dashboard');
    state.dashboard = data;
    return data;
}

async function fetchMonthEntries(year, month) {
    const data = await api(`/entries/month/${year}/${month}`);
    state.monthEntries = data.entries;
    return data.entries;
}

async function saveEntry(date, text, rating = null) {
    await api('/entries', {
        method: 'POST',
        body: JSON.stringify({ date, text, rating, skipped: false })
    });
}

async function skipDay(date) {
    await api('/entries', {
        method: 'POST',
        body: JSON.stringify({ date, skipped: true })
    });
}

async function fetchRandomEntry() {
    return await api('/entries/action/random');
}

async function exportData() {
    const data = await api('/entries/action/export');
    
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `1-smile-a-day-backup-${getTodayString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function fetchStats() {
    const data = await api('/entries/action/stats');
    state.profileStats = data;
    return data;
}

async function changePassword(currentPassword, newPassword) {
    return await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
    });
}

// ============================================
// DATE UTILITIES
// ============================================
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getTodayString() {
    return formatDate(new Date());
}

function formatDateForDisplay(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// ============================================
// RATING HELPERS
// ============================================
const RATING_LABELS = {
    1: 'Small win',
    2: 'Made my day',
    3: 'Pure joy'
};

function getRatingLabel(rating) {
    return RATING_LABELS[rating] || null;
}

function renderRatingSelector(prefix = 'entry') {
    return `
        <div class="rating-section">
            <div class="rating-label">How big was this smile? (optional)</div>
            <div class="rating-options">
                <label class="rating-option">
                    <input type="radio" name="${prefix}Rating" value="1">
                    <span class="rating-btn" data-rating="1">Small win</span>
                </label>
                <label class="rating-option">
                    <input type="radio" name="${prefix}Rating" value="2">
                    <span class="rating-btn" data-rating="2">Made my day</span>
                </label>
                <label class="rating-option">
                    <input type="radio" name="${prefix}Rating" value="3">
                    <span class="rating-btn" data-rating="3">Pure joy</span>
                </label>
            </div>
        </div>
    `;
}

function getSelectedRating(prefix = 'entry') {
    const selected = document.querySelector(`input[name="${prefix}Rating"]:checked`);
    return selected ? parseInt(selected.value) : null;
}

// ============================================
// CHARACTER COUNTER
// ============================================
const MIN_CHARS = 100;

function renderCharCounter(inputId) {
    return `
        <div class="char-counter" id="${inputId}Counter">
            <div class="char-counter-bar">
                <div class="char-counter-fill" id="${inputId}Fill"></div>
            </div>
            <span class="char-counter-text" id="${inputId}Text">0/${MIN_CHARS}</span>
            <span class="char-counter-message" id="${inputId}Message">start writing...</span>
        </div>
    `;
}

function updateCharCounter(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const length = input.value.length;
    const percent = Math.min((length / MIN_CHARS) * 100, 100);
    
    const fill = document.getElementById(`${inputId}Fill`);
    const text = document.getElementById(`${inputId}Text`);
    const message = document.getElementById(`${inputId}Message`);
    
    if (!fill || !text || !message) return;
    
    fill.style.width = `${percent}%`;
    text.textContent = `${length}/${MIN_CHARS}`;
    
    // Update classes and message based on progress
    fill.classList.remove('almost', 'complete');
    text.classList.remove('almost', 'complete');
    
    if (length >= MIN_CHARS) {
        fill.classList.add('complete');
        text.classList.add('complete');
        message.textContent = 'beautiful.';
    } else if (length >= MIN_CHARS * 0.6) {
        fill.classList.add('almost');
        text.classList.add('almost');
        message.textContent = 'almost there, keep going...';
    } else if (length >= MIN_CHARS * 0.3) {
        message.textContent = 'you\'re getting there...';
    } else if (length > 0) {
        message.textContent = 'keep writing...';
    } else {
        message.textContent = 'start writing...';
    }
}

function setupCharCounter(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.addEventListener('input', () => updateCharCounter(inputId));
        // Initialize counter
        updateCharCounter(inputId);
    }
}

function isMinCharsReached(inputId) {
    const input = document.getElementById(inputId);
    return input && input.value.length >= MIN_CHARS;
}

// ============================================
// UI: AUTH SCREEN
// ============================================
function renderAuthScreen() {
    const formTitle = state.isSignUp ? 'Sign Up' : 'Log In';
    const toggleText = state.isSignUp ? 'Already have an account? Log in' : 'New? Sign up';

    return `
        <div class="auth-screen">
            <div class="auth-quote">
                <div class="auth-quote-text">
                    86,400 seconds in a day.<br>
                    A smile takes less than one.
                </div>
                <div class="auth-quote-stat">
                    Find yours.
                </div>
            </div>
            <div class="auth-form">
                <h2>${formTitle}</h2>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="authEmail" placeholder="your@email.com" />
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="authPassword" placeholder="••••••" />
                </div>
                <div id="authMessage"></div>
                <button onclick="handleAuth()">${formTitle}</button>
            </div>
            <div class="auth-toggle">
                <button onclick="toggleAuthMode()">${toggleText}</button>
            </div>
        </div>
    `;
}

async function handleAuth() {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const messageEl = document.getElementById('authMessage');

    try {
        if (state.isSignUp) {
            await register(email, password);
            // Show onboarding tour for new users
            state.showTour = true;
            state.tourStep = 0;
            render();
        } else {
            await login(email, password);
            await loadDashboard();
            render();
        }
    } catch (error) {
        messageEl.innerHTML = `<div class="error">${error.message}</div>`;
    }
}

function toggleAuthMode() {
    state.isSignUp = !state.isSignUp;
    render();
}

// ============================================
// ONBOARDING TOUR
// ============================================
const TOUR_STEPS = [
    {
        icon: '👋',
        title: 'Welcome',
        text: `You just took the first step toward a <strong>happier mindset</strong>.<br><br>This isn't just another app. It's a daily practice that will change how you see your life.`
    },
    {
        icon: '🌍',
        title: 'The Problem',
        text: `We live in a world that amplifies the negative. Bad news spreads faster. Complaints feel easier. <strong>Our brains are wired to remember what went wrong.</strong><br><br>But what if you could rewire that?`
    },
    {
        icon: '✨',
        title: 'The Solution',
        text: `Every day, you'll log <strong>just one thing</strong> that made you smile.<br><br>Not three. Not five. Just one.<br><br>Because even on your worst days, there's always <em>something</em>.`
    },
    {
        icon: '📝',
        title: 'The Rules',
        text: `No photos. No likes. No followers.<br><br><strong>Just your words. For you.</strong><br><br>This is a private space for honest reflection. No one sees it but you.`
    },
    {
        icon: '🔥',
        title: 'The Streak',
        text: `Build a streak by logging every day. Miss a day? <strong>You'll need to fill it in before moving on.</strong><br><br>Because the habit matters. The reflection matters. Even looking back at a hard day and finding the light — that matters.`
    },
    {
        icon: '📅',
        title: 'The Proof',
        text: `Over time, your calendar will fill with moments of joy. Scroll back through months of entries and see the pattern:<br><br><strong>Your life has more good in it than you think.</strong>`
    },
    {
        final: true,
        title: 'One Last Thing',
        quote: `"A smile is the light in your window that tells others there is a caring, sharing person inside."`,
        author: 'Denis Waitley'
    }
];

function renderTour() {
    const step = TOUR_STEPS[state.tourStep];
    const isLast = state.tourStep === TOUR_STEPS.length - 1;
    const isFirst = state.tourStep === 0;

    let stepContent = '';
    
    if (step.final) {
        stepContent = `
            <div class="tour-step active final">
                <div class="tour-title">${step.title}</div>
                <div class="tour-quote">${step.quote}</div>
                <div class="tour-quote-author">— ${step.author}</div>
                <div class="tour-actions">
                    <button onclick="completeTour()">Begin Your Journey</button>
                </div>
            </div>
        `;
    } else {
        stepContent = `
            <div class="tour-step active">
                <div class="tour-icon">${step.icon}</div>
                <div class="tour-title">${step.title}</div>
                <div class="tour-text">${step.text}</div>
                <div class="tour-actions">
                    ${!isFirst ? '<button class="secondary-btn" onclick="prevTourStep()">Back</button>' : ''}
                    <button onclick="nextTourStep()">${isLast ? 'Finish' : 'Next'}</button>
                </div>
            </div>
        `;
    }

    // Progress dots
    const dots = TOUR_STEPS.map((_, i) => {
        let className = 'tour-dot';
        if (i === state.tourStep) className += ' active';
        else if (i < state.tourStep) className += ' completed';
        return `<div class="${className}"></div>`;
    }).join('');

    return `
        <div class="tour-overlay">
            <div class="tour-container">
                ${stepContent}
                <div class="tour-progress">
                    ${dots}
                </div>
                ${!step.final ? '<button class="tour-skip" onclick="completeTour()">Skip tour</button>' : ''}
            </div>
        </div>
    `;
}

function nextTourStep() {
    if (state.tourStep < TOUR_STEPS.length - 1) {
        state.tourStep++;
        render();
    }
}

function prevTourStep() {
    if (state.tourStep > 0) {
        state.tourStep--;
        render();
    }
}

async function completeTour() {
    state.showTour = false;
    state.tourStep = 0;
    await loadDashboard();
    render();
}

// ============================================
// UI: DASHBOARD
// ============================================
async function loadDashboard() {
    state.loading = true;
    render();
    
    await fetchDashboard();
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth() + 1;
    await fetchMonthEntries(year, month);
    
    state.loading = false;
}

function renderDashboard() {
    if (state.loading || !state.dashboard) {
        return '<div class="loading">Loading</div>';
    }

    const { streak, missedDays, todayEntry, totalEntries, today } = state.dashboard;
    const streakEmoji = streak > 0 ? '🔥' : '⊘';
    const oldestMissedDay = missedDays.length > 0 ? missedDays[0] : null;

    let mainSection = '';
    
    if (oldestMissedDay) {
        // Show backfill section
        mainSection = `
            <div class="backfill-section">
                <h2>Before you continue...</h2>
                <div class="backfill-date">${formatDateForDisplay(oldestMissedDay)}</div>
                <div class="backfill-message">
                    You missed logging this day. What made you smile?
                </div>
                <textarea id="backfillInput" placeholder="What made you smile that day..." oninput="updateCharCounter('backfillInput')"></textarea>
                ${renderCharCounter('backfillInput')}
                ${renderRatingSelector('backfill')}
                <button onclick="handleBackfillEntry('${oldestMissedDay}')">Save Smile</button>
                <div class="backfill-options">
                    <button class="backfill-options-toggle" onclick="toggleBackfillOptions()">▸ Options</button>
                    <div class="backfill-options-content" id="backfillOptionsContent">
                        <button class="skip-day-btn" onclick="handleSkipDay('${oldestMissedDay}')">Nothing made me smile that day</button>
                    </div>
                </div>
            </div>
        `;
    } else if (todayEntry && !todayEntry.skipped) {
        // Show today's entry (already logged)
        const ratingLabel = getRatingLabel(todayEntry.rating);
        mainSection = `
            <div class="entry-section">
                <h2>Today's Smile</h2>
                <div class="entry-date">${today}</div>
                <div class="entry-view">${escapeHtml(todayEntry.text)}</div>
                ${ratingLabel ? `<div class="rating-display">${ratingLabel}</div>` : ''}
            </div>
        `;
    } else {
        // Show entry form for today
        mainSection = `
            <div class="entry-section">
                <h2>What made you smile today?</h2>
                <div class="entry-date">${today}</div>
                <textarea id="entryInput" placeholder="Write something that made you happy today..." oninput="updateCharCounter('entryInput')"></textarea>
                ${renderCharCounter('entryInput')}
                ${renderRatingSelector()}
                <button onclick="handleSaveEntry()" id="saveEntryBtn">Save Smile</button>
            </div>
        `;
    }

    return `
        <div class="dashboard active">
            <div class="streak-box">
                <div class="streak-number">${streak}</div>
                <div class="streak-label">Day Streak</div>
                <div class="streak-status ${streak > 0 ? 'active' : 'inactive'}">
                    ${streakEmoji}
                </div>
                <button class="random-smile-btn" onclick="showRandomSmile()">Random Smile</button>
            </div>

            ${renderCalendar()}

            ${mainSection}

                </div>
            `;
}

// ============================================
// UI: CALENDAR
// ============================================
function renderCalendar() {
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);

    const daysInMonth = lastDay.getDate();
    const daysInPrevMonth = prevLastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    let calendarDays = '';

    // Day headers
    for (let i = 0; i < 7; i++) {
        calendarDays += `<div class="calendar-day-header">${dayNames[i]}</div>`;
    }

    // Previous month days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        calendarDays += `<div class="calendar-day other-month">${day}</div>`;
    }

    // Current month days
    const today = getTodayString();
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const entry = state.monthEntries[dateString];
        const hasEntry = !!entry;
        const isSkipped = entry && entry.skipped;
        const hasRealEntry = hasEntry && !isSkipped;
        const rating = entry ? entry.rating : null;
        const isTodayDate = dateString === today;

        // Check if date is in future
        const checkDate = new Date(year, month, day);
        const isFuture = checkDate > todayDate;

        const classes = ['calendar-day'];
        if (isFuture) {
            classes.push('future');
        } else if (isSkipped) {
            classes.push('skipped');
        } else if (hasRealEntry) {
            // Add rating class for heatmap coloring
            if (rating) {
                classes.push(`rating-${rating}`);
            } else {
                classes.push('has-entry');
            }
        }
        if (isTodayDate) classes.push('today');

        // Determine click behavior
        let clickHandler = '';
        let cursor = 'default';
        if (!isFuture && (hasRealEntry || isSkipped)) {
            clickHandler = `onclick="openEntry('${dateString}')"`;
            cursor = 'pointer';
        }

        calendarDays += `
            <div class="${classes.join(' ')}" ${clickHandler} style="cursor: ${cursor}">
                ${day}
            </div>
        `;
    }

    // Next month days
    const totalCells = Math.ceil((startingDayOfWeek + daysInMonth) / 7) * 7;
    for (let day = 1; day <= totalCells - startingDayOfWeek - daysInMonth; day++) {
        calendarDays += `<div class="calendar-day other-month">${day}</div>`;
    }

    return `
        <div class="calendar-section">
            <h2>Your Smiles</h2>
            <div class="calendar-nav">
                <button onclick="prevMonth()">← Prev</button>
                <div class="calendar-month">${monthNames[month]} ${year}</div>
                <button onclick="nextMonth()">Next →</button>
            </div>
            <div class="calendar-grid">
                ${calendarDays}
            </div>
            <div class="calendar-legend">
                <div class="calendar-legend-item">
                    <div class="legend-dot rating-1"></div>
                    <span>Small win</span>
                </div>
                <div class="calendar-legend-item">
                    <div class="legend-dot rating-2"></div>
                    <span>Made my day</span>
                </div>
                <div class="calendar-legend-item">
                    <div class="legend-dot rating-3"></div>
                    <span>Pure joy</span>
                </div>
            </div>
        </div>
    `;
}

async function prevMonth() {
    state.currentDate.setMonth(state.currentDate.getMonth() - 1);
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth() + 1;
    await fetchMonthEntries(year, month);
    render();
}

async function nextMonth() {
    state.currentDate.setMonth(state.currentDate.getMonth() + 1);
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth() + 1;
    await fetchMonthEntries(year, month);
    render();
}

// ============================================
// ENTRY HANDLERS
// ============================================
async function handleSaveEntry() {
    const text = document.getElementById('entryInput').value;
    if (!text.trim()) {
        alert('Write something before saving.');
        return;
    }
    
    if (text.length < MIN_CHARS) {
        alert(`Keep going! You need at least ${MIN_CHARS} characters to save. You have ${text.length}.`);
        return;
    }
    
    const rating = getSelectedRating('entry');
    
    try {
        await saveEntry(getTodayString(), text, rating);
        await loadDashboard();
        render();
    } catch (error) {
        alert('Failed to save: ' + error.message);
    }
}

async function handleBackfillEntry(dateString) {
    const text = document.getElementById('backfillInput').value;
    if (!text.trim()) {
        alert('Write something before saving.');
        return;
    }
    
    if (text.length < MIN_CHARS) {
        alert(`Keep going! You need at least ${MIN_CHARS} characters to save. You have ${text.length}.`);
        return;
    }
    
    const rating = getSelectedRating('backfill');
    
    try {
        await saveEntry(dateString, text, rating);
        await loadDashboard();
        render();
    } catch (error) {
        alert('Failed to save: ' + error.message);
    }
}

async function handleSkipDay(dateString) {
    try {
        await skipDay(dateString);
        await loadDashboard();
        render();
    } catch (error) {
        alert('Failed to skip: ' + error.message);
    }
}

function toggleBackfillOptions() {
    const content = document.getElementById('backfillOptionsContent');
    const toggle = document.querySelector('.backfill-options-toggle');
    content.classList.toggle('active');
    toggle.textContent = content.classList.contains('active') ? '▾ Options' : '▸ Options';
}

// ============================================
// MODALS
// ============================================
async function openEntry(dateString) {
    const entry = state.monthEntries[dateString];
    if (!entry) return;

    const modal = document.getElementById('entryModal');
    document.getElementById('modalDate').textContent = formatDateForDisplay(dateString);
    
    const textEl = document.getElementById('modalText');
    const ratingEl = document.getElementById('modalRating');
    
    if (entry.skipped) {
        textEl.textContent = '— Day skipped —';
        textEl.classList.add('skipped');
        ratingEl.classList.add('hidden');
    } else {
        textEl.textContent = entry.text;
        textEl.classList.remove('skipped');
        
        // Show rating if present
        const ratingLabel = getRatingLabel(entry.rating);
        if (ratingLabel) {
            ratingEl.textContent = ratingLabel;
            ratingEl.classList.remove('hidden');
        } else {
            ratingEl.classList.add('hidden');
        }
    }
    
    modal.classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

async function showRandomSmile() {
    const modal = document.getElementById('randomModal');
    
    try {
        const entry = await fetchRandomEntry();
        document.getElementById('randomDate').textContent = formatDateForDisplay(entry.date);
        document.getElementById('randomText').textContent = entry.text;
        document.getElementById('randomText').classList.remove('hidden');
        document.getElementById('randomDate').classList.remove('hidden');
        document.getElementById('randomEmpty').classList.add('hidden');
        document.getElementById('randomAnother').classList.remove('hidden');
        
        // Show rating if present
        const ratingEl = document.getElementById('randomRating');
        const ratingLabel = getRatingLabel(entry.rating);
        if (ratingLabel) {
            ratingEl.textContent = ratingLabel;
            ratingEl.classList.remove('hidden');
        } else {
            ratingEl.classList.add('hidden');
        }
    } catch (error) {
        document.getElementById('randomText').classList.add('hidden');
        document.getElementById('randomDate').classList.add('hidden');
        document.getElementById('randomRating').classList.add('hidden');
        document.getElementById('randomEmpty').classList.remove('hidden');
        document.getElementById('randomAnother').classList.add('hidden');
    }
    
    modal.classList.add('active');
}

async function showAnotherSmile() {
    try {
        const entry = await fetchRandomEntry();
        document.getElementById('randomDate').textContent = formatDateForDisplay(entry.date);
        document.getElementById('randomText').textContent = entry.text;
        
        // Update rating
        const ratingEl = document.getElementById('randomRating');
        const ratingLabel = getRatingLabel(entry.rating);
        if (ratingLabel) {
            ratingEl.textContent = ratingLabel;
            ratingEl.classList.remove('hidden');
        } else {
            ratingEl.classList.add('hidden');
        }
    } catch (error) {
        // Keep showing current one if fetch fails
    }
}

// ============================================
// EXPORT
// ============================================
async function handleExport() {
    try {
        await exportData();
    } catch (error) {
        alert('Export failed: ' + error.message);
    }
}

// ============================================
// PROFILE PAGE
// ============================================
async function showProfile() {
    state.showProfile = true;
    state.loading = true;
    render();
    
    try {
        await fetchStats();
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
    
    state.loading = false;
    render();
}

function hideProfile() {
    state.showProfile = false;
    render();
}

function renderProfile() {
    if (state.loading) {
        return '<div class="loading">Loading</div>';
    }

    const stats = state.profileStats || { totalEntries: 0, currentStreak: 0, longestStreak: 0 };
    const memberSince = state.user.createdAt ? new Date(state.user.createdAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    }) : state.user.signupDate;

    return `
        <div class="profile-page">
            <button class="profile-back" onclick="hideProfile()">← Back to Dashboard</button>
            
            <div class="profile-section">
                <h2>Your Stats</h2>
                <div class="profile-stats-grid">
                    <div class="profile-stat-box">
                        <div class="profile-stat-number">${stats.totalEntries}</div>
                        <div class="profile-stat-label">Total Smiles</div>
                    </div>
                    <div class="profile-stat-box">
                        <div class="profile-stat-number">${stats.currentStreak}</div>
                        <div class="profile-stat-label">Current Streak</div>
                    </div>
                    <div class="profile-stat-box">
                        <div class="profile-stat-number">${stats.longestStreak}</div>
                        <div class="profile-stat-label">Longest Streak</div>
                    </div>
                </div>
            </div>
            
            <div class="profile-section">
                <h2>Account</h2>
                <div class="profile-info-row">
                    <span class="profile-info-label">Email</span>
                    <span class="profile-info-value">${state.user.email}</span>
                </div>
                <div class="profile-info-row">
                    <span class="profile-info-label">Member Since</span>
                    <span class="profile-info-value">${memberSince}</span>
                </div>
            </div>
            
            <div class="profile-section">
                <h2>Change Password</h2>
                <div class="profile-form-group">
                    <label>Current Password</label>
                    <input type="password" id="currentPassword" placeholder="••••••" />
                </div>
                <div class="profile-form-group">
                    <label>New Password</label>
                    <input type="password" id="newPassword" placeholder="••••••" />
                </div>
                <div class="profile-form-group">
                    <label>Confirm New Password</label>
                    <input type="password" id="confirmPassword" placeholder="••••••" />
                </div>
                <div class="profile-actions">
                    <button onclick="handleChangePassword()">Update Password</button>
                </div>
                <div id="passwordMessage"></div>
            </div>
            
            <div class="profile-section">
                <h2>Backup Your Smiles</h2>
                <p class="export-description">
                    Download all your smile entries as a JSON file. 
                    Keep your memories safe.
                </p>
                <button class="export-btn" onclick="handleExport()">Export Data</button>
            </div>
        </div>
    `;
}

async function handleChangePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const messageEl = document.getElementById('passwordMessage');

    if (!currentPassword || !newPassword || !confirmPassword) {
        messageEl.innerHTML = '<div class="profile-message error">All fields are required</div>';
        return;
    }

    if (newPassword !== confirmPassword) {
        messageEl.innerHTML = '<div class="profile-message error">New passwords do not match</div>';
        return;
    }

    if (newPassword.length < 6) {
        messageEl.innerHTML = '<div class="profile-message error">Password must be at least 6 characters</div>';
        return;
    }

    try {
        await changePassword(currentPassword, newPassword);
        messageEl.innerHTML = '<div class="profile-message success">Password updated successfully</div>';
        
        // Clear form
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    } catch (error) {
        messageEl.innerHTML = `<div class="profile-message error">${error.message}</div>`;
    }
}

// ============================================
// UTILITIES
// ============================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// RENDER
// ============================================
function render() {
    const app = document.getElementById('app');

    // Show onboarding tour for new users
    if (state.showTour) {
        app.innerHTML = renderTour();
        return;
    }

    if (!state.user) {
        app.innerHTML = `
            <div class="container">
                <div class="header">
                    <h1>1 SMILE A DAY</h1>
                    <p>Log one thing that made you smile. Every day.</p>
                </div>
                ${renderAuthScreen()}
            </div>
        `;
    } else if (state.showProfile) {
        app.innerHTML = `
            <button class="logout-btn" onclick="logout()">LOGOUT</button>
            <div class="container">
                <div class="header">
                    <h1>1 SMILE A DAY</h1>
                    <p>Your Profile</p>
                </div>
                ${renderProfile()}
            </div>
        `;
    } else {
        app.innerHTML = `
            <button class="profile-btn" onclick="showProfile()">PROFILE</button>
            <button class="logout-btn" onclick="logout()">LOGOUT</button>
            <div class="container">
                <div class="header">
                    <h1>1 SMILE A DAY</h1>
                    <p>Welcome, ${state.user.email}</p>
                </div>
                ${renderDashboard()}
            </div>
            
            <!-- Entry Modal -->
            <div class="modal" id="entryModal">
                <div class="modal-content">
                    <div class="modal-label">Your Smile</div>
                    <div class="modal-date" id="modalDate"></div>
                    <div class="modal-text" id="modalText"></div>
                    <div class="rating-display hidden" id="modalRating"></div>
                    <div class="modal-actions">
                        <button class="secondary-btn" onclick="closeModal('entryModal')">Close</button>
                    </div>
                </div>
            </div>
            
            <!-- Random Smile Modal -->
            <div class="modal" id="randomModal">
                <div class="modal-content">
                    <div class="modal-label">A Random Smile</div>
                    <div class="modal-date" id="randomDate"></div>
                    <div class="modal-text" id="randomText"></div>
                    <div class="rating-display hidden" id="randomRating"></div>
                    <div class="modal-text hidden" id="randomEmpty" style="color: #666;">No smiles yet. Start logging today!</div>
                    <div class="modal-actions">
                        <button id="randomAnother" onclick="showAnotherSmile()">Another</button>
                        <button class="secondary-btn" onclick="closeModal('randomModal')">Close</button>
                    </div>
                </div>
            </div>
        `;
    }
}

// ============================================
// INIT
// ============================================
async function init() {
    const isLoggedIn = await checkAuth();
    
    if (isLoggedIn) {
        await loadDashboard();
    }
    
    render();
}

// Start the app
init();
