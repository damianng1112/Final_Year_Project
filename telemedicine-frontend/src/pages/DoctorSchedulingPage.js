import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import DoctorAvailabilityManager from '../components/DoctorAvailabilityManager';
import { FaArrowLeft } from 'react-icons/fa';

const DoctorSchedulingPage = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('recurring'); // 'recurring' or 'specific'
  const [specificDates, setSpecificDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [timeSlots, setTimeSlots] = useState({
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 30
  });
  const [updateMessage, setUpdateMessage] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          navigate('/');
          return;
        }

        const response = await api.get(`/api/users/user/${userId}`);
        const userData = response.data;
        
        if (userData.role !== 'doctor') {
          setError('This page is only accessible to doctors');
        } else {
          setUserProfile(userData);
          fetchSpecificDates(userData._id);
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const fetchSpecificDates = async (doctorId) => {
    try {
      // This would fetch specific dates where the doctor has custom availability set
      const response = await api.get(
        `/api/availability/specific-dates/${doctorId}`
      );
      setSpecificDates(response.data.dates || []);
    } catch (err) {
      console.error("Error fetching specific dates:", err);
    }
  };

  const handleDateSelection = async (date) => {
    setSelectedDate(date);
    try {
      // Fetch the details for this specific date
      const response = await api.get(
        `/api/availability/date-details/${userProfile._id}?date=${date}`
      );
      
      const { startTime, endTime, slotDuration } = response.data;
      setTimeSlots({
        startTime: startTime || '09:00',
        endTime: endTime || '17:00',
        slotDuration: slotDuration || 30
      });
    } catch (err) {
      console.error("Error fetching date details:", err);
      // Set default values if no specific data found
      setTimeSlots({
        startTime: '09:00',
        endTime: '17:00',
        slotDuration: 30
      });
    }
  };

  const handleTimeSlotsChange = (field, value) => {
    setTimeSlots(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveSpecificDate = async () => {
    if (!selectedDate) {
      setError('Please select a date');
      return;
    }
    
    try {
      await api.post(
        `/api/availability/set-availability`,
        {
          doctorId: userProfile._id,
          date: selectedDate,
          startTime: timeSlots.startTime,
          endTime: timeSlots.endTime,
          slotDuration: timeSlots.slotDuration
        }
      );
      
      setUpdateMessage("Schedule for this date has been updated!");
      // Refresh the list of specific dates
      fetchSpecificDates(userProfile._id);
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setUpdateMessage('');
      }, 3000);
    } catch (err) {
      console.error("Error saving specific date:", err);
      setError('Failed to save changes');
    }
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50">
        <p className="text-red-500 text-lg mb-4">{error}</p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <FaArrowLeft className="mr-2" /> Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold ml-4">Schedule Management</h1>
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="flex border-b">
            <button
              className={`px-4 py-3 ${view === 'recurring' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
              onClick={() => setView('recurring')}
            >
              Recurring Schedule
            </button>
            <button
              className={`px-4 py-3 ${view === 'specific' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
              onClick={() => setView('specific')}
            >
              Specific Dates
            </button>
          </div>

          <div className="p-6">
            {view === 'recurring' ? (
              <DoctorAvailabilityManager userProfile={userProfile} />
            ) : (
              <div className="specific-dates">
                <h2 className="text-xl font-semibold mb-4">Manage Specific Dates</h2>
                <p className="text-gray-600 mb-4">
                  Override your recurring schedule for specific dates (for vacations, special events, etc.)
                </p>

                {updateMessage && (
                  <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
                    {updateMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-2">Select Date:</h3>
                    <input
                      type="date"
                      className="w-full p-2 border rounded"
                      value={selectedDate}
                      onChange={(e) => handleDateSelection(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  {selectedDate && (
                    <div>
                      <h3 className="font-medium mb-2">Adjust Schedule:</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm">Start Time</label>
                          <input
                            type="time"
                            value={timeSlots.startTime}
                            onChange={(e) => handleTimeSlotsChange('startTime', e.target.value)}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm">End Time</label>
                          <input
                            type="time"
                            value={timeSlots.endTime}
                            onChange={(e) => handleTimeSlotsChange('endTime', e.target.value)}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm">Appointment Duration (min)</label>
                          <select
                            value={timeSlots.slotDuration}
                            onChange={(e) => handleTimeSlotsChange('slotDuration', Number(e.target.value))}
                            className="w-full p-2 border rounded"
                          >
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={45}>45 minutes</option>
                            <option value={60}>60 minutes</option>
                          </select>
                        </div>
                        <button
                          onClick={saveSpecificDate}
                          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {specificDates.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-medium mb-2">Custom Schedule Dates:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {specificDates.map(date => (
                        <div
                          key={date}
                          className={`p-2 border rounded cursor-pointer hover:bg-blue-50 ${
                            selectedDate === date ? 'bg-blue-100 border-blue-300' : ''
                          }`}
                          onClick={() => handleDateSelection(date)}
                        >
                          {new Date(date).toLocaleDateString()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorSchedulingPage;