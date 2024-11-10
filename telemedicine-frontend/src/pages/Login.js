import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Clear any previous errors
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/login`, { email, password });
      
      // Handle successful login (you might want to save user data or token here)
      console.log("Login successful:", response.data);
      
      // Redirect to dashboard or desired page after successful login
      navigate('/dashboard');
    } catch (err) {
      // Check for specific error messages and set an appropriate error state
      if (err.response && err.response.status === 400) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError('An error occurred during login. Please try again later.');
      }
      console.error("Login error:", err.response ? err.response.data : err.message);
    }
  };

  return (
    <div>
      <h2>Login</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button type="submit">Login</button>
      </form>
      <p>Don’t have an account? <a href="/signup">Sign up here</a></p>
    </div>
  );
};

export default Login;
