# 1 Smile a Day

> 86,400 seconds in a day. A smile takes less than one.

A brutalist gratitude journal that helps you log at least one thing that made you smile every day.

## Features

- **Daily Logging**: Record one thing that made you smile each day
- **Streak Tracking**: Build and maintain your smile streak
- **Backfill System**: Missed a day? Fill it in before continuing (with option to skip truly bad days)
- **Random Smile**: Resurface past entries for a nostalgia boost
- **Calendar View**: Visual overview of your smile history
- **Data Export**: Download all your entries as JSON

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (brutalist design)
- **Backend**: Node.js + Express
- **Database**: SQLite (via better-sqlite3)
- **Auth**: JWT + bcrypt

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm

### Installation

1. Clone the repository
```bash
cd 1SmileADay
```

2. Install dependencies
```bash
npm install
```

3. Start the server
```bash
npm start
```

4. Open http://localhost:3000 in your browser

### Development

For development with auto-reload:
```bash
npm run dev
```

## Project Structure

```
1SmileADay/
├── public/              # Frontend assets
│   ├── index.html       # Main HTML file
│   ├── styles.css       # Brutalist CSS styles
│   └── app.js           # Frontend JavaScript
├── server/              # Backend code
│   ├── index.js         # Express server entry
│   ├── db.js            # SQLite database operations
│   └── routes/          # API routes
│       ├── auth.js      # Authentication routes
│       └── entries.js   # Entry CRUD routes
├── data/                # SQLite database (auto-created)
├── package.json
└── README.md
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Entries
- `GET /api/entries/dashboard` - Get dashboard data (streak, missed days, etc.)
- `GET /api/entries/month/:year/:month` - Get entries for calendar
- `GET /api/entries/:date` - Get single entry
- `POST /api/entries` - Create/update entry
- `GET /api/entries/action/random` - Get random past entry
- `GET /api/entries/action/export` - Export all data

## Philosophy

In a world full of negativity, this app forces you to find at least one good thing about each day. Even on your worst days, you'll have something to look back on and say "well, it wasn't completely shitty."

## License

MIT
