import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import SymptomChecker from '../components/SymptomChecker';
import { FaCalendarAlt, FaClock, FaCommentAlt, FaHeartbeat, FaUser, FaCog, FaSignOutAlt } from 'react-icons/fa'; 

const PatientDashboard = () => {
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
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

        // Fetch appointments
        const appointmentsResponse = await api.get(`/api/appointments/${userId}`);
        
        // Filter out past appointments
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0); // Set to beginning of day for proper comparison
        
        const upcomingAppointments = appointmentsResponse.data.filter(appointment => {
          const appointmentDate = new Date(appointment.date);
          appointmentDate.setHours(0, 0, 0, 0);
          
          // If appointment date is today, check the time
          if (appointmentDate.getTime() === currentDate.getTime()) {
            const currentTime = new Date();
            const [startTime] = appointment.time.split(' - '); // Get the start time
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

        // Fetch message history for recent activity
        const messagePromises = upcomingAppointments.slice(0, 3).map(appointment => 
          api.get(`/api/messages/${appointment._id}`)
        );
        
        // Use Promise.allSettled to handle potential individual message fetch failures
        const messageResults = await Promise.allSettled(messagePromises);
        
        // Process successful message fetches
        const allMessages = messageResults
          .filter(result => result.status === 'fulfilled')
          .flatMap(result => result.value.data)
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 5); // Get the 5 most recent messages
          
        setMessages(allMessages);

      } catch (err) {
        console.error("API Error:", err);
        setError('An error occurred while fetching data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    navigate('/logout');
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
        <div className="bg-white p-8 rounded-lg shadow-md">
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

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Telemedicine Platform</h1>
          <div className="flex items-center space-x-2">
            <span className="text-sm">Welcome, {user?.name}</span>
            <div className="h-8 w-8 rounded-full bg-blue-300 flex items-center justify-center text-blue-800 font-bold">
              {user?.name?.charAt(0) || '?'}
            </div>
          </div>
        </div>
        
        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-200 bg-gray-50 p-4 hidden md:block">
            <nav className="space-y-2">
              <div className="flex items-center space-x-3 p-2 bg-blue-100 text-blue-800 rounded-md">
                <FaHeartbeat size={18} />
                <span className="font-medium">Dashboard</span>
              </div>
              <Link to="/book-appointment" className="flex items-center space-x-3 p-2 text-gray-700 hover:bg-gray-100 rounded-md">
                <FaCalendarAlt size={18} />
                <span>Appointments</span>
              </Link>
              <div className="flex items-center space-x-3 p-2 text-gray-700 hover:bg-gray-100 rounded-md">
                <FaCommentAlt size={18} />
                <span>Messages</span>
              </div>
              <Link to="/profile" className="flex items-center space-x-3 p-2 text-gray-700 hover:bg-gray-100 rounded-md">
                <FaUser size={18} />
                <span>My Profile</span>
              </Link>
              <div className="flex items-center space-x-3 p-2 text-gray-700 hover:bg-gray-100 rounded-md">
                <FaCog size={18} />
                <span>Settings</span>
              </div>
              <div 
                onClick={handleLogout}
                className="flex items-center space-x-3 p-2 text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
              >
                <FaSignOutAlt size={18} />
                <span>Logout</span>
              </div>
            </nav>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 p-6">
            <h2 className="text-xl font-semibold mb-6">Patient Dashboard</h2>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-indigo-800">Book Appointment</h3>
                    <p className="text-sm text-indigo-600 mt-1">Schedule a consultation</p>
                  </div>
                  <div className="bg-indigo-200 p-2 rounded-full">
                    <FaCalendarAlt size={20} className="text-indigo-700" />
                  </div>
                </div>
                <Link to="/book-appointment">
                  <button className="mt-4 text-sm bg-indigo-600 text-white py-1 px-3 rounded">Book Now</button>
                </Link>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-green-800">Symptom Assessment</h3>
                    <p className="text-sm text-green-600 mt-1">Check your symptoms</p>
                  </div>
                  <div className="bg-green-200 p-2 rounded-full">
                    <FaHeartbeat size={20} className="text-green-700" />
                  </div>
                </div>
                <Link to="/triage">
                  <button className="mt-4 text-sm bg-green-600 text-white py-1 px-3 rounded">Start Assessment</button>
                </Link>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-purple-800">Message Doctor</h3>
                    <p className="text-sm text-purple-600 mt-1">Contact your physician</p>
                  </div>
                  <div className="bg-purple-200 p-2 rounded-full">
                    <FaCommentAlt size={20} className="text-purple-700" />
                  </div>
                </div>
                <button className="mt-4 text-sm bg-purple-600 text-white py-1 px-3 rounded">Send Message</button>
              </div>
            </div>
            
            {/* Upcoming Appointments */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-800 mb-3">Upcoming Appointments</h3>
              <div className="bg-white border rounded-lg divide-y">
                {appointments.length > 0 ? (
                  appointments.map((appointment) => (
                    <div key={appointment._id} className="p-4 flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <div className="bg-blue-100 p-3 rounded-full">
                          <FaClock className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Dr. {appointment.doctor.name}</p>
                          <p className="text-sm text-gray-500">Consultation</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {new Date(appointment.date).toLocaleDateString()}, {appointment.time}
                        </p>
                        <div className="flex space-x-2 mt-1">
                          <Link to={`/video-call/${appointment._id}`}>
                            <button className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">Video Call</button>
                          </Link>
                          <Link to={`/chat/${appointment._id}`}>
                            <button className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">Message</button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    No upcoming appointments. Book one now!
                  </div>
                )}
              </div>
            </div>
            
            {/* Recent Activity */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-800 mb-3">Recent Activity</h3>
              <div className="bg-white border rounded-lg divide-y">
                {messages.length > 0 ? (
                  messages.map((message, index) => {
                    // Format timestamp to relative time
                    const messageDate = new Date(message.timestamp);
                    const now = new Date();
                    const diffTime = Math.abs(now - messageDate);
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
                    const diffMinutes = Math.floor(diffTime / (1000 * 60));
                    
                    let relativeTime = '';
                    if (diffDays > 0) {
                      relativeTime = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                    } else if (diffHours > 0) {
                      relativeTime = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                    } else {
                      relativeTime = `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
                    }
                    
                    const senderIsCurrentUser = message.sender._id === user._id;
                    const activityTitle = senderIsCurrentUser 
                      ? `Message sent to Dr. ${message.sender.name}`
                      : `Message from Dr. ${message.sender.name}`;
                    
                    return (
                      <div key={message._id || index} className="p-3 flex items-center text-sm">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                          <FaCommentAlt className={senderIsCurrentUser ? "text-blue-600" : "text-purple-600"} />
                        </div>
                        <div>
                          <p>{activityTitle}</p>
                          <p className="text-gray-500 text-xs">{relativeTime}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  appointments.map((appointment, index) => (
                    <div key={appointment._id} className="p-3 flex items-center text-sm">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                        <FaCalendarAlt className="text-blue-600" />
                      </div>
                      <div>
                        <p>Appointment with Dr. {appointment.doctor.name}</p>
                        <p className="text-gray-500 text-xs">
                          {new Date(appointment.date).toLocaleDateString()}, {appointment.time}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                {messages.length === 0 && appointments.length === 0 && (
                  <div className="p-3 text-center text-gray-500">
                    No recent activity to display.
                  </div>
                )}
              </div>
            </div>
            
            {/* Symptom Checker */}
            <div className="mt-6">
              <h3 className="font-medium text-gray-800 mb-3">Symptom Checker</h3>
              <SymptomChecker />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;