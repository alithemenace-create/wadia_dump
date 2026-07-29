/**
 * Seed script — populates Supabase with villas + sample bookings from the
 * original villa-animated.html dataset.
 *
 * Usage:  node src/db/seed.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Villas from the original HTML data ───────────────────────────────────────
const VILLAS = [
  {
    name: 'Villa Amalfi Paradiso',
    location: 'Amalfi Coast, Italy',
    rate: 45000,
    beds: 4,
    baths: 4,
    guests: 8,
    badge: 'Most Loved',
    description: 'A breathtaking cliffside estate with panoramic views of the Amalfi Coast, featuring a private infinity pool, terraced gardens, and direct access to a hidden cove.',
    images: [
      'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=600&q=80&fit=crop',
      'https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?w=600&q=80&fit=crop',
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&q=80&fit=crop',
    ],
    status: 'Active',
  },
  {
    name: 'Santorini Sky Estate',
    location: 'Oia, Santorini, Greece',
    rate: 62000,
    beds: 3,
    baths: 3,
    guests: 6,
    badge: 'Sea View',
    description: 'Perched on the caldera rim of Oia, this iconic cave villa offers the most celebrated sunset view in the world, a private plunge pool, and locally-crafted interiors.',
    images: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80&fit=crop',
      'https://images.unsplash.com/photo-1570213489059-0aac6626cade?w=600&q=80&fit=crop',
    ],
    status: 'Active',
  },
  {
    name: 'Maldives Water Retreat',
    location: 'North Malé Atoll, Maldives',
    rate: 89000,
    beds: 2,
    baths: 2,
    guests: 4,
    badge: 'Overwater',
    description: 'A two-bedroom overwater bungalow with a glass floor panel revealing the reef below, a private sun deck, direct ocean access, and included butler service.',
    images: [
      'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=600&q=80&fit=crop',
      'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=600&q=80&fit=crop',
    ],
    status: 'Active',
  },
  {
    name: 'Tuscany Hills Manor',
    location: 'Chianti, Tuscany, Italy',
    rate: 38000,
    beds: 5,
    baths: 5,
    guests: 10,
    badge: 'Wine Country',
    description: 'A restored 18th-century farmhouse surrounded by rolling vineyards and olive groves. Includes a private wine cellar, wood-fired pizza oven, and heated outdoor pool.',
    images: [
      'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=600&q=80&fit=crop',
    ],
    status: 'Active',
  },
  {
    name: 'Bali Jungle Sanctuary',
    location: 'Ubud, Bali, Indonesia',
    rate: 28000,
    beds: 3,
    baths: 3,
    guests: 6,
    badge: 'Private Pool',
    description: 'Hidden among Ubud\'s emerald rice terraces, this open-air villa flows seamlessly between indoor luxury and tropical jungle. The private pool cantilevers over the valley.',
    images: [
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80&fit=crop',
    ],
    status: 'Active',
  },
  {
    name: "Côte d'Azur Château",
    location: 'Saint-Tropez, France',
    rate: 75000,
    beds: 6,
    baths: 6,
    guests: 12,
    badge: 'Prestige',
    description: 'A grand 19th-century château minutes from Port Grimaud with manicured gardens, a 20-metre heated pool, a home cinema, and a private helipad.',
    images: [
      'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600&q=80&fit=crop',
    ],
    status: 'Active',
  },
];

// ── Sample bookings ───────────────────────────────────────────────────────────
function makeBookings(villaRows) {
  const findVilla = (name) => villaRows.find((v) => v.name === name);

  const samples = [
    {
      villa: findVilla('Villa Amalfi Paradiso'),
      guest_name: 'Priya Mehta',
      email: 'priya.mehta@example.com',
      phone: '+91 98765 43210',
      checkin: '2025-08-10',
      checkout: '2025-08-17',
      guests: '5–6 Guests',
      special_request: 'Anniversary setup — rose petals and champagne on arrival please.',
      status: 'Confirmed',
    },
    {
      villa: findVilla('Santorini Sky Estate'),
      guest_name: 'Charlotte Forbes',
      email: 'c.forbes@example.com',
      phone: '+44 7700 900123',
      checkin: '2025-09-01',
      checkout: '2025-09-08',
      guests: '3–4 Guests',
      special_request: 'We would love a private sunset dinner on arrival night.',
      status: 'Confirmed',
    },
    {
      villa: findVilla('Maldives Water Retreat'),
      guest_name: 'James Whitmore',
      email: 'james.whitmore@example.com',
      phone: '+1 212 555 0198',
      checkin: '2025-10-05',
      checkout: '2025-10-10',
      guests: '1–2 Guests',
      special_request: '',
      status: 'Confirmed',
    },
    {
      villa: findVilla('Tuscany Hills Manor'),
      guest_name: 'Rajesh Kumar',
      email: 'rajesh.kumar@example.com',
      phone: '+91 91234 56789',
      checkin: '2025-08-20',
      checkout: '2025-08-25',
      guests: '7+ Guests',
      special_request: 'Family reunion — need high chairs and a kids pool.',
      status: 'Pending',
    },
  ];

  return samples
    .filter((s) => s.villa)
    .map((s) => {
      const nights =
        (new Date(s.checkout) - new Date(s.checkin)) / (1000 * 60 * 60 * 24);
      const nightly_rate = s.villa.rate;
      const service_fee = Math.round(nightly_rate * nights * 0.08);
      const total = nightly_rate * nights + service_fee;

      return {
        villa_id: s.villa.id,
        villa_name: s.villa.name,
        guest_name: s.guest_name,
        email: s.email,
        phone: s.phone,
        checkin: s.checkin,
        checkout: s.checkout,
        guests: s.guests,
        special_request: s.special_request,
        nights,
        nightly_rate,
        service_fee,
        total,
        status: s.status,
      };
    });
}

// ── Default settings ──────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = [
  { key: 'business_name', value: 'Lumière Villas' },
  { key: 'contact_email', value: 'hello@lumierevillas.com' },
  { key: 'phone', value: '+91 98765 43210' },
  { key: 'currency', value: 'INR' },
  { key: 'service_fee_pct', value: '8' },
  { key: 'cancellation_policy', value: 'Moderate (7 days)' },
  { key: 'notify_new_booking', value: 'true' },
  { key: 'notify_cancellation', value: 'true' },
  { key: 'notify_sms', value: 'false' },
  { key: 'notify_weekly_digest', value: 'true' },
];

// ── Run ───────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('🌱  Starting seed…\n');

  // 1. Villas
  console.log('  Inserting villas…');
  const { data: villaRows, error: villaErr } = await supabase
    .from('villas')
    .upsert(VILLAS, { onConflict: 'name' })
    .select();

  if (villaErr) {
    console.error('  ✗ Villas error:', villaErr.message);
    process.exit(1);
  }
  console.log(`  ✓ ${villaRows.length} villas seeded`);

  // 2. Bookings
  console.log('  Inserting sample bookings…');
  const bookingPayload = makeBookings(villaRows);
  const { data: bookingRows, error: bookingErr } = await supabase
    .from('bookings')
    .insert(bookingPayload)
    .select();

  if (bookingErr) {
    // Non-fatal — may already exist or overlap constraint triggered
    console.warn('  ⚠  Bookings warning:', bookingErr.message);
  } else {
    console.log(`  ✓ ${bookingRows.length} bookings seeded`);
  }

  // 3. Settings
  console.log('  Inserting default settings…');
  const { error: settingsErr } = await supabase
    .from('settings')
    .upsert(DEFAULT_SETTINGS, { onConflict: 'key' });

  if (settingsErr) {
    console.warn('  ⚠  Settings warning:', settingsErr.message);
  } else {
    console.log(`  ✓ ${DEFAULT_SETTINGS.length} settings seeded`);
  }

  console.log('\n✅  Seed complete!');
}

seed().catch((err) => {
  console.error('Unhandled seed error:', err);
  process.exit(1);
});
