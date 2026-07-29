# Lumière Villas — Backend API

Node.js + Express REST API for the Lumière Villas frontend.  
**Database:** Supabase (PostgreSQL) — chosen over MongoDB because it gives you a real relational DB, built-in REST, Row Level Security, and zero extra infrastructure. Perfect match for this booking app.  
**Deploy target:** Render.com

---

## Stack

| Layer | Tech |
|-------|------|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Database | Supabase (PostgreSQL) |
| Auth | Header secret (`X-Admin-Secret`) for CMS, public for guest endpoints |
| Deploy | Render (free tier works, starter for always-on) |

---

## API Endpoints

### Public (no auth needed)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/villas` | List active villas (`?location=`, `?maxPrice=`, `?guests=`) |
| GET | `/api/villas/:id` | Single villa detail |
| GET | `/api/villas/:id/availability` | Booked date ranges for a villa |
| POST | `/api/bookings` | Submit a guest booking |

### Admin (requires `X-Admin-Secret` header)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/villas` | Create a villa |
| PATCH | `/api/villas/:id` | Update villa fields |
| DELETE | `/api/villas/:id` | Deactivate villa (soft delete) |
| GET | `/api/bookings` | List all bookings (`?status=`, `?villa_id=`, `?month=YYYY-MM`) |
| GET | `/api/bookings/:id` | Single booking detail |
| PATCH | `/api/bookings/:id/status` | Update booking status |
| DELETE | `/api/bookings/:id` | Hard delete a booking |
| GET | `/api/analytics/dashboard` | CMS dashboard stats |
| GET | `/api/analytics/revenue?months=6` | Monthly revenue breakdown |
| GET | `/api/analytics/top-villas` | Top villas by bookings |
| GET | `/api/settings` | All settings |
| PUT | `/api/settings` | Upsert settings keys |

---

## Local Setup

### 1. Clone & install
```bash
git clone <your-repo-url>
cd lumiere-backend
npm install
```

### 2. Create your Supabase project
1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name it `lumiere-villas`, pick a region close to you
3. Once created, go to **Settings → API**
4. Copy your **Project URL** and **service_role** secret key

### 3. Run the database schema
1. In your Supabase project → **SQL Editor → New Query**
2. Paste the entire contents of `src/db/schema.sql`
3. Click **Run**

> **Note:** If the overlap exclusion constraint errors, first run:
> ```sql
> CREATE EXTENSION IF NOT EXISTS btree_gist;
> ```
> Then re-run the schema.

### 4. Configure environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:5500
ADMIN_SECRET=pick-something-strong
```

### 5. Seed the database
```bash
npm run db:seed
```
This inserts all 6 villas from the original HTML and 4 sample bookings.

### 6. Start the server
```bash
npm run dev      # development (auto-restarts)
npm start        # production
```

Test it:
```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/villas
```

---

## Deploy to Render

### Option A — Blueprint (recommended, one-click)
1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New → Blueprint**
3. Connect your GitHub repo — Render detects `render.yaml` automatically
4. In the **Environment Variables** section, fill in the 4 `sync: false` vars:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_SECRET`
   - `ALLOWED_ORIGINS` (your frontend URL, e.g. `https://yoursite.com`)
5. Click **Apply** — Render builds and deploys

### Option B — Manual
1. Render → **New → Web Service** → connect repo
2. Set:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Environment:** Node
3. Add the 4 env vars above in the dashboard
4. Deploy

Your API will be live at:  
`https://lumiere-villas-api.onrender.com`

> **Free tier note:** Render's free tier spins down after 15 minutes of inactivity.  
> Upgrade to **Starter ($7/mo)** for always-on. Your Supabase free tier is always on.

---

## Connecting the Frontend

Add this near the top of your `<script>` block in `villa-animated.html`,  
replacing the hardcoded `villas` and `bookings` arrays:

```html
<script>
// ── API CONFIG ────────────────────────────────────────────────────────────────
const API_BASE = 'https://lumiere-villas-api.onrender.com'; // your Render URL
const ADMIN_SECRET = 'your-admin-secret';                   // only in CMS panel

const api = {
  // Public
  getVillas: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/api/villas${qs ? '?' + qs : ''}`).then(r => r.json());
  },
  getVilla: (id) =>
    fetch(`${API_BASE}/api/villas/${id}`).then(r => r.json()),
  getAvailability: (id) =>
    fetch(`${API_BASE}/api/villas/${id}/availability`).then(r => r.json()),
  createBooking: (payload) =>
    fetch(`${API_BASE}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(r => r.json()),

  // Admin (CMS panel)
  admin: {
    headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': ADMIN_SECRET },
    getBookings: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/api/bookings${qs ? '?' + qs : ''}`, {
        headers: { 'X-Admin-Secret': ADMIN_SECRET },
      }).then(r => r.json());
    },
    updateBookingStatus: (id, status) =>
      fetch(`${API_BASE}/api/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': ADMIN_SECRET },
        body: JSON.stringify({ status }),
      }).then(r => r.json()),
    createVilla: (data) =>
      fetch(`${API_BASE}/api/villas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': ADMIN_SECRET },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    getDashboard: () =>
      fetch(`${API_BASE}/api/analytics/dashboard`, {
        headers: { 'X-Admin-Secret': ADMIN_SECRET },
      }).then(r => r.json()),
    saveSettings: (data) =>
      fetch(`${API_BASE}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': ADMIN_SECRET },
        body: JSON.stringify(data),
      }).then(r => r.json()),
  },
};

// ── Replace the static `villas` array load with: ─────────────────────────────
async function loadVillas() {
  const { villas } = await api.getVillas();
  // villas is now a live array from Supabase
  // pass it to renderVillaGrid() and populateLocationFilter() as before
  return villas;
}

// ── Replace submitBooking() with: ─────────────────────────────────────────────
async function submitBooking() {
  const payload = {
    villa_id: currentVillaId,   // UUID from the loaded villa object
    guest_name: `${document.getElementById('fName').value} ${document.getElementById('lName').value}`.trim(),
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    checkin: document.getElementById('mCheckin').value,
    checkout: document.getElementById('mCheckout').value,
    guests: document.getElementById('mGuests').value,
    special_request: document.getElementById('special').value,
  };

  const result = await api.createBooking(payload);
  if (result.error) {
    document.getElementById('bookingFormError').textContent = result.error;
    document.getElementById('bookingFormError').style.display = 'block';
  } else {
    document.getElementById('bookingForm').style.display = 'none';
    document.getElementById('successMsg').style.display = 'flex';
  }
}
</script>
```

---

## Project Structure

```
lumiere-backend/
├── src/
│   ├── index.js              # Express app + server
│   ├── db/
│   │   ├── supabase.js       # Supabase client singleton
│   │   ├── schema.sql        # Run once in Supabase SQL editor
│   │   └── seed.js           # Populates villas + sample bookings
│   ├── middleware/
│   │   └── adminAuth.js      # X-Admin-Secret header guard
│   └── routes/
│       ├── villas.js         # Villa CRUD
│       ├── bookings.js       # Booking creation + admin management
│       ├── analytics.js      # Dashboard + revenue + top villas
│       └── settings.js       # CMS settings
├── .env.example
├── .gitignore
├── package.json
└── render.yaml               # One-click Render deployment
```

---

## Why Supabase over MongoDB?

| | Supabase | MongoDB Atlas |
|--|----------|--------------|
| Data model | Relational (PostgreSQL) — perfect for bookings with foreign keys & date overlap prevention | Document — flexible but requires manual overlap checking |
| Overlap prevention | Native `EXCLUDE` constraint blocks double-bookings at DB level | Must be coded in app layer |
| Free tier | 500MB DB, 2GB bandwidth, always-on | 512MB, shared cluster, sleeps |
| REST API | Built-in (PostgREST) | Requires Atlas App Services or custom server |
| Real-time | Built-in | Change Streams (extra setup) |
| Auth | Built-in (optional) | Not included |
