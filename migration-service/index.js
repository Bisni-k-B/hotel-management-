const { Pool } = require('pg');
const { MongoClient } = require('mongodb');

const pgPool = new Pool({
  user: process.env.PG_USER || 'hotel_user',
  host: process.env.PG_HOST || 'localhost',
  database: process.env.PG_DB || 'hotel_db',
  password: process.env.PG_PASSWORD || 'hotel_password',
  port: process.env.PG_PORT || 5432,
});

const MONGO_URL = process.env.MONGO_URL || 'mongodb://root:password@localhost:27017';
const MONGO_DB = process.env.MONGO_DB || 'hotel_nosql_db';

async function migrate() {
  let mongoClient;
  try {
    console.log('Starting DB to DB Migration...');

    // 1. Fetch from Postgres
    const { rows: bookings } = await pgPool.query(`
      SELECT b.id, b.customer_name, b.customer_email, b.start_date, b.end_date, b.total_price,
             h.id as hotel_id, h.name as hotel_name, h.location as hotel_location,
             r.id as room_id, r.room_number, r.type as room_type
      FROM bookings b
      JOIN hotels h ON b.hotel_id = h.id
      JOIN rooms r ON b.room_id = r.id
    `);

    console.log(`Fetched ${bookings.length} bookings from Postgres.`);

    if (bookings.length === 0) {
      console.log('No bookings to migrate.');
      return;
    }

    // 2. Transform Data (Nesting hotel and room inside booking)
    const transformedBookings = bookings.map(b => ({
      _id: b.id.toString(), // Keep original ID as Mongo _id for consistency or use custom _id
      bookingId: b.id,
      customer: {
        name: b.customer_name,
        email: b.customer_email
      },
      dates: {
        start: b.start_date,
        end: b.end_date
      },
      totalPrice: b.total_price,
      hotel: {
        id: b.hotel_id,
        name: b.hotel_name,
        location: b.hotel_location
      },
      room: {
        id: b.room_id,
        number: b.room_number,
        type: b.room_type
      },
      migratedAt: new Date()
    }));

    // 3. Load directly to MongoDB
    mongoClient = new MongoClient(MONGO_URL);
    await mongoClient.connect();
    const db = mongoClient.db(MONGO_DB);
    const collection = db.collection('bookings');

    // Clean target before migration for demo
    await collection.deleteMany({});
    
    const result = await collection.insertMany(transformedBookings);
    console.log(`Successfully migrated ${result.insertedCount} bookings to MongoDB.`);

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pgPool.end();
    if (mongoClient) await mongoClient.close();
    console.log('Migration process finished.');
  }
}

migrate();
