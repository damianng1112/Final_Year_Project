import React from 'react';
import { BrowserRouter as Router, Route, Routes, useParams } from 'react-router-dom';
import Login from './Login';
import Signup from './Signup';
import Dashboard from './Dashboard';
import AppointmentBooking from '../components/AppointmentBooking';
import Chat from "../components/Chat"; 
import VideoCall from '../components/VideoCall';
import ProfilePage from '../components/profile/profilePage';
import Logout from '../components/profile/logout';

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
          <Route path="/chat/:appointmentId" element={<ChatWrapper />} />
          <Route path="/profile" element={<ProfilePage />} />`
          <Route path="/logout" element={<Logout />} />
        </Routes>
      </div>
    </Router>
  );
}

// Wrapper to pass the appointmentId from URL to Chat component
const ChatWrapper = () => {
  const { appointmentId } = useParams();
  return <Chat appointmentId={appointmentId} />;
};

export default App;
