const { Kafka } = require('kafkajs');
const axios = require('axios');
const { MongoClient } = require('mongodb');

const kafka = new Kafka({
  clientId: 'hotel-cdc-subscriber',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});
const consumer = kafka.consumer({ groupId: 'hotel-cdc-group' });
const TOPIC = 'hotel.public.bookings';

const API_BASE = process.env.API_BASE || 'http://localhost:3001/api';
const MONGO_URL = process.env.MONGO_URL || 'mongodb://root:password@localhost:27017';
const MONGO_DB = process.env.MONGO_DB || 'hotel_nosql_db';

let db;

async function startSubscriber() {
  const mongoClient = new MongoClient(MONGO_URL);
  await mongoClient.connect();
  db = mongoClient.db(MONGO_DB);
  console.log('Subscriber connected to MongoDB.');

  await consumer.connect();
  console.log('Subscriber connected to Kafka.');
  
  await consumer.subscribe({ topic: TOPIC, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        console.log(`Received event: ${event.type} for Aggregate ID: ${event.aggregateId}`);
        
        if (event.type === 'BOOKING_CREATED') {
          // Call API to fetch the changes from relational DB
          console.log(`Fetching latest data from API for booking ${event.aggregateId}...`);
          const response = await axios.get(`${API_BASE}/bookings/${event.aggregateId}`);
          const b = response.data;
          
          // Transform
          const transformedBooking = {
            _id: b.id.toString(),
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
              location: b.location
            },
            room: {
              id: b.room_id,
              number: b.room_number,
              type: b.room_type
            },
            migratedAt: new Date(),
            cdcSynced: true
          };

          // Load directly to MongoDB
          const collection = db.collection('bookings');
          await collection.updateOne(
            { _id: transformedBooking._id },
            { $set: transformedBooking },
            { upsert: true }
          );
          
          console.log(`Successfully synced booking ${b.id} to NoSQL DB!`);
        }
      } catch (err) {
        console.error('Error processing Kafka message:', err.message);
      }
    },
  });
}

startSubscriber().catch(console.error);
