import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SymptomChecker = () => {
    const [symptoms, setSymptoms] = useState([]);
    const [allSymptoms, setAllSymptoms] = useState([]);
    const [searchText, setSearchText] = useState("");
    const [filteredSymptoms, setFilteredSymptoms] = useState([]);
    const [prediction, setPrediction] = useState("");
    const [description, setDescription] = useState("");
    const [precautions, setPrecautions] = useState([]);
    const [error, setError] = useState("");

    const MAX_SYMPTOMS = 16; // Limit for maximum symptoms

    // Fetch all symptoms from the backend on component mount
    useEffect(() => {
        const fetchSymptoms = async () => {
            try {
                // const response = await axios.get("http://api:5001/symptoms");
                const response = await axios.get(`${process.env.REACT_APP_PY_API_URL}/symptoms`);
                setAllSymptoms(response.data.symptoms);
                setFilteredSymptoms(response.data.symptoms);
            } catch (err) {
                console.error("Failed to fetch symptoms:", err);
            }
        };
        fetchSymptoms();
    }, []);

    const handleSearchChange = (event) => {
        const value = event.target.value;
        setSearchText(value);

        // Filter symptoms dynamically as the user types
        const filtered = allSymptoms.filter(symptom =>
            symptom.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredSymptoms(filtered);
    };

    const handleSymptomSelect = (symptom) => {
        if (symptoms.length >= MAX_SYMPTOMS) {
            setError(`You cannot select more than ${MAX_SYMPTOMS} symptoms.`);
            return;
        }

        if (!symptoms.includes(symptom)) {
            setSymptoms([...symptoms, symptom]);
            setError("");
        }
        setSearchText(""); 
        setFilteredSymptoms(allSymptoms); 
    };

    const handleSubmit = async () => {
        if (symptoms.length === 0) {
            setError("Please select at least one symptom before submitting.");
            return;
        }

        try {
            setError("");
            // const response = await axios.get("http://api:5001/predict", {
            const response = await axios.post(`${process.env.REACT_APP_PY_API_URL}/predict`, {
                symptoms: symptoms
            });

            // Update state with prediction, description, and precautions
            setPrediction(response.data.disease);
            setDescription(response.data.description);
            setPrecautions(response.data.precautions);
        } catch (err) {
            setError("Failed to get prediction. Please try again.");
        }
    };

    const handleReset = () => {
        setSymptoms([]);
        setPrediction("");
        setDescription("");
        setPrecautions([]);
        setError("");
        setSearchText("");
        setFilteredSymptoms(allSymptoms);
    };

    return (
        <div className="p-6 bg-white shadow-lg rounded-lg max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-indigo-600 mb-4">Disease Prediction</h1>

            <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Search Symptoms:</label>
                <input
                    type="text"
                    value={searchText}
                    onChange={handleSearchChange}
                    placeholder="Type to search symptoms"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 mb-2"
                />
                {searchText && filteredSymptoms.length > 0 && (
                    <ul className="border border-gray-300 rounded-md shadow-md max-h-40 overflow-y-auto bg-white">
                        {filteredSymptoms.map((symptom, index) => (
                            <li
                                key={index}
                                className="p-2 cursor-pointer hover:bg-indigo-100"
                                onClick={() => handleSymptomSelect(symptom)}
                            >
                                {symptom}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Selected Symptoms:</h3>
                {symptoms.length > 0 ? (
                    <ul className="list-disc pl-6 text-gray-700">
                        {symptoms.map((symptom, index) => (
                            <li key={index}>{symptom}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">No symptoms selected.</p>
                )}
            </div>

            <div className="flex space-x-4">
                <button
                    onClick={handleSubmit}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    Predict Disease
                </button>
                <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                    Reset
                </button>
            </div>

            {prediction && (
                <div className="mt-6 p-4 bg-blue-50 rounded-md">
                    <h3 className="text-lg font-semibold text-blue-600">Predicted Disease:</h3>
                    <p className="text-gray-700 mb-2">{prediction}</p>
                    <h3 className="text-lg font-semibold text-blue-600">Description:</h3>
                    <p className="text-gray-700 mb-2">{description}</p>
                    <h3 className="text-lg font-semibold text-blue-600">Precautions:</h3>
                    <ul className="list-disc pl-6 text-gray-700">
                        {precautions.map((precaution, index) => (
                            <li key={index}>{precaution}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Error Message */}
            {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
    );
};

export default SymptomChecker;
