const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://root:password@localhost:27017';
const MONGO_DB = process.env.MONGO_DB || 'hotel_nosql_db';

let db;

async function connectMongo() {
  const mongoClient = new MongoClient(MONGO_URL);
  await mongoClient.connect();
  db = mongoClient.db(MONGO_DB);
  console.log('Search API connected to MongoDB');
}

// Search endpoint for demo
app.get('/api/search', async (req, res) => {
  try {
    const { name, email, hotelName } = req.query;
    let query = {};
    
    if (name) query['customer.name'] = { $regex: name, $options: 'i' };
    if (email) query['customer.email'] = { $regex: email, $options: 'i' };
    if (hotelName) query['hotel.name'] = { $regex: hotelName, $options: 'i' };
    
    // Default to fetch all if no params (limit to 50 for safety)
    const bookings = await db.collection('bookings').find(query).sort({ migratedAt: -1 }).limit(100).toArray();
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error parsing search' });
  }
});

connectMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`Search API running on port ${PORT}`);
  });
}).catch(console.error);
