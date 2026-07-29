const { Router } = require('express');
const supabase = require('../db/supabase');
const adminAuth = require('../middleware/adminAuth');

const router = Router();

// All analytics routes require admin auth
router.use(adminAuth);

// ── GET /api/analytics/dashboard ─────────────────────────────────────────────
// Aggregated stats for the CMS Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];

    // Revenue this month
    const { data: monthBookings } = await supabase
      .from('bookings')
      .select('total, status')
      .gte('checkin', monthStart)
      .lt('checkin', monthEnd)
      .not('status', 'eq', 'Cancelled');

    const monthRevenue = (monthBookings || []).reduce((s, b) => s + (b.total || 0), 0);

    // Active bookings count
    const { count: activeBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .in('status', ['Confirmed', 'Pending']);

    // Total active villas
    const { count: totalVillas } = await supabase
      .from('villas')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Active');

    // Recent 5 bookings
    const { data: recentBookings } = await supabase
      .from('bookings')
      .select('id, guest_name, villa_name, checkin, checkout, total, status')
      .order('created_at', { ascending: false })
      .limit(5);

    res.json({
      stats: {
        monthRevenue,
        activeBookings: activeBookings || 0,
        totalVillas: totalVillas || 0,
        // Occupancy: active bookings / (villas × 30 days) — rough estimate
        occupancyRate: totalVillas
          ? Math.min(100, Math.round(((activeBookings || 0) / (totalVillas * 30)) * 100 * 10))
          : 0,
      },
      recentBookings: recentBookings || [],
    });
  } catch (err) {
    console.error('GET /analytics/dashboard error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/analytics/revenue?months=6 ──────────────────────────────────────
// Monthly revenue breakdown for the bar chart
router.get('/revenue', async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const results = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const start = new Date(year, month, 1).toISOString().split('T')[0];
      const end = new Date(year, month + 1, 1).toISOString().split('T')[0];
      const label = d.toLocaleString('default', { month: 'short' });

      const { data } = await supabase
        .from('bookings')
        .select('total')
        .gte('checkin', start)
        .lt('checkin', end)
        .not('status', 'eq', 'Cancelled');

      const revenue = (data || []).reduce((s, b) => s + (b.total || 0), 0);
      results.push({ month: label, year, revenue });
    }

    res.json({ revenue: results });
  } catch (err) {
    console.error('GET /analytics/revenue error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/analytics/top-villas ────────────────────────────────────────────
// Top villas by booking count
router.get('/top-villas', async (req, res) => {
  try {
    const { data } = await supabase
      .from('bookings')
      .select('villa_id, villa_name, total')
      .not('status', 'eq', 'Cancelled');

    if (!data) return res.json({ topVillas: [] });

    // Aggregate by villa
    const map = {};
    data.forEach((b) => {
      if (!map[b.villa_id]) map[b.villa_id] = { villa_name: b.villa_name, bookings: 0, revenue: 0 };
      map[b.villa_id].bookings += 1;
      map[b.villa_id].revenue += b.total || 0;
    });

    const topVillas = Object.values(map)
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5);

    res.json({ topVillas });
  } catch (err) {
    console.error('GET /analytics/top-villas error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
