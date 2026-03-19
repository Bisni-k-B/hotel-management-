import { useState, useEffect } from 'react'
import axios from 'axios'
import './index.css'

const API_BASE = 'http://localhost:3001/api'
const SEARCH_API = 'http://localhost:3002/api'

function App() {
  const [view, setView] = useState('book') // 'book' or 'search'
  const [hotels, setHotels] = useState([])
  const [selectedHotel, setSelectedHotel] = useState(null)
  const [rooms, setRooms] = useState([])
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState(null)
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    start_date: '',
    end_date: ''
  })
  const [bookingSuccess, setBookingSuccess] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    fetchHotels()
  }, [])

  const fetchHotels = async () => {
    try {
      const res = await axios.get(`${API_BASE}/hotels`)
      setHotels(res.data)
    } catch (error) {
      console.error('Error fetching hotels:', error)
    }
  }

  const handleHotelClick = async (hotel) => {
    setSelectedHotel(hotel)
    try {
      const res = await axios.get(`${API_BASE}/hotels/${hotel.id}/rooms`)
      setRooms(res.data)
    } catch (error) {
      console.error('Error fetching rooms:', error)
    }
  }

  const openBooking = (room) => {
    setSelectedRoom(room)
    setBookingModalOpen(true)
    setBookingSuccess(false)
  }

  const handleBook = async (e) => {
    e.preventDefault()
    const start = new Date(formData.start_date)
    const end = new Date(formData.end_date)
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
    const totalPrice = days > 0 ? days * selectedRoom.price_per_night : selectedRoom.price_per_night

    try {
      await axios.post(`${API_BASE}/bookings`, {
        hotel_id: selectedHotel.id,
        room_id: selectedRoom.id,
        ...formData,
        total_price: totalPrice
      })
      setBookingSuccess(true)
      setTimeout(() => {
        setBookingModalOpen(false)
        setFormData({ customer_name: '', customer_email: '', start_date: '', end_date: '' })
      }, 2000)
    } catch (error) {
      console.error('Booking failed', error)
      alert('Booking failed!')
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    setIsSearching(true)
    try {
      // Search by partial name or hotel name
      const res = await axios.get(`${SEARCH_API}/search?name=${searchQuery}`)
      setSearchResults(res.data)
    } catch (error) {
      console.error('Search failed', error)
      alert('Search API might not be running (Port 3002)')
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="container animate-slide-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Premium Stays</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className={`auto-width ${view === 'book' ? '' : 'outline'}`}
            onClick={() => setView('book')}
          >
            Booking App (Pg)
          </button>
          <button 
            className={`auto-width ${view === 'search' ? 'success' : 'success-outline'}`}
            onClick={() => setView('search')}
          >
            Migrated Data Search (Mongo)
          </button>
        </div>
      </div>
      
      {view === 'book' && (
        <>
          {!selectedHotel ? (
            <div className="grid">
              {hotels.map((hotel, idx) => (
                <div key={hotel.id} className="card animate-pop-in" style={{ animationDelay: `${idx * 0.05}s` }} onClick={() => handleHotelClick(hotel)}>
                  <h3>{hotel.name}</h3>
                  <div className="rating">★ {hotel.rating}</div>
                  <p>{hotel.location}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="animate-slide-up">
              <button className="outline auto-width" style={{marginBottom: '2rem'}} onClick={() => setSelectedHotel(null)}>
                ← Back to Hotels
              </button>
              <div style={{marginBottom: '1rem'}}>
                <h2>{selectedHotel.name} - Available Rooms</h2>
              </div>
              <div className="grid">
                {rooms.map((room, idx) => (
                  <div key={room.id} className="card animate-pop-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <h3>Room {room.room_number}</h3>
                    <p>Type: {room.type}</p>
                    <p>Price: ${room.price_per_night} / night</p>
                    <button style={{marginTop: '1.5rem'}} onClick={() => openBooking(room)}>
                      Book Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bookingModalOpen && (
            <div className="modal-overlay">
              <div className="modal-content">
                <button className="close-btn" onClick={() => setBookingModalOpen(false)}>×</button>
                <h2>Book {selectedRoom.type} Room</h2>
                <p>\${selectedRoom.price_per_night} per night</p>
                
                {bookingSuccess ? (
                  <div className="success-message">
                    Booking confirmed successfully!
                  </div>
                ) : (
                  <form onSubmit={handleBook}>
                    <input type="text" placeholder="Full Name" required value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} />
                    <input type="email" placeholder="Email Address" required value={formData.customer_email} onChange={e => setFormData({...formData, customer_email: e.target.value})} />
                    <label style={{display: 'block', marginBottom: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500}}>Check-in Date</label>
                    <input type="date" required value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                    <label style={{display: 'block', marginBottom: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500}}>Check-out Date</label>
                    <input type="date" required value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
                    <button type="submit" style={{marginTop: '1rem'}}>Confirm Booking</button>
                  </form>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {view === 'search' && (
        <div className="search-panel animate-slide-up">
          <h2 style={{color: 'var(--text-primary)'}}>Search NoSQL DB (MongoDB)</h2>
          <p style={{color: 'var(--text-secondary)', marginBottom: '2.5rem'}}>
            This data is migrated from Postgres either entirely via the Database Migration Job or incrementally in real-time via the Kafka CDC Pipeline.
          </p>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
            <input 
              type="text" 
              placeholder="Search by Customer Name..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ marginBottom: 0 }}
            />
            <button type="submit" className="success auto-width">
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {searchResults.length === 0 ? (
              <p style={{textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0'}}>No results found. Hit search to view all data!</p>
            ) : (
              searchResults.map((b, idx) => (
                <div key={b._id} className="search-result animate-pop-in" style={{ animationDelay: `${idx * 0.03}s` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                    <strong style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>{b.customer.name}</strong>
                    <span className={b.cdcSynced ? 'badge-synced' : 'badge-migrated'}>
                      {b.cdcSynced ? 'CDC Synced' : 'Migrated Chunk'}
                    </span>
                  </div>
                  <div className="search-grid">
                    <div><strong>Hotel:</strong> {b.hotel.name} ({b.hotel.location})</div>
                    <div><strong>Email:</strong> {b.customer.email}</div>
                    <div><strong>Dates:</strong> {new Date(b.dates.start).toLocaleDateString()} - {new Date(b.dates.end).toLocaleDateString()}</div>
                    <div><strong>Total Price:</strong> ${b.totalPrice}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
