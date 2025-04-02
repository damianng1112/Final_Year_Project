import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const TriageAssessment = () => {
  const [symptoms, setSymptoms] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bookingAvailable, setBookingAvailable] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);
    setBookingAvailable(false);

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms }),
      });
      const data = await res.json();
      setResponse(data);
      setBookingAvailable(data.recommendBooking);
    } catch (error) {
      setResponse({ error: "Failed to process request. Try again later." });
    }

    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <h2 className="text-2xl font-semibold text-center mb-4">Triage Assessment</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          className="w-full p-3 border rounded-md focus:ring focus:ring-blue-300"
          rows="4"
          placeholder="Describe your symptoms..."
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          required
        ></textarea>

        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition"
          disabled={loading}
        >
          {loading ? "Processing..." : "Assess Symptoms"}
        </button>
      </form>

      {response && (
        <div className="mt-6 p-4 border rounded-md bg-gray-100">
          <h3 className="text-lg font-medium">LLM Assessment:</h3>
          {response.error ? (
            <p className="text-red-500">{response.error}</p>
          ) : (
            <>
              <p className="mt-2">{response.explanation}</p>
              {bookingAvailable && (
                <div className="mt-4">
                  <p className="font-semibold text-gray-700">Would you like to book an appointment?</p>
                  <div className="flex gap-4 mt-2">
                    <button
                      onClick={() => navigate('/book-appointment')}
                      className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition"
                    >
                      Yes, Book Now
                    </button>
                    <button
                      onClick={() => setBookingAvailable(false)}
                      className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition"
                    >
                      No, Maybe Later
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TriageAssessment;