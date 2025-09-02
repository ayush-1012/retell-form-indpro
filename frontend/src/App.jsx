import React, { useState } from 'react';
import axios from 'axios';

// Helper function for phone number validation
const validatePhoneNumber = (phone) => {
  const phoneRegex = /^[0-9]{10}$/; // Assuming 10-digit phone numbers
  return phoneRegex.test(phone);
};

// Helper function for email validation
const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

//axios configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api", // Use environment variable
  timeout: 10000, // optional: 10 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
});

const ContactForm = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gmail, setGmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
  e.preventDefault();

  // Reset error and message
  setError('');
  setMessage('');

  // Form validation
  if (!name.trim()) {
    setError('Name is required');
    return;
  }

  if (!validatePhoneNumber(phone)) {
    setError('Please enter a valid 10-digit phone number');
    return;
  }

  if (!validateEmail(gmail)) {
    setError('Please enter a valid email address');
    return;
  }

  try {
    const res = await api.post("/initiate-call", {
      name,
      phone,
      email: gmail
    }
  );


    if (res.status === 200) {
      setIsSubmitted(true);
      setMessage("Form submitted successfully!");
      // alert(`Call initiated! Call ID: ${res.data.callId || "N/A"}`);
    } else {
      setError(res.data.error || "Something went wrong.");
    }
  } catch (err) {
    console.error("Request failed:", err);
    setError("Network error. Please try again.");
  }
};


  return (
    <div style={{ width: '300px', margin: '0 auto', padding: '20px' }}>
      <h2>Contact Form</h2>
      {!isSubmitted ? (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '10px' }}>
            <label htmlFor="name" style={{ display: 'block' }}>Name:</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', marginBottom: '5px' }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label htmlFor="phone" style={{ display: 'block' }}>Phone Number:</label>
            <input
              type="text"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', marginBottom: '5px' }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label htmlFor="gmail" style={{ display: 'block' }}>Gmail:</label>
            <input
              type="email"
              id="gmail"
              value={gmail}
              onChange={(e) => setGmail(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', marginBottom: '5px' }}
            />
          </div>

          {error && <p style={{ color: 'red', fontSize: '14px' }}>{error}</p>}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            Submit
          </button>
        </form>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <p>{message}</p>
          <button
            onClick={() => setIsSubmitted(false)}
            style={{
              padding: '10px',
              backgroundColor: '#FF5733',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            Submit Another Form
          </button>
        </div>
      )}
    </div>
  );
};

export default ContactForm;
