import React, { useState } from 'react';
import axios from 'axios';

const ProfileDelete = ({ userProfile }) => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      try {
        await axios.delete(`${process.env.REACT_APP_API_URL}/api/users/user/${userProfile._id}`);
        setMessage("Account deleted successfully.");
        setError("");
        // Optionally, log out the user or redirect after deletion.
      } catch (err) {
        setError("Failed to delete account.");
        setMessage("");
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Delete Account</h2>
      {message && <p className="text-green-600 mb-2">{message}</p>}
      {error && <p className="text-red-600 mb-2">{error}</p>}
      <p className="mb-4 text-gray-700">
        Warning: This action is irreversible. Your account and all related data will be permanently deleted.
      </p>
      <button
        onClick={handleDelete}
        className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600"
      >
        Delete Account
      </button>
    </div>
  );
};

export default ProfileDelete;
