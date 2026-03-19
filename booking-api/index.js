const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Get all hotels
app.get('/api/hotels', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM hotels');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get rooms for a hotel
app.get('/api/hotels/:id/rooms', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM rooms WHERE hotel_id = $1', [id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a booking
app.post('/api/bookings', async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    const { hotel_id, room_id, customer_name, customer_email, start_date, end_date, total_price } = req.body;
    
    const bookingQuery = `
      INSERT INTO bookings (hotel_id, room_id, customer_name, customer_email, start_date, end_date, total_price)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
    `;
    const bookingValues = [hotel_id, room_id, customer_name, customer_email, start_date, end_date, total_price];
    const { rows: bookingRows } = await client.query(bookingQuery, bookingValues);
    const bookingId = bookingRows[0].id;

    // Outbox entry for CDC
    const outboxQuery = `
      INSERT INTO outbox (aggregate_type, aggregate_id, type, payload)
      VALUES ($1, $2, $3, $4)
    `;
    const payload = JSON.stringify({ booking_id: bookingId, hotel_id, room_id, customer_name });
    await client.query(outboxQuery, ['Booking', bookingId.toString(), 'BOOKING_CREATED', payload]);

    await client.query('COMMIT');
    res.status(201).json({ id: bookingId, message: 'Booking created' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Get booking details (Used by CDC subscriber)
app.get('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bookingQuery = `
      SELECT b.*, h.name as hotel_name, h.location, r.room_number, r.type as room_type 
      FROM bookings b
      JOIN hotels h ON b.hotel_id = h.id
      JOIN rooms r ON b.room_id = r.id
      WHERE b.id = $1
    `;
    const { rows } = await db.query(bookingQuery, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Booking API running on port ${PORT}`);
});
