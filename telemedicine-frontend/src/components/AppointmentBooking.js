import React, { useState, useEffect } from "react";
import api from "../utils/api";

const AppointmentBooking = () => {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [date, setDate] = useState("");
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [errors, setErrors] = useState({
    doctors: "",
    slots: "",
    form: "",
    booking: "",
  });

  // Fetch doctors with error handling
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/users/doctors`);

        if (response.data.length === 0) {
          setErrors((prev) => ({ ...prev, doctors: "No doctors available" }));
          return;
        }

        setDoctors(response.data);
        setErrors((prev) => ({ ...prev, doctors: "" }));
      } catch (err) {
        console.error("Error fetching doctors:", err);
        setErrors((prev) => ({
          ...prev,
          doctors: "Failed to load doctors. Please try again later.",
        }));
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  // Fetch available slots with error handling
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!selectedDoctor || !date) return;

      try {
        setFetchingSlots(true);
        setTimeSlots([]);
        setSelectedTime("");
        
        const response = await api.get(
          `/api/availability/${selectedDoctor}?date=${date}`
        );

        const { availableSlots, bookedSlots } = response.data;

        if (!availableSlots || availableSlots.length === 0) {
          setErrors((prev) => ({
            ...prev,
            slots:
              "No available slots for this date. Please choose another date.",
          }));
          return;
        }

        // Process slots correctly based on backend format
        const formattedSlots = availableSlots.map(slot => ({
          time: slot,
          disabled: bookedSlots.includes(slot)
        }));

        setTimeSlots(formattedSlots);
        setErrors((prev) => ({ ...prev, slots: "" }));
      } catch (err) {
        console.error("Error fetching time slots:", err);
        setErrors((prev) => ({
          ...prev,
          slots: "Failed to load available time slots.",
        }));
      } finally {
        setFetchingSlots(false);
      }
    };

    fetchAvailability();
  }, [selectedDoctor, date]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors((prev) => ({ ...prev, booking: "", form: "" }));
    setBookingSuccess(false);

    // Form validation
    if (!selectedDoctor || !date || !selectedTime) {
      setErrors((prev) => ({
        ...prev,
        form: "Please fill all required fields.",
      }));
      return;
    }

    try {
      setLoading(true);
      const userId = localStorage.getItem("userId");
      
      if (!userId) {
        setErrors((prev) => ({
          ...prev,
          booking: "You need to be logged in to book an appointment.",
        }));
        return;
      }
      
      await api.post(
        `/api/appointments/book-appointment`,
        {
          doctorId: selectedDoctor,
          date,
          time: selectedTime,
          patientId: localStorage.getItem("userId"),
        }
      );

      // Clear form and show success message
      setBookingSuccess(true);
      setSelectedDoctor("");
      setDate("");
      setSelectedTime("");
      setTimeSlots([]);
    } catch (err) {
      console.error("Error booking appointment:", err);
      const errorMessage =
        err.response?.data?.message ||
        "Error booking appointment. Please try again.";

      setErrors((prev) => ({
        ...prev,
        booking: errorMessage,
      }));
    } finally {
      setLoading(false);
    }
  };

  // Get min date for date picker (today)
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-blue-600">Book Appointment</h2>

      {/* Success Message */}
      {bookingSuccess && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Appointment booked successfully!
        </div>
      )}

      {/* Error Messages */}
      {errors.doctors && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {errors.doctors}
        </div>
      )}

      {errors.booking && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {errors.booking}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Doctor Selection */}
        <div>
          <label className="block mb-2 font-medium text-gray-700">Select Doctor</label>
          <div className="relative">
            <select
              value={selectedDoctor}
              onChange={(e) => {
                setSelectedDoctor(e.target.value);
                setErrors((prev) => ({ ...prev, form: "" }));
              }}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-500 appearance-none"
              disabled={loading || doctors.length === 0}
            >
              <option value="">Select Doctor</option>
              {doctors.map((doctor) => (
                <option key={doctor._id} value={doctor._id}>
                  {doctor.name} {doctor.specialization ? `- ${doctor.specialization}` : ''}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Date Selection */}
        <div>
          <label className="block mb-2 font-medium text-gray-700">Select Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setErrors((prev) => ({ ...prev, form: "" }));
            }}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-500"
            min={getTodayDate()}
            disabled={loading || !selectedDoctor}
          />
        </div>

        {/* Time Slot Selection */}
        <div>
          <label className="block mb-2 font-medium text-gray-700">Select Time Slot</label>
          <div className="relative">
            {fetchingSlots ? (
              <div className="w-full p-2 border rounded bg-gray-50 text-gray-400">
                Loading available slots...
              </div>
            ) : (
              <select
                value={selectedTime}
                onChange={(e) => {
                  setSelectedTime(e.target.value);
                  setErrors((prev) => ({ ...prev, form: "" }));
                }}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-500 appearance-none"
                disabled={loading || timeSlots.length === 0 || !date}
              >
                <option value="">
                  {timeSlots.length ? "Select Time" : "No slots available"}
                </option>
                {timeSlots.map((slot, index) => (
                  <option 
                    key={index} 
                    value={slot.time} 
                    disabled={slot.disabled}
                  >
                    {slot.time} {slot.disabled ? "(Booked)" : ""}
                  </option>
                ))}
              </select>
            )}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
          {errors.slots && (
            <p className="text-red-500 text-sm mt-1">{errors.slots}</p>
          )}
        </div>

        {/* Form Error */}
        {errors.form && (
          <p className="text-red-500 text-sm px-1">{errors.form}</p>
        )}

        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400 transition duration-200 flex items-center justify-center"
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Booking...
            </>
          ) : (
            "Book Appointment"
          )}
        </button>
      </form>
    </div>
  );
};

export default AppointmentBooking;