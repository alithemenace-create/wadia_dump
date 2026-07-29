const { Router } = require('express');
const supabase = require('../db/supabase');
const adminAuth = require('../middleware/adminAuth');

const router = Router();

// ── GET /api/villas ──────────────────────────────────────────────────────────
// Public — returns all active villas (supports ?location=, ?maxPrice=, ?guests=)
router.get('/', async (req, res) => {
  try {
    let query = supabase
      .from('villas')
      .select('*')
      .eq('status', 'Active')
      .order('created_at', { ascending: true });

    if (req.query.location) {
      query = query.ilike('location', `%${req.query.location}%`);
    }
    if (req.query.maxPrice) {
      query = query.lte('rate', parseInt(req.query.maxPrice));
    }
    if (req.query.guests) {
      query = query.gte('guests', parseInt(req.query.guests));
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ villas: data });
  } catch (err) {
    console.error('GET /villas error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/villas/:id ───────────────────────────────────────────────────────
// Public — single villa detail
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('villas')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Villa not found.' });

    res.json({ villa: data });
  } catch (err) {
    console.error('GET /villas/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/villas/:id/availability ─────────────────────────────────────────
// Public — returns booked date ranges for a villa so the frontend can block them
router.get('/:id/availability', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('checkin, checkout')
      .eq('villa_id', req.params.id)
      .not('status', 'eq', 'Cancelled');

    if (error) throw error;

    res.json({ bookedRanges: data });
  } catch (err) {
    console.error('GET /villas/:id/availability error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/villas ──────────────────────────────────────────────────────────
// Admin — create a new villa
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, location, rate, beds, baths, guests, badge, description, images, status } = req.body;

    if (!name || !location || !rate) {
      return res.status(400).json({ error: 'name, location, and rate are required.' });
    }

    const { data, error } = await supabase
      .from('villas')
      .insert([{ name, location, rate, beds, baths, guests, badge, description, images: images || [], status: status || 'Active' }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ villa: data });
  } catch (err) {
    console.error('POST /villas error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/villas/:id ─────────────────────────────────────────────────────
// Admin — update a villa (partial)
router.patch('/:id', adminAuth, async (req, res) => {
  try {
    const allowed = ['name', 'location', 'rate', 'beds', 'baths', 'guests', 'badge', 'description', 'images', 'status'];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    const { data, error } = await supabase
      .from('villas')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ villa: data });
  } catch (err) {
    console.error('PATCH /villas/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/villas/:id ────────────────────────────────────────────────────
// Admin — soft-delete (sets status = 'Inactive')
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('villas')
      .update({ status: 'Inactive' })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Villa deactivated.', villa: data });
  } catch (err) {
    console.error('DELETE /villas/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
