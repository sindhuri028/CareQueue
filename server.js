const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const Database = require('better-sqlite3');

const app = express();
const port = Number(process.env.PORT) || 3000;
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'carequeue.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    area TEXT NOT NULL,
    address TEXT NOT NULL,
    rating TEXT NOT NULL,
    distance TEXT NOT NULL,
    departments TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL UNIQUE,
    provider_id TEXT NOT NULL REFERENCES providers(id),
    department TEXT NOT NULL,
    appointment_date TEXT NOT NULL,
    appointment_time TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    token_number INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(provider_id, department, appointment_date, appointment_time),
    UNIQUE(provider_id, department, appointment_date, token_number)
  );
  CREATE INDEX IF NOT EXISTS bookings_date_idx ON bookings(provider_id, appointment_date, department);
`);

const seedProviders = [
  { id: 'northside', name: 'Northside Community Hospital', area: 'North District', address: '24 Garden Avenue · Sample location', rating: '4.8', distance: '1.2 mi', departments: ['General Medicine', 'Cardiology', 'Pediatrics', 'Orthopedics'] },
  { id: 'riverside', name: 'Riverside Medical Centre', area: 'River Quarter', address: '8 Willow Road · Sample location', rating: '4.7', distance: '2.4 mi', departments: ['General Medicine', 'Dermatology', 'ENT', 'Women’s Health'] },
  { id: 'greenpark', name: 'Greenpark City Hospital', area: 'Central District', address: '105 Park Street · Sample location', rating: '4.9', distance: '3.1 mi', departments: ['Cardiology', 'Neurology', 'Orthopedics', 'General Medicine'] }
];
const providerCount = db.prepare('SELECT COUNT(*) AS count FROM providers').get().count;
if (providerCount === 0) {
  const insertProvider = db.prepare('INSERT INTO providers (id,name,area,address,rating,distance,departments) VALUES (@id,@name,@area,@address,@rating,@distance,@departments)');
  const seed = db.transaction((items) => items.forEach((provider) => insertProvider.run({ ...provider, departments: JSON.stringify(provider.departments) })));
  seed(seedProviders);
}

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'], imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"]
  } }
}));
app.use(express.json({ limit: '10kb' }));
const bookingLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false });
app.use('/api', apiLimiter);

function sendError(res, status, message) { return res.status(status).json({ error: message }); }
function isISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
function getProvider(row) {
  if (!row) return null;
  return { ...row, departments: JSON.parse(row.departments) };
}
const providerById = db.prepare('SELECT * FROM providers WHERE id = ?');
const findBookingsForSlot = db.prepare('SELECT 1 FROM bookings WHERE provider_id = ? AND department = ? AND appointment_date = ? AND appointment_time = ?');
const times = ['09:00 AM', '09:45 AM', '10:30 AM', '11:15 AM', '01:30 PM', '02:15 PM', '03:00 PM'];

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/providers', (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100).toLowerCase() : '';
  const department = typeof req.query.department === 'string' ? req.query.department.trim().slice(0, 80) : '';
  const rows = db.prepare('SELECT * FROM providers ORDER BY name').all().map(getProvider).filter((provider) => {
    const haystack = `${provider.name} ${provider.area} ${provider.address} ${provider.departments.join(' ')}`.toLowerCase();
    return (!query || haystack.includes(query)) && (!department || provider.departments.includes(department));
  });
  res.json({ providers: rows, demo: true });
});
app.get('/api/providers/:id/slots', (req, res) => {
  const provider = getProvider(providerById.get(req.params.id));
  if (!provider) return sendError(res, 404, 'Provider not found.');
  const department = typeof req.query.department === 'string' ? req.query.department : '';
  const date = req.query.date;
  if (!provider.departments.includes(department)) return sendError(res, 400, 'Choose a department offered by this provider.');
  if (!isISODate(date)) return sendError(res, 400, 'Choose a valid date.');
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const requested = new Date(`${date}T00:00:00.000Z`);
  const days = (requested - today) / 86400000;
  if (days < 0 || days > 60) return sendError(res, 400, 'Choose a date within the next 60 days.');
  const available = times.filter((time) => !findBookingsForSlot.get(provider.id, department, date, time));
  res.json({ slots: available, demo: true });
});

const createBooking = db.transaction((input) => {
  const currentToken = db.prepare('SELECT COALESCE(MAX(token_number), 0) AS maxToken FROM bookings WHERE provider_id = ? AND department = ? AND appointment_date = ?').get(input.providerId, input.department, input.date).maxToken;
  const tokenNumber = currentToken + 1;
  const reference = `CQ-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
  db.prepare(`INSERT INTO bookings (reference, provider_id, department, appointment_date, appointment_time, patient_name, patient_phone, token_number)
    VALUES (@reference, @providerId, @department, @date, @time, @patientName, @patientPhone, @tokenNumber)`).run({ ...input, reference, tokenNumber });
  return { reference, tokenNumber };
});
app.post('/api/bookings', bookingLimiter, (req, res) => {
  const body = req.body || {};
  const providerId = typeof body.providerId === 'string' ? body.providerId : '';
  const department = typeof body.department === 'string' ? body.department.trim() : '';
  const date = body.date;
  const time = body.time;
  const patientName = typeof body.patientName === 'string' ? body.patientName.trim() : '';
  const patientPhone = typeof body.patientPhone === 'string' ? body.patientPhone.trim() : '';
  const provider = getProvider(providerById.get(providerId));
  if (!provider) return sendError(res, 400, 'Select a listed provider.');
  if (!provider.departments.includes(department)) return sendError(res, 400, 'Select a department offered by this provider.');
  if (!isISODate(date)) return sendError(res, 400, 'Choose a valid appointment date.');
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const requested = new Date(`${date}T00:00:00.000Z`);
  const days = (requested - today) / 86400000;
  if (days < 0 || days > 60) return sendError(res, 400, 'Choose a date within the next 60 days.');
  if (!times.includes(time)) return sendError(res, 400, 'Choose one of the available appointment times.');
  if (patientName.length < 2 || patientName.length > 80 || /[<>]/.test(patientName)) return sendError(res, 400, 'Enter a patient name between 2 and 80 characters.');
  if (patientPhone.length < 7 || patientPhone.length > 30 || !/^[+\d().\-\s]+$/.test(patientPhone)) return sendError(res, 400, 'Enter a valid contact phone number.');
  try {
    const booking = createBooking({ providerId, department, date, time, patientName, patientPhone });
    res.status(201).json({ booking: { ...booking, provider: provider.name, department, date, time, patientName, maskedPhone: `${'•'.repeat(Math.min(Math.max(patientPhone.replace(/\D/g, '').length - 4, 0), 8))}${patientPhone.slice(-4)}` }, demo: true, message: 'Saved to this app’s local demo database. The provider has not been notified.' });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return sendError(res, 409, 'That sample time was just booked. Please choose another available time.');
    console.error('Booking could not be created:', error.message);
    return sendError(res, 500, 'The booking could not be saved. Please try again.');
  }
});

app.use(express.static(__dirname, { extensions: ['html'], dotfiles: 'ignore' }));
app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && 'body' in err) return sendError(res, 400, 'Request body must be valid JSON.');
  console.error('Request failed:', err.message);
  return sendError(res, 500, 'Unexpected server error.');
});
app.listen(port, () => console.log(`CareQueue running at http://localhost:${port}`));
