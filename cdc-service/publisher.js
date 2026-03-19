const { Pool } = require('pg');
const { Kafka } = require('kafkajs');

const pgPool = new Pool({
  user: process.env.PG_USER || 'hotel_user',
  host: process.env.PG_HOST || 'localhost',
  database: process.env.PG_DB || 'hotel_db',
  password: process.env.PG_PASSWORD || 'hotel_password',
  port: process.env.PG_PORT || 5432,
});

const kafka = new Kafka({
  clientId: 'hotel-cdc-publisher',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const producer = kafka.producer();
const TOPIC = 'hotel.public.bookings';

async function startPublisher() {
  await producer.connect();
  console.log('Publisher connected to Kafka.');

  setInterval(async () => {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      
      const { rows } = await client.query(`
        SELECT * FROM outbox WHERE processed = FALSE ORDER BY id ASC LIMIT 100 FOR UPDATE SKIP LOCKED
      `);

      if (rows.length > 0) {
        const messages = rows.map(r => ({
          key: r.aggregate_id,
          value: JSON.stringify({
            eventId: r.id,
            aggregateType: r.aggregate_type,
            aggregateId: r.aggregate_id,
            type: r.type,
            payload: r.payload,
            timestamp: r.created_at
          })
        }));

        await producer.send({
          topic: TOPIC,
          messages,
        });

        const outboxIds = rows.map(r => r.id);
        await client.query(`UPDATE outbox SET processed = TRUE WHERE id = ANY($1)`, [outboxIds]);
        
        console.log(`Published ${rows.length} events to Kafka (${TOPIC})`);
      }
      
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error publishing messages:', err);
    } finally {
      client.release();
    }
  }, 3000); // Polling every 3 seconds
}

startPublisher().catch(console.error);
