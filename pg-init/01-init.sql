CREATE TABLE hotels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    rating FLOAT
);

CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    hotel_id INT REFERENCES hotels(id),
    room_number VARCHAR(50) NOT NULL,
    type VARCHAR(100),
    price_per_night DECIMAL(10, 2)
);

CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    hotel_id INT REFERENCES hotels(id),
    room_id INT REFERENCES rooms(id),
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    start_date DATE,
    end_date DATE,
    total_price DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE outbox (
    id SERIAL PRIMARY KEY,
    aggregate_type VARCHAR(100),
    aggregate_id VARCHAR(100),
    type VARCHAR(100),
    payload JSONB,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert dummy data
INSERT INTO hotels (name, location, rating) VALUES 
('Grand Plaza', 'New York', 4.5),
('Ocean View', 'Miami', 4.8),
('Mountain Retreat', 'Denver', 4.2);

INSERT INTO rooms (hotel_id, room_number, type, price_per_night) VALUES 
(1, '101', 'Standard', 150.00),
(1, '102', 'Deluxe', 250.00),
(2, '201', 'Suite', 500.00),
(3, '301', 'Cabin', 120.00);
