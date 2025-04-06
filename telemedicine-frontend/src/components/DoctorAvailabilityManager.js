import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DoctorAvailabilityManager = ({ userProfile }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [recurringSchedule, setRecurringSchedule] = useState([
    { dayOfWeek: 1, active: false, startTime: '09:00', endTime: '17:00', slotDuration: 30 }, // Monday
    { dayOfWeek: 2, active: false, startTime: '09:00', endTime: '17:00', slotDuration: 30 }, // Tuesday
    { dayOfWeek: 3, active: false, startTime: '09:00', endTime: '17:00', slotDuration: 30 }, // Wednesday
    { dayOfWeek: 4, active: false, startTime: '09:00', endTime: '17:00', slotDuration: 30 }, // Thursday
    { dayOfWeek: 5, active: false, startTime: '09:00', endTime: '17:00', slotDuration: 30 }, // Friday
    { dayOfWeek: 6, active: false, startTime: '09:00', endTime: '13:00', slotDuration: 30 }, // Saturday
    { dayOfWeek: 0, active: false, startTime: '09:00', endTime: '13:00', slotDuration: 30 }, // Sunday
  ]);
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Fetch doctor's existing recurring schedule
  useEffect(() => {
    if (userProfile && userProfile.role === 'doctor') {
      fetchRecurringSchedule();
    }
  }, [userProfile]);

  const fetchRecurringSchedule = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/availability/recurAvailability/${userProfile._id}`
      );
      
      if (response.data.recurringAvailability && response.data.recurringAvailability.length > 0) {
        // Map existing schedule to our format
        const existingSchedule = [...recurringSchedule];
        response.data.recurringAvailability.forEach(item => {
          const index = existingSchedule.findIndex(day => day.dayOfWeek === item.dayOfWeek);
          if (index !== -1) {
            existingSchedule[index] = {
              ...existingSchedule[index],
              active: true,
              startTime: item.startTime,
              endTime: item.endTime,
              slotDuration: item.slotDuration,
              _id: item._id // Keep track of MongoDB ID if it exists
            };
          }
        });
        setRecurringSchedule(existingSchedule);
      }
    } catch (err) {
      setError('Failed to load your recurring schedule.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleChange = (index, field, value) => {
    const updatedSchedule = [...recurringSchedule];
    updatedSchedule[index] = {
      ...updatedSchedule[index],
      [field]: value
    };
    setRecurringSchedule(updatedSchedule);
  };

  const saveRecurringSchedule = async () => {
    try {
      setLoading(true);
      setMessage('');
      setError('');

      // Extract active days
      const activeDays = recurringSchedule.filter(day => day.active);
      
      if (activeDays.length === 0) {
        setError('Please select at least one day of the week for your schedule.');
        setLoading(false);
        return;
      }

      // For each active day, update or create recurring availability
      const promises = activeDays.map(async (day) => {
        const scheduleData = {
          dayOfWeek: day.dayOfWeek,
          startTime: day.startTime,
          endTime: day.endTime,
          slotDuration: day.slotDuration
        };

        if (day._id) {
          // Update existing
          return axios.put(
            `${process.env.REACT_APP_API_URL}/api/availability/${userProfile._id}/${day._id}`,
            scheduleData
          );
        } else {
          // Create new
          return axios.post(
            `${process.env.REACT_APP_API_URL}/api/availability/set-recurring`,
            {
              doctorId: userProfile._id,
              ...scheduleData
            }
          );
        }
      });

      await Promise.all(promises);
      setMessage('Recurring schedule saved successfully!');
      fetchRecurringSchedule(); // Refresh data
    } catch (err) {
      setError('Failed to save recurring schedule.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyAvailability = async () => {
    try {
      setLoading(true);
      setMessage('');
      setError('');

      // Check if at least one recurring day is set
      const activeDays = recurringSchedule.filter(day => day.active);
      if (activeDays.length === 0) {
        setError('Please set up your recurring schedule first.');
        setLoading(false);
        return;
      }

      // Call the backend to generate availability for the next month
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/availability/generate-monthly`,
        {
          doctorId: userProfile._id
        }
      );

      setMessage('Monthly availability generated successfully!');
    } catch (err) {
      setError('Failed to generate monthly availability.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!userProfile || userProfile.role !== 'doctor') {
    return <div>This feature is only available for doctors.</div>;
  }

  return (
    <div className="bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Manage Your Availability</h2>
      {message && <p className="text-green-600 mb-2">{message}</p>}
      {error && <p className="text-red-600 mb-2">{error}</p>}

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-3">Recurring Weekly Schedule</h3>
        <p className="text-gray-600 mb-4">
          Set your regular weekly hours. This will be used as a template for generating your availability.
        </p>
        
        <div className="space-y-4">
          {recurringSchedule.map((day, index) => (
            <div key={index} className="border p-4 rounded">
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id={`day-${day.dayOfWeek}`}
                  checked={day.active}
                  onChange={(e) => handleScheduleChange(index, 'active', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor={`day-${day.dayOfWeek}`} className="font-medium">
                  {dayNames[day.dayOfWeek]}
                </label>
              </div>
              
              {day.active && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-6">
                  <div>
                    <label className="block text-sm">Start Time</label>
                    <input
                      type="time"
                      value={day.startTime}
                      onChange={(e) => handleScheduleChange(index, 'startTime', e.target.value)}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm">End Time</label>
                    <input
                      type="time"
                      value={day.endTime}
                      onChange={(e) => handleScheduleChange(index, 'endTime', e.target.value)}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm">Appointment Duration (min)</label>
                    <select
                      value={day.slotDuration}
                      onChange={(e) => handleScheduleChange(index, 'slotDuration', Number(e.target.value))}
                      className="w-full p-2 border rounded"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <button
          onClick={saveRecurringSchedule}
          disabled={loading}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {loading ? 'Saving...' : 'Save Recurring Schedule'}
        </button>
      </div>
      
      <div className="border-t pt-6">
        <h3 className="text-xl font-semibold mb-3">Generate Monthly Availability</h3>
        <p className="text-gray-600 mb-4">
          This will automatically create your availability for the next 30 days based on your recurring schedule.
          You can always modify specific dates later.
        </p>
        
        <button
          onClick={generateMonthlyAvailability}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-green-300"
        >
          {loading ? 'Generating...' : 'Generate Monthly Availability'}
        </button>
      </div>
    </div>
  );
};

export default DoctorAvailabilityManager;