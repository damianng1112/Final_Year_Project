import React, { useEffect, useState } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import '../style/App.css';
import SymptomChecker from '../components/SymptomChecker';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserInfo = async () => {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setError('User not logged in');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/user/${userId}`);
        setUser(response.data);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          setError('User not found. Please contact support.');
        } else {
          setError('An error occurred while fetching user information.');
        }
        console.error("Error fetching user information:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

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
        {user.role === 'doctor' ? <DoctorDashboard /> : <PatientDashboard />}
      </div>
    </div>
  );
};

const DoctorDashboard = () => (
  <div>
    <h2 className="text-xl font-semibold text-gray-800">Doctor's Dashboard</h2>
    <p className="text-gray-700">Here, you can see upcoming appointments and patient details.</p>
  </div>
);

const PatientDashboard = () => (
  <div>
    <h2 className="text-xl font-semibold text-gray-800">Patient's Dashboard</h2>
    <p className="text-gray-700">Here, you can book appointments and access your medical records.</p>
    <div className="mt-4">
    <SymptomChecker />
    </div>
  </div>
);


Dashboard.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string,
    role: PropTypes.string,
  }),
};

export default Dashboard;