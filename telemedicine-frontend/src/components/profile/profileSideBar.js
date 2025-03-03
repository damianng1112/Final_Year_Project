import React from "react";
import { useNavigate } from "react-router-dom";

const ProfileSidebar = ({ selectedMenu, setSelectedMenu, role }) => {
  const navigate = useNavigate();
  const baseButtonClasses = "w-full text-left p-2 rounded hover:bg-blue-100";

  const handleLogout = () => {
    navigate("/logout");
  }

  return (
    <div>
      <ul className="space-y-2">
        <li>
          <button
            onClick={() => setSelectedMenu("view")}
            className={`${baseButtonClasses} ${selectedMenu === "view" && "bg-blue-500 text-white"}`}
          >
            View Profile
          </button>
        </li>
        <li>
          <button
            onClick={() => setSelectedMenu("update")}
            className={`${baseButtonClasses} ${selectedMenu === "update" && "bg-blue-500 text-white"}`}
          >
            Update Profile
          </button>
        </li>
        <li>
          <button
            onClick={() => setSelectedMenu("delete")}
            className={`${baseButtonClasses} ${selectedMenu === "delete" && "bg-blue-500 text-white"}`}
          >
            Delete Account
          </button>
        </li>
        {role === "doctor" && (
          <li>
            <button
              onClick={() => setSelectedMenu("setAvailability")}
              className={`${baseButtonClasses} ${selectedMenu === "setAvailability" && "bg-blue-500 text-white"}`}
            >
              Set Availability
            </button>
          </li>
        )}
        <li>
          <button
            onClick={handleLogout}
            className="w-full p-2 mt-4 text-left text-white bg-red-500 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </li>
      </ul>
    </div>
  );
};

export default ProfileSidebar;
