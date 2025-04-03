import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const TriageAssessment = () => {
  const [symptoms, setSymptoms] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState("input"); // input, assessment, booking-suggestion
  const [nextAvailableSlot, setNextAvailableSlot] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingError, setBookingError] = useState("");
  
  const navigate = useNavigate();

  // Fetch doctors on component mount
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/users/doctors`
        );
        setDoctors(response.data);
        
        // Auto-select first doctor
        if (response.data.length > 0) {
          setSelectedDoctor(response.data[0]._id);
        }
      } catch (err) {
        console.error("Failed to fetch doctors:", err);
      }
    };

    fetchDoctors();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);
    setStage("input");
    setBookingError("");

    try {
      // Step 1: Send symptoms for triage assessment
      const triageRes = await fetch(`${process.env.REACT_APP_API_URL}/api/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms }),
      });
      
      const triageData = await triageRes.json();
      setResponse(triageData);
      
      // Step 2: If booking is recommended, fetch next available slots
      if (triageData.recommendBooking) {
        await findNextAvailableSlot(triageData.severity);
        setStage("booking-suggestion");
      } else {
        setStage("assessment");
      }
    } catch (error) {
      setResponse({ error: "Failed to process request. Try again later." });
      setStage("assessment");
    }

    setLoading(false);
  };

  const findNextAvailableSlot = async (severity) => {
    try {
      if (!selectedDoctor) return;
      
      // Calculate date range based on severity
      const startDate = new Date();
      let endDate = new Date();
      
      if (severity === "Severe") {
        // For severe cases, look for slots today and tomorrow
        endDate.setDate(startDate.getDate() + 1);
      } else if (severity === "Moderate") {
        // For moderate cases, look for slots within next 3 days
        endDate.setDate(startDate.getDate() + 3);
      } else {
        // For mild cases, look for slots within next 7 days
        endDate.setDate(startDate.getDate() + 7);
      }
      
      // Format dates for API
      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];
      
      // Call API to get available slots in the date range
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/availability/${selectedDoctor}/range?startDate=${startDateStr}&endDate=${endDateStr}`
      );
      
      const { availableSlots } = response.data;
      
      if (availableSlots && availableSlots.length > 0) {
        // Sort slots by date and time
        const sortedSlots = availableSlots.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time}`);
          const dateB = new Date(`${b.date}T${b.time}`);
          return dateA - dateB;
        });
        
        // Pick first available slot
        setNextAvailableSlot(sortedSlots[0]);
      } else {
        // If no slots in preferred range, get next available slot
        const fallbackResponse = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/availability/${selectedDoctor}/next-available`
        );
        
        if (fallbackResponse.data.slot) {
          setNextAvailableSlot(fallbackResponse.data.slot);
        }
      }
    } catch (error) {
      console.error("Error finding next available slot:", error);
    }
  };

  const confirmBooking = async () => {
    if (!nextAvailableSlot || !selectedDoctor) return;
    
    try {
      setLoading(true);
      
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/appointments/book-appointment`,
        {
          doctorId: selectedDoctor,
          date: nextAvailableSlot.date,
          time: nextAvailableSlot.time,
          patientId: localStorage.getItem("userId"),
          symptoms: symptoms // Pass symptoms for doctor's reference
        }
      );
      
      setBookingConfirmed(true);
      setStage("confirmation");
    } catch (err) {
      setBookingError(err.response?.data?.message || "Failed to book appointment");
    } finally {
      setLoading(false);
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

  const goToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <h2 className="text-2xl font-semibold text-center mb-4">AI Symptom Assessment</h2>

      {stage === "input" && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium">Select Doctor</label>
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
          </div>
          
          <div>
            <label className="block mb-2 text-sm font-medium">Describe Your Symptoms</label>
            <textarea
              className="w-full p-3 border rounded-md focus:ring focus:ring-blue-300"
              rows="4"
              placeholder="Please describe your symptoms in detail..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              required
            ></textarea>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition"
            disabled={loading || !selectedDoctor}
          >
            {loading ? "Analyzing Symptoms..." : "Assess My Symptoms"}
          </button>
        </form>
      )}

      {/* Assessment Display */}
      {(stage === "assessment" || stage === "booking-suggestion") && response && (
        <div className="mt-6 p-4 border rounded-md bg-gray-100">
          <div className={`p-2 mb-4 rounded-md ${
            response.severity === "Severe" 
              ? "bg-red-100 text-red-800" 
              : response.severity === "Moderate"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-green-100 text-green-800"
          }`}>
            <span className="font-bold">Severity: {response.severity}</span>
          </div>
          
          <h3 className="text-lg font-medium">Assessment:</h3>
          {response.error ? (
            <p className="text-red-500">{response.error}</p>
          ) : (
            <p className="mt-2">{response.explanation}</p>
          )}
          
          {/* Only display doctor's suggestion if not showing booking options */}
          {stage === "assessment" && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <p className="text-blue-800">
                Based on your symptoms, no immediate appointment is necessary. 
                You can follow the self-care advice above. If symptoms worsen, 
                please return for another assessment.
              </p>
              <button
                onClick={goToDashboard}
                className="mt-4 w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </div>
      )}

      {/* Booking Suggestion */}
      {stage === "booking-suggestion" && nextAvailableSlot && (
        <div className="mt-6 p-4 border rounded-md bg-blue-50">
          <h3 className="text-lg font-medium text-blue-800">Recommended Appointment:</h3>
          
          <div className="mt-3 p-3 bg-white rounded-md">
            <p className="font-semibold">Based on your symptoms, our AI recommends:</p>
            <p className="mt-2">
              <span className="font-medium">Doctor:</span> {getDoctorName(selectedDoctor)}
            </p>
            <p>
              <span className="font-medium">Date:</span> {formatDate(nextAvailableSlot.date)}
            </p>
            <p>
              <span className="font-medium">Time:</span> {nextAvailableSlot.time}
            </p>
            
            {response.severity === "Severe" && (
              <p className="mt-2 text-red-600 font-medium">
                This is the earliest available appointment. Your symptoms indicate urgent attention is needed.
              </p>
            )}
            
            {bookingError && (
              <p className="mt-2 text-red-600">{bookingError}</p>
            )}
            
            <div className="flex gap-4 mt-4">
              <button
                onClick={confirmBooking}
                className="flex-1 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition"
                disabled={loading}
              >
                {loading ? "Booking..." : "Confirm Booking"}
              </button>
              <button
                onClick={() => {
                  setStage("input");
                  setSymptoms("");
                }}
                className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition"
                disabled={loading}
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Screen */}
      {stage === "confirmation" && bookingConfirmed && (
        <div className="mt-6 p-4 border rounded-md bg-green-50">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-green-800">Appointment Confirmed</h3>
            <div className="mt-3 p-3 bg-white rounded-md text-left">
              <p><span className="font-medium">Doctor:</span> {getDoctorName(selectedDoctor)}</p>
              <p><span className="font-medium">Date:</span> {formatDate(nextAvailableSlot.date)}</p>
              <p><span className="font-medium">Time:</span> {nextAvailableSlot.time}</p>
              
              <p className="mt-3 text-gray-600">
                Your appointment has been scheduled. You'll receive a confirmation email shortly.
              </p>
            </div>
            
            <button
              onClick={goToDashboard}
              className="mt-4 w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TriageAssessment;