import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import ProfileSidebar from './profileSideBar';
import ProfileView from './profileView';
import ProfileUpdate from './profileUpdate';
import ProfileDelete from './profileDelete';
import SetAvailability from "./SetAvailability";

const ProfilePage = () => {
  const [selectedMenu, setSelectedMenu] = useState("view");
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const userId = localStorage.getItem('userId');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get(`/api/users/user/${userId}`);
        setUserProfile(response.data);
      } catch (err) {
        setError("Error fetching profile");
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchProfile();
  }, [userId]);

  const renderContent = () => {
    if (selectedMenu === "view") {
      return <ProfileView userProfile={userProfile} />;
    } else if (selectedMenu === "update") {
      return <ProfileUpdate userProfile={userProfile} setUserProfile={setUserProfile} />;
    } else if (selectedMenu === "delete") {
      return <ProfileDelete userProfile={userProfile} />;
    } else if (selectedMenu === "setAvailability") {
      return <SetAvailability userProfile={userProfile} />;
    } else {
      return <div>Select an option from the menu.</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-gray-700 text-lg">Loading...</p>
      </div>
    );
  }

  if (error || !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-100">
        <p className="text-red-500 text-lg">{error || "Profile not found"}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Left Sidebar */}
      <div className="w-1/4 p-4 border-r border-gray-200">
        <ProfileSidebar selectedMenu={selectedMenu} 
        setSelectedMenu={setSelectedMenu} 
        role={userProfile?.role} 
        />
      </div>
      {/* Main Content */}
      <div className="w-3/4 p-4">
        {loading ? (
          <div>Loading profile...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          renderContent()
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
