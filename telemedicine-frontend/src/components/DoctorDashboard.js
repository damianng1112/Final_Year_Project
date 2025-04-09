import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { FaUsers, FaUser, FaCalendarAlt, FaCommentAlt, FaHeartbeat, FaCog, FaSignOutAlt } from 'react-icons/fa';
import UserSettings from '../components/UserSettings';
import { initializeTheme, setupThemeListener } from '../utils/theme';
import { requestNotificationPermission, checkScheduledNotifications } from '../utils/notification';

const DoctorDashboard = () => {
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeSection, setActiveSection] = useState('dashboard'); // Track active section
  const [stats, setStats] = useState({
    todayAppointments: 0,
    pendingMessages: 0,
    weeklyConsultations: 0,
    triageAlerts: 0
  });
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
  
        // Check if the user is a doctor
        if (userResponse.data.role !== 'doctor') {
          setError('Access denied. Only doctors can view this dashboard.');
          setLoading(false);
          return;
        }
  
        try {
          // Fetch appointments - wrap in try/catch to handle errors gracefully
          const appointmentsResponse = await api.get(`/api/appointments/${userId}`);
          
          if (appointmentsResponse.data && Array.isArray(appointmentsResponse.data)) {
            // Filter out past appointments
            const currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0); // Set to beginning of day for proper comparison
            
            const upcomingAppointments = appointmentsResponse.data.filter(appointment => {
              if (!appointment.date || !appointment.time) return false; // Guard against malformed data
              
              const appointmentDate = new Date(appointment.date);
              appointmentDate.setHours(0, 0, 0, 0);
              
              // If appointment date is today, check the time
              if (appointmentDate.getTime() === currentDate.getTime()) {
                const currentTime = new Date();
                const [startTime] = appointment.time.split(' - '); // Get the start time
                if (!startTime) return false;
                
                const [hours, minutes] = startTime.split(':').map(Number);
                if (isNaN(hours) || isNaN(minutes)) return false;
                
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
            
            // Calculate real stats based on appointments
            const todayAppointmentCount = appointmentsResponse.data.filter(appointment => {
              if (!appointment.date) return false;
              const appointmentDate = new Date(appointment.date);
              const today = new Date();
              return appointmentDate.toDateString() === today.toDateString();
            }).length;
            
            // Only try to fetch messages if there are appointments
            let pendingMessageCount = 0;
            let allMessages = [];
            
            if (appointmentsResponse.data.length > 0) {
              try {
                // Fetch messages for all appointments to calculate stats and display recent ones
                const messagePromises = appointmentsResponse.data.map(appointment => 
                  api.get(`/api/messages/${appointment._id}`)
                );
                
                // Use Promise.allSettled to handle potential individual message fetch failures
                const messageResults = await Promise.allSettled(messagePromises);
                
                // Process successful message fetches
                allMessages = messageResults
                  .filter(result => result.status === 'fulfilled')
                  .flatMap(result => result.value.data);
                  
                // Sort messages by timestamp (newest first)
                allMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                // Get the 10 most recent messages
                const recentMessages = allMessages.slice(0, 10);
                
                setMessages(recentMessages);
                
                // Calculate message stats
                pendingMessageCount = allMessages.length;
              } catch (messageErr) {
                console.error("Error fetching messages:", messageErr);
                // Don't consider messages a fatal error, just set empty messages
                setMessages([]);
              }
            } else {
              setMessages([]);
            }
            
            // Calculate weekly consultations (appointments in the past 7 days)
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            
            const weeklyConsultationCount = appointmentsResponse.data.filter(appointment => {
              if (!appointment.date) return false;
              const appointmentDate = new Date(appointment.date);
              return appointmentDate >= oneWeekAgo && appointmentDate <= new Date();
            }).length;
            
            // Calculate triage alerts - count appointments with "Severe" in the notes
            // This is a placeholder - in a real app, you would have a dedicated field
            const triageAlertsCount = appointmentsResponse.data.filter(appointment => 
              appointment.status === "pending" && 
              appointment.notes?.toLowerCase().includes("severe")
            ).length;
            
            // Set real stats with fallbacks for new users
            setStats({
              todayAppointments: todayAppointmentCount || 0,
              pendingMessages: pendingMessageCount || 0,
              weeklyConsultations: weeklyConsultationCount || 0,
              triageAlerts: triageAlertsCount || 0
            });
          } else {
            // Handle case where appointmentsResponse.data is not an array
            setAppointments([]);
            setMessages([]);
            setStats({
              todayAppointments: 0,
              pendingMessages: 0,
              weeklyConsultations: 0,
              triageAlerts: 0
            });
          }
        } catch (appointmentErr) {
          console.error("Error fetching appointments:", appointmentErr);
          // Don't consider this a fatal error, just set empty appointments
          setAppointments([]);
          setMessages([]);
          setStats({
            todayAppointments: 0,
            pendingMessages: 0,
            weeklyConsultations: 0,
            triageAlerts: 0
          });
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

  const handleLogout = () => {
    navigate('/logout');
  };

  // Handle sidebar navigation
  const handleNavigation = (section) => {
    setActiveSection(section);
    
    // For links that need to navigate to a different page
    if (section === 'profile') {
      navigate('/profile');
    } else if (section === 'schedule') {
      // Ensure token is passed correctly when navigating to schedule management
      const token = localStorage.getItem('token');
      if (token) {
        navigate('/schedule-management', { state: { fromDashboard: true } });
      } else {
        console.error("Authentication token not found");
        setError("Authentication error. Please login again.");
        setTimeout(() => navigate('/'), 2000);
      }
    } else if (section === 'logout') {
      navigate('/logout');
    }
    // Otherwise, just update the active section for in-page navigation
  };

  // Render content based on active section
  const renderContent = () => {
    switch(activeSection) {
      case 'dashboard':
        return (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-sm text-gray-500 uppercase">Today's Appointments</h3>
                <p className="text-2xl font-bold text-indigo-700 mt-1">{stats.todayAppointments}</p>
                <p className="text-xs text-gray-500 mt-1">3 completed • 5 upcoming</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-sm text-gray-500 uppercase">Pending Messages</h3>
                <p className="text-2xl font-bold text-indigo-700 mt-1">{stats.pendingMessages}</p>
                <p className="text-xs text-gray-500 mt-1">4 urgent • 8 regular</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-sm text-gray-500 uppercase">Weekly Consultations</h3>
                <p className="text-2xl font-bold text-indigo-700 mt-1">{stats.weeklyConsultations}</p>
                <p className="text-xs text-gray-500 mt-1">↑ 8% from last week</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-sm text-gray-500 uppercase">AI Triage Alerts</h3>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.triageAlerts}</p>
                <p className="text-xs text-gray-500 mt-1">Requires your attention</p>
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
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                          {appointment.patient.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{appointment.patient.name}</p>
                          <p className="text-sm text-gray-500">Consultation • {appointment.time}</p>
                          {appointment.notes && appointment.notes.toLowerCase().includes("severe") && (
                            <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              AI Triage: Severe
                            </div>
                          )}
                          {appointment.notes && appointment.notes.toLowerCase().includes("moderate") && (
                            <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              AI Triage: Moderate
                            </div>
                          )}
                          {appointment.notes && appointment.notes.toLowerCase().includes("mild") && (
                            <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              AI Triage: Mild
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{new Date(appointment.date).toLocaleDateString()}</p>
                        <div className="flex space-x-2 mt-1">
                          <Link to={`/video-call/${appointment._id}`}>
                            <button className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">Start Video</button>
                          </Link>
                          <Link to={`/chat/${appointment._id}`}>
                            <button className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">Message</button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    No upcoming appointments scheduled.
                  </div>
                )}
              </div>
            </div>
            
            {/* Patient Messages */}
            <div>
              <h3 className="font-medium text-gray-800 mb-3">Recent Messages</h3>
              <div className="bg-white border rounded-lg divide-y">
                {messages.length > 0 ? (
                  messages.map((message) => {
                    // If the sender is the current user (doctor), show the receiver info
                    const isSender = message.sender._id === user._id;
                    const patientInfo = isSender 
                      ? appointments.find(a => a._id === message.appointmentId)?.patient 
                      : message.sender;
                      
                    if (!patientInfo) return null; // Skip if we can't determine patient info
                    
                    // Format the timestamp
                    const messageDate = new Date(message.timestamp);
                    const formattedDate = messageDate.toLocaleDateString();
                    const formattedTime = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const timeString = `${formattedDate}, ${formattedTime}`;
                    
                    // Check if it's today
                    const isToday = messageDate.toDateString() === new Date().toDateString();
                    const displayTime = isToday 
                      ? `Today, ${formattedTime}` 
                      : timeString;
                    
                    // Get patient initials
                    const initials = patientInfo.name 
                      ? patientInfo.name.split(' ').map(n => n[0]).join('').toUpperCase()
                      : '?';
                      
                    return (
                      <div key={message._id} className="p-3 flex items-start">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
                          {initials}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <p className="font-medium">{patientInfo.name}</p>
                            <p className="text-xs text-gray-500">{displayTime}</p>
                          </div>
                          <p className="text-sm mt-1">{message.content}</p>
                          <Link to={`/chat/${message.appointmentId}`}>
                            <button className="text-xs mt-2 text-indigo-600 hover:text-indigo-800">Reply</button>
                          </Link>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    No recent messages to display.
                  </div>
                )}
              </div>
            </div>
          </>
        );
      
      case 'patients':
        return (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="text-xl font-semibold mb-4">Patient List</h3>
            <p className="text-gray-600 mb-4">View and manage your patients.</p>
            
            <div className="border rounded-lg divide-y">
              {appointments.length > 0 ? (
                // Create a unique list of patients from appointments
                [...new Map(appointments.map(item => [item.patient._id, item.patient])).values()].map(patient => (
                  <div key={patient._id} className="p-4 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {patient.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{patient.name}</p>
                        <p className="text-sm text-gray-500">Patient ID: {patient._id.substring(0, 8)}</p>
                      </div>
                    </div>
                    <div>
                      <button className="text-xs px-3 py-1 rounded bg-indigo-100 text-indigo-700">View Details</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">
                  No patients to display.
                </div>
              )}
            </div>
          </div>
        );
      
      case 'messages':
        return (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="text-xl font-semibold mb-4">Messages</h3>
            <p className="text-gray-600 mb-4">View and respond to patient messages.</p>
            
            <div className="flex mb-4">
              <button className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-medium mr-2">All Messages</button>
              <button className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">Unread</button>
            </div>
            
            <div className="border rounded-lg divide-y">
              {messages.length > 0 ? (
                messages.map((message) => {
                  // If the sender is the current user (doctor), show the receiver info
                  const isSender = message.sender._id === user._id;
                  const patientInfo = isSender 
                    ? appointments.find(a => a._id === message.appointmentId)?.patient 
                    : message.sender;
                    
                  if (!patientInfo) return null; // Skip if we can't determine patient info
                  
                  // Format the timestamp
                  const messageDate = new Date(message.timestamp);
                  const formattedDate = messageDate.toLocaleDateString();
                  const formattedTime = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <div key={message._id} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start space-x-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mt-1">
                            {patientInfo.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{patientInfo.name}</p>
                            <p className="text-sm text-gray-700 mt-1">{message.content}</p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">{formattedDate} {formattedTime}</div>
                      </div>
                      <div className="ml-13 pl-13 mt-2 flex justify-end">
                        <Link to={`/chat/${message.appointmentId}`}>
                          <button className="text-xs px-3 py-1 rounded bg-indigo-100 text-indigo-700">Reply</button>
                        </Link>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-gray-500">
                  No messages to display.
                </div>
              )}
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
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
            className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
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
        <div className="bg-indigo-700 text-white p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Telemedicine Platform</h1>
          <div className="flex items-center space-x-2">
            <span className="text-sm">Dr. {user?.name}</span>
            <div className="h-8 w-8 rounded-full bg-indigo-300 flex items-center justify-center text-indigo-800 font-bold">
              {user?.name?.charAt(0) || 'D'}
            </div>
          </div>
        </div>
        
        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-200 bg-gray-50 p-4 hidden md:block">
            <nav className="space-y-2">
              <div 
                onClick={() => handleNavigation('dashboard')}
                className={`flex items-center space-x-3 p-2 ${activeSection === 'dashboard' ? 'bg-indigo-100 text-indigo-800' : 'text-gray-700 hover:bg-gray-100'} rounded-md cursor-pointer`}
              >
                <FaHeartbeat size={18} />
                <span className="font-medium">Dashboard</span>
              </div>
              
              <div 
                onClick={() => handleNavigation('patients')}
                className={`flex items-center space-x-3 p-2 ${activeSection === 'patients' ? 'bg-indigo-100 text-indigo-800' : 'text-gray-700 hover:bg-gray-100'} rounded-md cursor-pointer`}
              >
                <FaUsers size={18} />
                <span>Patients</span>
              </div>
              
              <div 
                onClick={() => handleNavigation('schedule')}
                className={`flex items-center space-x-3 p-2 ${activeSection === 'schedule' ? 'bg-indigo-100 text-indigo-800' : 'text-gray-700 hover:bg-gray-100'} rounded-md cursor-pointer`}
              >
                <FaCalendarAlt size={18} />
                <span>Schedule</span>
              </div>
              
              <div 
                onClick={() => handleNavigation('messages')}
                className={`flex items-center space-x-3 p-2 ${activeSection === 'messages' ? 'bg-indigo-100 text-indigo-800' : 'text-gray-700 hover:bg-gray-100'} rounded-md cursor-pointer`}
              >
                <FaCommentAlt size={18} />
                <span>Messages</span>
              </div>
              
              <div 
                onClick={() => handleNavigation('settings')}
                className={`flex items-center space-x-3 p-2 ${activeSection === 'settings' ? 'bg-indigo-100 text-indigo-800' : 'text-gray-700 hover:bg-gray-100'} rounded-md cursor-pointer`}
              >
                <FaCog size={18} />
                <span>Settings</span>
              </div>
              
              <div 
                onClick={() => handleNavigation('profile')}
                className={`flex items-center space-x-3 p-2 ${activeSection === 'profile' ? 'bg-indigo-100 text-indigo-800' : 'text-gray-700 hover:bg-gray-100'} rounded-md cursor-pointer`}
              >
                <FaUser size={18} />
                <span>Profile</span>
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
            <h2 className="text-xl font-semibold mb-6">Provider Dashboard</h2>
            
            {/* Render content based on active section */}
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;