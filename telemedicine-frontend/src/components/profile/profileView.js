import React from 'react';

const ProfileView = ({ userProfile }) => {
  return (
    <div className="bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Profile Information</h2>
      {userProfile ? (
        <div>
          <p>
            <span className="font-semibold">Name:</span> {userProfile.name}
          </p>
          <p>
            <span className="font-semibold">Email:</span> {userProfile.email}
          </p>
          <p>
            <span className="font-semibold">Role:</span> {userProfile.role}
          </p>
          {userProfile.role === "doctor" && userProfile.doctorId && (
            <p>
              <span className="font-semibold">Doctor ID:</span> {userProfile.doctorId}
            </p>
          )}
        </div>
      ) : (
        <p>No profile data available.</p>
      )}
    </div>
  );
};

export default ProfileView;
