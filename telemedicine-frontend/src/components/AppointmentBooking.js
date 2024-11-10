import React, { useState } from 'react';
import axios from 'axios';

const AppointmentBooking = () => {
  const [doctor, setDoctor] = useState('');
  const [date, setDate] = useState('');
  const [patient, setPatient] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/book-appointment`, { doctor, date, patient });
      console.log(response.data);
    } catch (err) {
      console.error("Error booking appointment", err);
    }
  };

  return (
    <div>
      <h2>Book an Appointment</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" value={doctor} onChange={(e) => setDoctor(e.target.value)} placeholder="Doctor Name" required />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <input type="text" value={patient} onChange={(e) => setPatient(e.target.value)} placeholder="Patient Name" required />
        <button type="submit">Book Appointment</button>
      </form>
    </div>
  );
};

export default AppointmentBooking;
