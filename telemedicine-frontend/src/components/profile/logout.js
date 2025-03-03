import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear authentication details
    localStorage.removeItem("userId");
    localStorage.removeItem("token"); 

    // Redirect to login page
    navigate("/");
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <p className="text-lg text-gray-700">Logging out...</p>
    </div>
  );
};

export default Logout;
