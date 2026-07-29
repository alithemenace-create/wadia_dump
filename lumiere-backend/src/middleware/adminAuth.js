/**
 * Simple header-based admin guard.
 * The CMS panel sends:  X-Admin-Secret: <value of ADMIN_SECRET env var>
 *
 * For production you can swap this for JWT / Supabase Auth.
 */
function adminAuth(req, res, next) {
  const secret = req.headers['x-admin-secret'];

  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized — invalid admin secret.' });
  }

  next();
}

module.exports = adminAuth;
