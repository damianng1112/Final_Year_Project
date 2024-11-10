import React from 'react';
import PropTypes from 'prop-types';

const Dashboard = ({ user }) => {
  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      {user.role === 'doctor' ? <DoctorDashboard /> : <PatientDashboard />}
    </div>
  );
};

const DoctorDashboard = () => (
  <div>
    <h2>Doctor's Dashboard</h2>
    <p>Here, you can see upcoming appointments and patient details.</p>
  </div>
);

const PatientDashboard = () => (
  <div>
    <h2>Patient's Dashboard</h2>
    <p>Here, you can book appointments and access your medical records.</p>
  </div>
);

Dashboard.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
    role: PropTypes.string.isRequired,
  }).isRequired,
};

export default Dashboard;
