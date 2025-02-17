import React, { useEffect, useState } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
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

        // Fetch appointments if patient
        // if (userResponse.data.role === 'patient') {
        //   const appointmentsResponse = await axios.get(
        //     `${process.env.REACT_APP_API_URL}/api/appointments/book-appointment`
        //   );
        //   setAppointments(appointmentsResponse.data);
        // }
      } catch (err) {
        handleFetchError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
      <div className="max-w-4xl mx-auto p-6 space-y-4 bg-white shadow-lg rounded-lg">
        <h1 className="text-2xl font-bold text-gray-800">Welcome, {user.name}!</h1>
        <p className="text-gray-700">Role: {user.role}</p>
        
        {user.role === 'doctor' ? (
          <DoctorDashboard user={user} />
        ) : (
          <PatientDashboard user={user} appointments={appointments} />
        )}
      </div>
    </div>
  );
};

const DoctorDashboard = ({ user }) => {
  const [doctorAppointments, setDoctorAppointments] = useState([]);

  useEffect(() => {
    const fetchDoctorAppointments = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/doctor-appointments/${user._id}`
        );
        setDoctorAppointments(response.data);
      } catch (err) {
        console.error("Error fetching doctor appointments:", err);
      }
    };

    fetchDoctorAppointments();
  }, [user._id]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Doctor's Dashboard</h2>
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">Upcoming Appointments</h3>
        {doctorAppointments.length > 0 ? (
          <div className="space-y-2">
            {doctorAppointments.map(appointment => (
              <div key={appointment._id} className="p-3 bg-gray-50 rounded-lg">
                <p>Patient: {appointment.patient.name}</p>
                <p>Date: {new Date(appointment.date).toLocaleDateString()}</p>
                <p>Time: {appointment.time}</p>
                <Link 
                  to={`/video-call/${appointment._id}`}
                  className="text-blue-600 hover:underline"
                >
                  Start Video Call
                </Link>
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
        <Link
          to="/book-appointment"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Book New Appointment
        </Link>

        <div>
          <h3 className="text-lg font-medium mb-2">Your Appointments</h3>
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