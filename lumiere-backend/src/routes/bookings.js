const { Router } = require('express');
const supabase = require('../db/supabase');
const adminAuth = require('../middleware/adminAuth');

const router = Router();

// ── Helper: compute price breakdown ──────────────────────────────────────────
function computePricing(checkin, checkout, nightlyRate, serviceFeePct = 8) {
  const nights = Math.round(
    (new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24)
  );
  if (nights <= 0) throw new Error('Checkout must be after check-in.');
  const subtotal = nightlyRate * nights;
  const service_fee = Math.round(subtotal * (serviceFeePct / 100));
  const total = subtotal + service_fee;
  return { nights, nightly_rate: nightlyRate, service_fee, total };
}

// ── POST /api/bookings ────────────────────────────────────────────────────────
// Public — guest submits a booking
router.post('/', async (req, res) => {
  try {
    const { villa_id, guest_name, email, phone, checkin, checkout, guests, special_request } = req.body;

    // Basic validation
    if (!villa_id || !guest_name || !email || !checkin || !checkout) {
      return res.status(400).json({ error: 'villa_id, guest_name, email, checkin, and checkout are required.' });
    }
    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }
    if (new Date(checkout) <= new Date(checkin)) {
      return res.status(400).json({ error: 'Checkout must be after check-in.' });
    }

    // Fetch villa to get rate + name
    const { data: villa, error: villaErr } = await supabase
      .from('villas')
      .select('id, name, rate, status')
      .eq('id', villa_id)
      .single();

    if (villaErr || !villa) {
      return res.status(404).json({ error: 'Villa not found.' });
    }
    if (villa.status !== 'Active') {
      return res.status(400).json({ error: 'This villa is not available for booking.' });
    }

    // Check for date conflicts
    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id')
      .eq('villa_id', villa_id)
      .not('status', 'eq', 'Cancelled')
      .lt('checkin', checkout)
      .gt('checkout', checkin);

    if (conflicts && conflicts.length > 0) {
      return res.status(409).json({ error: 'Selected dates are already booked for this villa. Please choose different dates.' });
    }

    // Get service fee % from settings
    const { data: feeSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'service_fee_pct')
      .single();
    const serviceFeePct = feeSetting ? parseFloat(feeSetting.value) : 8;

    const pricing = computePricing(checkin, checkout, villa.rate, serviceFeePct);

    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .insert([{
        villa_id,
        villa_name: villa.name,
        guest_name,
        email,
        phone: phone || null,
        checkin,
        checkout,
        guests: guests || '1–2 Guests',
        special_request: special_request || '',
        status: 'Confirmed',
        ...pricing,
      }])
      .select()
      .single();

    if (bookingErr) throw bookingErr;

    res.status(201).json({
      message: 'Reservation confirmed! Our concierge will contact you within 24 hours.',
      booking,
    });
  } catch (err) {
    console.error('POST /bookings error:', err.message);
    // Surface overlap constraint as a friendly message
    if (err.message.includes('overlapping')) {
      return res.status(409).json({ error: 'These dates overlap with an existing booking.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/bookings ─────────────────────────────────────────────────────────
// Admin — list all bookings (supports ?status=, ?villa_id=, ?month=YYYY-MM)
router.get('/', adminAuth, async (req, res) => {
  try {
    let query = supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.query.villa_id) query = query.eq('villa_id', req.query.villa_id);
    if (req.query.month) {
      // e.g. ?month=2025-08  → checkins in that month
      const start = `${req.query.month}-01`;
      const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 1)
        .toISOString().split('T')[0];
      query = query.gte('checkin', start).lt('checkin', end);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ bookings: data });
  } catch (err) {
    console.error('GET /bookings error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/bookings/:id ─────────────────────────────────────────────────────
// Admin — single booking detail
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Booking not found.' });

    res.json({ booking: data });
  } catch (err) {
    console.error('GET /bookings/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/bookings/:id/status ───────────────────────────────────────────
// Admin — update booking status (Confirmed / Pending / Cancelled / Completed)
router.patch('/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const VALID = ['Confirmed', 'Pending', 'Cancelled', 'Completed'];

    if (!VALID.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID.join(', ')}` });
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ booking: data });
  } catch (err) {
    console.error('PATCH /bookings/:id/status error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/bookings/:id ──────────────────────────────────────────────────
// Admin — hard delete a booking
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Booking deleted.' });
  } catch (err) {
    console.error('DELETE /bookings/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
