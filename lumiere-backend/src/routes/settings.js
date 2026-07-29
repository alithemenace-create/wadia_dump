const { Router } = require('express');
const supabase = require('../db/supabase');
const adminAuth = require('../middleware/adminAuth');

const router = Router();

// All settings routes require admin auth
router.use(adminAuth);

// ── GET /api/settings ─────────────────────────────────────────────────────────
// Returns all settings as a flat key→value object
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value');

    if (error) throw error;

    const settings = {};
    (data || []).forEach(({ key, value }) => { settings[key] = value; });

    res.json({ settings });
  } catch (err) {
    console.error('GET /settings error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/settings ─────────────────────────────────────────────────────────
// Upsert one or more settings keys
// Body: { "service_fee_pct": "10", "currency": "USD", ... }
router.put('/', async (req, res) => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json({ error: 'Body must be a key-value object.' });
    }

    const rows = Object.entries(updates).map(([key, value]) => ({
      key,
      value: String(value),
      updated_at: new Date().toISOString(),
    }));

    if (rows.length === 0) {
      return res.status(400).json({ error: 'No settings provided.' });
    }

    const { error } = await supabase
      .from('settings')
      .upsert(rows, { onConflict: 'key' });

    if (error) throw error;

    res.json({ message: 'Settings saved successfully.', updated: rows.map(r => r.key) });
  } catch (err) {
    console.error('PUT /settings error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
