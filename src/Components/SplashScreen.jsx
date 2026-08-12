// src/components/SplashScreen.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function SplashScreen() {
  const [showSecondImage, setShowSecondImage] = useState(false);
  const [splashComplete, setSplashComplete] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const firstTimer = setTimeout(() => {
      setShowSecondImage(true);
    }, 2000); // after 2s show second image

    const secondTimer = setTimeout(() => {
      setSplashComplete(true);
    }, 4000); // after 4s total, move to app

    return () => {
      clearTimeout(firstTimer);
      clearTimeout(secondTimer);
    };
  }, []);

  useEffect(() => {
    if (splashComplete) {
      navigate("/home"); // Navigate to HomePage
    }
  }, [splashComplete, navigate]);

  return (
    <div className="flex px-16 justify-center items-center h-screen w-screen bg-white relative overflow-hidden">
      {/* First Image */}
      <img
        src="https://res.cloudinary.com/domlob3pr/image/upload/v1786492531/ticketmasterf_g7pmva.png"
        alt="First Splash"
        className={`w-full h-80 object-contain transition-opacity duration-1000 ${
          showSecondImage ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* Second Image */}
      <img
        src="https://res.cloudinary.com/domlob3pr/image/upload/v1786492531/ticks_amwqro.png"
        alt="Second Splash"
        className={`w-36 h-36 object-contain transition-opacity duration-1000 absolute ${
          showSecondImage ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}

export default SplashScreen;