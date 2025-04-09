import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import SymptomChecker from '../components/SymptomChecker';
import { FaCalendarAlt, FaClock, FaCommentAlt, FaHeartbeat, FaUser, FaCog, FaSignOutAlt } from 'react-icons/fa'; 
import UserSettings from '../components/UserSettings';
import { initializeTheme, setupThemeListener } from '../utils/theme';
import { requestNotificationPermission, checkScheduledNotifications } from '../utils/notification';

const PatientDashboard = () => {
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeSection, setActiveSection] = useState('dashboard'); // Track active section
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize theme
    initializeTheme();
    
    // Set up theme listener for system preference changes
    const cleanup = setupThemeListener();
    
    // Request notification permission
    requestNotificationPermission();
    
    // Check for any scheduled notifications
    checkScheduledNotifications();
    
    return () => {
      cleanup();
    };
  }, []);

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
  
        try {
          // Fetch appointments - wrap in try/catch to handle potential errors
          const appointmentsResponse = await api.get(`/api/appointments/${userId}`);
          
          if (appointmentsResponse.data && Array.isArray(appointmentsResponse.data)) {
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
                if (!startTime) return false; // Guard against malformed appointment data
                
                const [hours, minutes] = startTime.split(':').map(Number);
                if (isNaN(hours) || isNaN(minutes)) return false; // Guard against malformed time
                
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
  
            // Only fetch messages if there are appointments
            if (upcomingAppointments.length > 0) {
              try {
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
              } catch (messageErr) {
                console.error("Error fetching messages:", messageErr);
                // Don't consider this a fatal error, just set empty messages
                setMessages([]);
              }
            }
          } else {
            // Handle case where appointmentsResponse.data is not an array
            setAppointments([]);
          }
        } catch (appointmentErr) {
          console.error("Error fetching appointments:", appointmentErr);
          // Don't consider this a fatal error, just set empty appointments
          setAppointments([]);
        }
      } catch (err) {
        console.error("API Error:", err);
        if (err.response && err.response.status === 401) {
          // Handle auth error separately
          setError('Authentication error. Please login again.');
          setTimeout(() => navigate('/'), 2000);
        } else {
          setError('An error occurred while fetching data.');
        }
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, [navigate]);

  // Handle sidebar navigation
  const handleNavigation = (section) => {
    setActiveSection(section);
    
    // For links that need to navigate to a different page
    if (section === 'appointments') {
      navigate('/book-appointment');
    } else if (section === 'profile') {
      navigate('/profile');
    } else if (section === 'logout') {
      navigate('/logout');
    } else if (section === 'triage') {
      navigate('/triage');
    }
    // Otherwise, just update the active section for in-page navigation
  };

  const handleLogout = () => {
    navigate('/logout');
  };

  // Render content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <>
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
                <button 
                  onClick={() => setActiveSection('messages')}
                  className="mt-4 text-sm bg-purple-600 text-white py-1 px-3 rounded"
                >
                  Send Message
                </button>
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
          </>
        );
    
      case 'messages':
        return (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="text-xl font-semibold mb-4">Messages</h3>
            <p className="text-gray-600 mb-4">View and send messages to your healthcare providers.</p>
            
            {appointments.length > 0 ? (
              <div className="space-y-6">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Select a provider to message:</h4>
                  <div className="space-y-2">
                    {/* Create a unique list of doctors from appointments */}
                    {[...new Map(appointments.map(item => [item.doctor._id, item])).values()].map(appointment => (
                      <div key={appointment._id} className="border rounded-lg p-3 flex justify-between items-center hover:bg-blue-50">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
                            {appointment.doctor.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">Dr. {appointment.doctor.name}</p>
                            <p className="text-sm text-gray-500">Last appointment: {new Date(appointment.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <Link to={`/chat/${appointment._id}`}>
                          <button className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                            Message
                          </button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Recent Messages:</h4>
                  <div className="border rounded-lg divide-y">
                    {messages.length > 0 ? (
                      messages.map((message, index) => {
                        const appointment = appointments.find(a => a._id === message.appointmentId);
                        if (!appointment) return null;
                        
                        const messageDate = new Date(message.timestamp);
                        
                        return (
                          <div key={index} className="p-3">
                            <div className="flex justify-between">
                              <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-2">
                                  {message.sender._id === user._id ? user.name.charAt(0) : appointment.doctor.name.charAt(0)}
                                </div>
                                <span className="font-medium">
                                  {message.sender._id === user._id ? 'You' : `Dr. ${appointment.doctor.name}`}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {messageDate.toLocaleDateString()} {messageDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                            <p className="mt-2 text-gray-700">{message.content}</p>
                            <div className="mt-2 text-right">
                              <Link to={`/chat/${message.appointmentId}`}>
                                <button className="text-xs text-blue-600 hover:text-blue-800">
                                  {message.sender._id === user._id ? 'View Conversation' : 'Reply'}
                                </button>
                              </Link>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        No message history to display.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <p className="text-gray-600 mb-4">You don't have any appointments scheduled with healthcare providers.</p>
                <Link to="/book-appointment">
                  <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                    Book an Appointment
                  </button>
                </Link>
              </div>
            )}
          </div>
        );
        
      case 'appointments':
        return (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="text-xl font-semibold mb-4">My Appointments</h3>
            <p className="text-gray-600 mb-4">Manage your upcoming and past appointments.</p>
            
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium">Upcoming Appointments</h4>
              <Link to="/book-appointment">
                <button className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                  Book New Appointment
                </button>
              </Link>
            </div>
            
            <div className="border rounded-lg divide-y mb-6">
              {appointments.length > 0 ? (
                appointments.map((appointment) => (
                  <div key={appointment._id} className="p-4 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {appointment.doctor.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">Dr. {appointment.doctor.name}</p>
                        <div className="flex items-center text-sm text-gray-500">
                          <FaCalendarAlt className="mr-1" size={12} />
                          <span>{new Date(appointment.date).toLocaleDateString()}</span>
                          <span className="mx-1">•</span>
                          <FaClock className="mr-1" size={12} />
                          <span>{appointment.time}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Link to={`/video-call/${appointment._id}`}>
                        <button className="px-3 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200">
                          Video Call
                        </button>
                      </Link>
                      <Link to={`/chat/${appointment._id}`}>
                        <button className="px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200">
                          Message
                        </button>
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-gray-500">
                  No upcoming appointments scheduled.
                </div>
              )}
            </div>
            
            <h4 className="font-medium mb-2">Past Appointments</h4>
            <div className="border rounded-lg divide-y">
              <div className="p-6 text-center text-gray-500">
                No past appointments to display.
              </div>
            </div>
          </div>
        );
        
      case 'settings':
        return (
            <UserSettings user={user} />
        );
      
      default:
        return <div>Select an option from the sidebar.</div>;
    }
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
              <div 
                onClick={() => handleNavigation('dashboard')}
                className={`flex items-center space-x-3 p-2 ${activeSection === 'dashboard' ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100'} rounded-md cursor-pointer`}
              >
                <FaHeartbeat size={18} />
                <span className="font-medium">Dashboard</span>
              </div>
              
              <div 
                onClick={() => handleNavigation('appointments')}
                className={`flex items-center space-x-3 p-2 ${activeSection === 'appointments' ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100'} rounded-md cursor-pointer`}
              >
                <FaCalendarAlt size={18} />
                <span>Appointments</span>
              </div>
              
              <div 
                onClick={() => handleNavigation('messages')}
                className={`flex items-center space-x-3 p-2 ${activeSection === 'messages' ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100'} rounded-md cursor-pointer`}
              >
                <FaCommentAlt size={18} />
                <span>Messages</span>
              </div>
              
              <div 
                onClick={() => handleNavigation('profile')}
                className={`flex items-center space-x-3 p-2 ${activeSection === 'profile' ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100'} rounded-md cursor-pointer`}
              >
                <FaUser size={18} />
                <span>My Profile</span>
              </div>
              
              <div 
                onClick={() => handleNavigation('settings')}
                className={`flex items-center space-x-3 p-2 ${activeSection === 'settings' ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100'} rounded-md cursor-pointer`}
              >
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
            
            {/* Render the appropriate content based on active section */}
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;