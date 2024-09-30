import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './Login';
import Signup from './Signup';
import Dashboard from './Dashboard';
import AppointmentBooking from '../components/AppointmentBooking';
import VideoCall from '../components/VideoCall';

function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<Login />} /> 
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/book-appointment" element={<AppointmentBooking />} />
          <Route path="/video-call" element={<VideoCall />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
