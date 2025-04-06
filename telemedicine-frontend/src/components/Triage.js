import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const TriageAssessment = () => {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [conversation, setConversation] = useState([
    { sender: "bot", message: "Hello! I'm your virtual health assistant. I can help you assess your symptoms and book an appointment if needed." },
    { sender: "bot", message: "Before we begin, please select a doctor from the dropdown below." }
  ]);
  
  const [currentInput, setCurrentInput] = useState("");
  const [stage, setStage] = useState("doctor-selection"); // Stages: doctor-selection, symptom-input, assessment, booking, confirmation
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [availableDates, setAvailableDates] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [assessmentData, setAssessmentData] = useState(null);
  
  const chatContainerRef = useRef(null);
  const navigate = useNavigate();

  // Fetch doctors on component mount
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/users/doctors`
        );
        setDoctors(response.data);
        
        // Auto-select first doctor if available
        if (response.data.length > 0) {
          setSelectedDoctor(response.data[0]._id);
        }
      } catch (err) {
        console.error("Failed to fetch doctors:", err);
        addMessage("bot", "I'm having trouble fetching our doctors list. Please try again later.");
      }
    };

    fetchDoctors();
  }, []);

  // Scroll to bottom of chat whenever conversation updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation]);

  // Fetch available dates when doctor is selected and stage changes to booking
  useEffect(() => {
    if (selectedDoctor && stage === "booking") {
      fetchAvailableDates();
    }
  }, [selectedDoctor, stage]);

  // Fetch time slots when a date is selected
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchTimeSlots();
    }
  }, [selectedDoctor, selectedDate]);

  const addMessage = (sender, message) => {
    setConversation(prev => [...prev, { sender, message }]);
  };

  const fetchAvailableDates = async () => {
    try {
      setLoading(true);
      addMessage("bot", "Let me check when the doctor is available...");
      
      // Call the API to get available dates in the next 14 days
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/availability/${selectedDoctor}/range`,
        {
          params: {
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }
        }
      );
      
      // Extract unique dates from the available slots
      const availableDatesSet = new Set();
      if (response.data.availableSlots && response.data.availableSlots.length > 0) {
        response.data.availableSlots.forEach(slot => {
          availableDatesSet.add(slot.date);
        });
        
        const uniqueDates = [...availableDatesSet].sort();
        setAvailableDates(uniqueDates);
        
        addMessage("bot", `I found ${uniqueDates.length} days with available appointments in the next two weeks. Please select a date:`);
      } else {
        setAvailableDates([]);
        addMessage("bot", "I'm sorry, this doctor doesn't have any available slots in the next two weeks. Would you like to select another doctor?");
      }
    } catch (error) {
      console.error("Error fetching available dates:", error);
      addMessage("bot", "I'm having trouble finding available dates. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeSlots = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/availability/${selectedDoctor}?date=${selectedDate}`
      );
      
      setTimeSlots(response.data.availableSlots || []);
      
      if (response.data.availableSlots && response.data.availableSlots.length > 0) {
        addMessage("bot", `I found ${response.data.availableSlots.length} available time slots for ${formatDate(selectedDate)}. Please select one:`);
      } else {
        addMessage("bot", `I'm sorry, there are no available slots for ${formatDate(selectedDate)}. Please select another date.`);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching time slots:", error);
      addMessage("bot", "I'm having trouble finding available time slots. Please try again later.");
      setLoading(false);
    }
  };

  const handleDoctorSelection = () => {
    if (!selectedDoctor) {
      addMessage("bot", "Please select a doctor to continue.");
      return;
    }
    
    const doctor = doctors.find(doc => doc._id === selectedDoctor);
    addMessage("user", `I'd like to speak with Dr. ${doctor.name}`);
    addMessage("bot", `Great! You've selected Dr. ${doctor.name}.`);
    addMessage("bot", "Now, please describe your symptoms in as much detail as possible. This will help me assess your condition.");
    
    setStage("symptom-input");
    setCurrentInput("");
  };

  const handleChangeDoctor = () => {
    addMessage("user", "I'd like to select another doctor");
    addMessage("bot", "No problem. Please select a different doctor:");
    setStage("doctor-selection");
    setSelectedDoctor("");
  };

  const handleSymptomSubmit = async () => {
    if (!currentInput.trim()) {
      addMessage("bot", "Please enter your symptoms so I can help assess your condition.");
      return;
    }
    
    addMessage("user", currentInput);
    setCurrentInput("");
    setLoading(true);
    
    try {
      addMessage("bot", "Thank you for sharing your symptoms. I'm analyzing them now...");
      
      // Call the triage API
      const triageRes = await fetch(`${process.env.REACT_APP_API_URL}/api/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms: currentInput }),
      });
      
      const triageData = await triageRes.json();
      setAssessmentData(triageData);
      
      // Add the assessment to the conversation
      addMessage("bot", `Based on your symptoms, I've assessed your condition as: ${triageData.severity} severity.`);
      addMessage("bot", triageData.explanation);
      
      // Decide next steps based on triage results
      if (triageData.recommendBooking) {
        addMessage("bot", "I recommend scheduling an appointment with a doctor.");
        setStage("booking");
      } else {
        addMessage("bot", "Based on my assessment, you don't need an immediate appointment. Please follow the self-care advice above and monitor your symptoms.");
        addMessage("bot", "Would you like to return to the dashboard or book an appointment anyway?");
        
        setStage("assessment");
      }
    } catch (error) {
      console.error("Error processing triage:", error);
      addMessage("bot", "I'm sorry, I had trouble processing your symptoms. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelection = (date) => {
    setSelectedDate(date);
    addMessage("user", `I'd like to book on ${formatDate(date)}`);
  };

  const handleTimeSelection = (time) => {
    setSelectedTime(time);
    addMessage("user", `I'd like the ${time} slot`);
    
    // Confirm the selection
    addMessage("bot", `You've selected ${time} on ${formatDate(selectedDate)}. Would you like to confirm this appointment?`);
  };

  const confirmBooking = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) {
      addMessage("bot", "Please select a date and time for your appointment first.");
      return;
    }
    
    setLoading(true);
    
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/appointments/book-appointment`,
        {
          doctorId: selectedDoctor,
          date: selectedDate,
          time: selectedTime,
          patientId: localStorage.getItem("userId"),
          symptoms: assessmentData ? JSON.stringify(assessmentData) : "No assessment data"
        }
      );
      
      addMessage("bot", "Your appointment has been confirmed! 🎉");
      addMessage("bot", `Appointment details:
- Doctor: ${getDoctorName(selectedDoctor)}
- Date: ${formatDate(selectedDate)}
- Time: ${selectedTime}`);
      
      addMessage("bot", "You'll receive a confirmation email shortly. Would you like to return to your dashboard?");
      
      setStage("confirmation");
    } catch (err) {
      console.error("Error booking appointment:", err);
      addMessage("bot", "I'm sorry, there was a problem booking your appointment. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (loading) return;
    
    switch (stage) {
      case "doctor-selection":
        handleDoctorSelection();
        break;
      case "symptom-input":
        handleSymptomSubmit();
        break;
      case "assessment":
        // User decided to book anyway or go back to dashboard
        if (currentInput.toLowerCase().includes("book") || 
            currentInput.toLowerCase().includes("appoint") ||
            currentInput.toLowerCase().includes("yes")) {
          addMessage("user", currentInput);
          addMessage("bot", "Alright, let's book an appointment for you.");
          setCurrentInput("");
          setStage("booking");
        } else if (currentInput.toLowerCase().includes("dashboard") ||
                  currentInput.toLowerCase().includes("back") ||
                  currentInput.toLowerCase().includes("no")) {
          addMessage("user", currentInput);
          addMessage("bot", "I'll take you back to the dashboard.");
          setCurrentInput("");
          setTimeout(() => navigate('/dashboard'), 1500);
        } else {
          addMessage("bot", "I didn't understand that. Would you like to book an appointment or return to the dashboard?");
        }
        break;
      case "confirmation":
        // User confirmed they want to go to dashboard
        if (currentInput.toLowerCase().includes("yes") ||
            currentInput.toLowerCase().includes("dashboard") ||
            currentInput.toLowerCase().includes("ok")) {
          addMessage("user", currentInput);
          addMessage("bot", "Taking you to the dashboard now. Have a great day!");
          setCurrentInput("");
          setTimeout(() => navigate('/dashboard'), 1500);
        } else {
          addMessage("user", currentInput);
          addMessage("bot", "Is there anything else I can help you with?");
          setCurrentInput("");
        }
        break;
      default:
        break;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getDoctorName = (id) => {
    const doctor = doctors.find(doc => doc._id === id);
    return doctor ? doctor.name : "Selected doctor";
  };

  return (
    <div className="max-w-3xl mx-auto p-4 bg-gray-50 min-h-screen flex flex-col">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden flex-grow flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 shadow">
          <h2 className="text-xl font-semibold">Virtual Health Assistant</h2>
          <p className="text-sm opacity-80">AI-powered symptom assessment & scheduling</p>
        </div>
        
        {/* Chat container */}
        <div 
          ref={chatContainerRef}
          className="flex-grow p-4 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 240px)" }}
        >
          <div className="space-y-4">
            {conversation.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.sender === "bot" ? "justify-start" : "justify-end"}`}
              >
                <div 
                  className={`max-w-3/4 rounded-lg p-3 ${
                    msg.sender === "bot" 
                      ? "bg-gray-100 text-gray-800" 
                      : "bg-blue-500 text-white"
                  }`}
                >
                  {msg.message.split('\n').map((line, i) => (
                    <p key={i} className={i > 0 ? "mt-2" : ""}>{line}</p>
                  ))}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 rounded-lg p-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Interactive elements based on stage */}
        <div className="p-4 border-t">
          {stage === "doctor-selection" && (
            <div className="mb-4">
              <select
                className="w-full p-3 border rounded-md focus:ring focus:ring-blue-300"
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                required
              >
                <option value="">Select Doctor</option>
                {doctors.map(doctor => (
                  <option key={doctor._id} value={doctor._id}>{doctor.name}</option>
                ))}
              </select>
              <button
                onClick={handleDoctorSelection}
                className="mt-2 w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition"
              >
                Continue
              </button>
            </div>
          )}
          
          {stage === "booking" && availableDates.length === 0 && (
            <div className="mb-4">
              <p className="text-center text-gray-600 mb-3">
                This doctor doesn't have any available appointments in the next two weeks.
              </p>
              <button
                onClick={handleChangeDoctor}
                className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition"
              >
                Select a Different Doctor
              </button>
            </div>
          )}
          
          {stage === "booking" && availableDates.length > 0 && !selectedDate && (
            <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {availableDates.map(date => (
                <button
                  key={date}
                  onClick={() => handleDateSelection(date)}
                  className="p-2 border rounded-md hover:bg-blue-50 text-sm"
                >
                  {formatDate(date).split(',')[0]}
                  <br />
                  {date.split('-')[2]}/{date.split('-')[1]}
                </button>
              ))}
            </div>
          )}
          
          {stage === "booking" && selectedDate && !selectedTime && (
            <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {timeSlots.length > 0 ? (
                timeSlots.map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => handleTimeSelection(slot)}
                    className="p-2 border rounded-md hover:bg-blue-50"
                  >
                    {slot}
                  </button>
                ))
              ) : (
                <p className="col-span-full text-center text-gray-500">
                  No available slots for this date
                </p>
              )}
            </div>
          )}
          
          {stage === "booking" && selectedDate && selectedTime && (
            <div className="mb-4">
              <button
                onClick={confirmBooking}
                className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition"
                disabled={loading}
              >
                {loading ? "Booking..." : "Confirm Appointment"}
              </button>
              <button
                onClick={() => {
                  setSelectedTime("");
                  addMessage("bot", "Let's select a different time.");
                }}
                className="mt-2 w-full bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300 transition"
                disabled={loading}
              >
                Change Time
              </button>
            </div>
          )}
          
          {/* Input field for text entry - always shown except during loading */}
          {((stage === "symptom-input" || stage === "assessment" || stage === "confirmation") || 
           (stage === "booking" && selectedTime)) && (
            <div className="flex mt-2">
              <input
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  stage === "symptom-input" 
                    ? "Describe your symptoms here..." 
                    : "Type your response..."
                }
                className="flex-grow p-3 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                disabled={loading}
              />
              <button
                onClick={handleSubmit}
                className="bg-blue-500 text-white py-2 px-4 rounded-r-md hover:bg-blue-600 transition"
                disabled={loading || !currentInput.trim()}
              >
                Send
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TriageAssessment;