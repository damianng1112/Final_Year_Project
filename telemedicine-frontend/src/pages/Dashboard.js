import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import PatientDashboard from '../components/PatientDashboard';
import DoctorDashboard from '../components/DoctorDashboard';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setError('User not logged in');
        setLoading(false);
        navigate('/');
        return;
      }

      try {
        // Fetch user data
        const userResponse = await api.get(`/api/users/user/${userId}`);
        setUser(userResponse.data);
      } catch (err) {
        handleFetchError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <p className="text-red-500 text-xl">{error}</p>
          <button 
            onClick={() => navigate('/')} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Conditional rendering based on user role
  if (user?.role === 'doctor') {
    return <DoctorDashboard />;
  } else {
    return <PatientDashboard />;
  }
};

export default Dashboard;