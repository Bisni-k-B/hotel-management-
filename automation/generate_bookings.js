const { request } = require('playwright');
const { faker } = require('@faker-js/faker');

const API_BASE = 'http://localhost:3001/api';

const HOTELS = [
  { id: 1, rooms: [1, 2] },
  { id: 2, rooms: [3] },
  { id: 3, rooms: [4] }
];

async function generateBookings() {
  console.log('Starting automated booking generation for the next 3 years...');
  const apiContext = await request.newContext();
  
  const TOTAL_BOOKINGS = 2000; // Generate 2000 bookings
  let successCount = 0;
  
  const now = new Date();
  const threeYearsFromNow = new Date();
  threeYearsFromNow.setFullYear(now.getFullYear() + 3);

  for (let i = 0; i < TOTAL_BOOKINGS; i++) {
    const hotel = faker.helpers.arrayElement(HOTELS);
    const room_id = faker.helpers.arrayElement(hotel.rooms);
    
    // Generate dates within next 3 years
    const start_date = faker.date.between({ from: now, to: threeYearsFromNow });
    const end_date = new Date(start_date);
    end_date.setDate(end_date.getDate() + faker.number.int({ min: 1, max: 14 }));
    
    const total_price = faker.number.int({ min: 100, max: 3000 });

    try {
      const response = await apiContext.post(`${API_BASE}/bookings`, {
        data: {
          hotel_id: hotel.id,
          room_id: room_id,
          customer_name: faker.person.fullName(),
          customer_email: faker.internet.email(),
          start_date: start_date.toISOString().split('T')[0],
          end_date: end_date.toISOString().split('T')[0],
          total_price: total_price
        }
      });

      if (response.ok()) {
        successCount++;
        if (successCount % 100 === 0) {
          console.log(`Successfully generated ${successCount} bookings...`);
        }
      }
    } catch (err) {
      console.error('Failed to create booking', err.message);
    }
  }

  console.log(`Finished generating ${successCount} bookings!`);
  await apiContext.dispose();
}

generateBookings().catch(console.error);
