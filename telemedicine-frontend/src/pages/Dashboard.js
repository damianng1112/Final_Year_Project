import React, { useEffect, useState } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FaUserCircle } from 'react-icons/fa'; 
import '../style/App.css';
import SymptomChecker from '../components/SymptomChecker';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setError('User not logged in');
        setLoading(false);
        return;
      }

      try {
        // Fetch user data
        const userResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/users/user/${userId}`);
        setUser(userResponse.data);
      } catch (err) {
        handleFetchError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user) return;
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/appointments/${user._id}`);
        
        // Filter out past appointments
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0); // Set to beginning of day for proper comparison
        
        const upcomingAppointments = response.data.filter(appointment => {
          const appointmentDate = new Date(appointment.date);
          appointmentDate.setHours(0, 0, 0, 0);
          
          // If appointment date is today, check the time
          if (appointmentDate.getTime() === currentDate.getTime()) {
            const currentTime = new Date();
            const [startTime] = appointment.time.split(' - '); // Get the start time (assuming format "HH:MM - HH:MM")
            const [hours, minutes] = startTime.split(':').map(Number);
            
            // Create a date object for the appointment time today
            const appointmentTime = new Date();
            appointmentTime.setHours(hours, minutes, 0, 0);
            
            // Keep if appointment time is in the future
            return appointmentTime > currentTime;
          }
          
          // Keep if appointment date is in the future
          return appointmentDate > currentDate;
        });
        
        setAppointments(upcomingAppointments);
      } catch (err) {
        console.error("Error fetching appointments:", err);
      }
    };

    fetchAppointments();
  }, [user]);

  const handleFetchError = (err) => {
    if (err.response) {
      if (err.response.status === 404) {
        setError('User not found. Please contact support.');
      } else {
        setError('An error occurred while fetching data.');
      }
    } else {
      setError('Network error. Please check your connection.');
    }
    console.error("API Error:", err);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-gray-700 text-lg">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-100">
        <p className="text-red-500 text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Bar */}
      <div className="bg-white shadow py-4 px-6 flex justify-between items-center">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <Link to="/profile" className="text-blue-600 hover:text-blue-800">
          <FaUserCircle size={32} />
        </Link>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-4 bg-white shadow-lg rounded-lg mt-6">
        <h1 className="text-2xl font-bold text-gray-800">Welcome, {user.name}!</h1>
        <p className="text-gray-700">Role: {user.role}</p>
        
        {user.role === 'doctor' ? (
          <DoctorDashboard user={user} appointments={appointments} />
        ) : (
          <PatientDashboard user={user} appointments={appointments} />
        )}
      </div>
    </div>
  );
};

const DoctorDashboard = ({ user, appointments }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Doctor's Dashboard</h2>
      
      {/* Schedule Management Link */}
      <div className="mb-4">
        <Link
          to="/schedule-management"
          className="inline-block px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Manage Schedule
        </Link>
      </div>
      
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">Upcoming Appointments</h3>
        {appointments.length > 0 ? (
          <div className="space-y-2">
            {appointments.map(appointment => (
              <div key={appointment._id} className="p-3 bg-gray-50 rounded-lg">
                <p>Patient: {appointment.patient.name}</p>
                <p>Date: {new Date(appointment.date).toLocaleDateString()}</p>
                <p>Time: {appointment.time}</p>
                <div className="mt-2 space-x-3">
                  <Link
                    to={`/chat/${appointment._id}`}
                    className="text-blue-600 hover:underline"
                  >
                    Message Patient
                  </Link>
                  <Link
                    to={`/video-call/${appointment._id}`}
                    className="text-blue-600 hover:underline"
                  >
                    Start Video Call
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No upcoming appointments</p>
        )}
      </div>
    </div>
  );
};

const PatientDashboard = ({ user, appointments }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Patient's Dashboard</h2>
      
      <div className="space-y-4">
        <div className="flex space-x-3">
          <Link
            to="/book-appointment"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Book New Appointment
          </Link>
          
          <Link
            to="/triage"
            className="inline-block px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            AI Symptom Assessment
          </Link>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Your Upcoming Appointments</h3>
          {appointments.length > 0 ? (
            <div className="space-y-2">
              {appointments.map(appointment => (
                <div key={appointment._id} className="p-3 bg-gray-50 rounded-lg">
                  <p>Doctor: {appointment.doctor.name}</p>
                  <p>Date: {new Date(appointment.date).toLocaleDateString()}</p>
                  <p>Time: {appointment.time}</p>
                  <div className="mt-2 space-x-3">
                    <Link
                      to={`/chat/${appointment._id}`}
                      className="text-blue-600 hover:underline"
                    >
                      Message Doctor
                    </Link>
                    <Link
                      to={`/video-call/${appointment._id}`}
                      className="text-blue-600 hover:underline"
                    >
                      Start Video Call
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No upcoming appointments</p>
          )}
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">Symptom Checker</h3>
          <SymptomChecker />
        </div>
      </div>
    </div>
  );
};

Dashboard.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string,
    role: PropTypes.string,
    _id: PropTypes.string,
  }),
};

export default Dashboard;