import React, { useState, useEffect } from "react";
import axios from "axios";

const AppointmentBooking = () => {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [date, setDate] = useState("");
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [loading, setLoading] = useState(false);
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
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/users/doctors`
        );

        if (response.data.length === 0) {
          setErrors((prev) => ({ ...prev, doctors: "No doctors available" }));
          return;
        }

        setDoctors(response.data);
        setErrors((prev) => ({ ...prev, doctors: "" }));
      } catch (err) {
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
        setLoading(true);
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/appointments/availability/${selectedDoctor}?date=${date}`
        );

        const { availableSlots, bookedSlots } = response.data;

        if (availableSlots.length === 0) {
          setErrors((prev) => ({
            ...prev,
            slots:
              "No available slots for this date. Please choose another date.",
          }));
          setTimeSlots([]);
          return;
        }

        // Disable booked slots
        const updatedSlots = availableSlots.map((slot) => ({
          time: slot,
          disabled: bookedSlots.includes(slot), // Disable if booked
        }));

        setTimeSlots(updatedSlots);
        setErrors((prev) => ({ ...prev, slots: "" }));
      } catch (err) {
        setErrors((prev) => ({
          ...prev,
          slots: "Failed to load available time slots.",
        }));
        setTimeSlots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [selectedDoctor, date]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors((prev) => ({ ...prev, booking: "" }));

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
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/appointments/book-appointment`,
        {
          doctorId: selectedDoctor,
          date,
          time: selectedTime,
          patientId: localStorage.getItem("userId"),
        }
      );

      // Reset form on success
      setSelectedDoctor("");
      setDate("");
      setSelectedTime("");
      setTimeSlots([]);
      alert("Appointment booked successfully!");
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Error booking appointment. Please try again.";

      setErrors((prev) => ({
        ...prev,
        booking: errorMessage,
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Book Appointment</h2>

      {/* Error Messages */}
      {errors.doctors && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
          {errors.doctors}
        </div>
      )}

      {errors.booking && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
          {errors.booking}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Doctor Selection */}
        <div>
          <label className="block mb-1">Select Doctor</label>
          <select
            value={selectedDoctor}
            onChange={(e) => {
              setSelectedDoctor(e.target.value);
              setErrors((prev) => ({ ...prev, form: "" }));
            }}
            className="w-full p-2 border rounded"
            disabled={loading || doctors.length === 0}
          >
            <option value="">Select Doctor</option>
            {doctors.map((doctor) => (
              <option key={doctor._id} value={doctor._id}>
                {doctor.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Selection */}
        <div>
          <label className="block mb-1">Select Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setErrors((prev) => ({ ...prev, form: "" }));
            }}
            className="w-full p-2 border rounded"
            min={new Date().toISOString().split("T")[0]}
            disabled={loading || !selectedDoctor}
          />
        </div>

        {/* Time Slot Selection */}
        <div>
          <label className="block mb-1">Select Time Slot</label>
          <select
            value={selectedTime}
            onChange={(e) => {
              setSelectedTime(e.target.value);
              setErrors((prev) => ({ ...prev, form: "" }));
            }}
            className="w-full p-2 border rounded"
            disabled={loading || timeSlots.length === 0 || !date}
          >
            <option value="">
              {timeSlots.length ? "Select Time" : "No slots available"}
            </option>
            {timeSlots.map((slot, index) => (
              <option key={index} value={slot.time} disabled={slot.disabled}>
                {slot.time} {slot.disabled ? "(Booked)" : ""}
              </option>
            ))}
          </select>
          {errors.slots && (
            <p className="text-red-500 text-sm mt-1">{errors.slots}</p>
          )}
        </div>

        {/* Form Error */}
        {errors.form && <p className="text-red-500 text-sm">{errors.form}</p>}

        {/* Loading State */}
        {loading && (
          <div className="text-center text-blue-500">Processing...</div>
        )}

        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? "Booking..." : "Book Appointment"}
        </button>
      </form>
    </div>
  );
};

export default AppointmentBooking;
