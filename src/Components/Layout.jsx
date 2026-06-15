import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import BottomNav from "./BottomBar";
import SplashScreen from "./SplashScreen";

const SPLASH_KEY = "lastSplashTimestamp";
const TEN_MINUTES = 10 * 60 * 1000;

const Layout = ({ children }) => {
  const location = useLocation();
  const [showSplash, setShowSplash] = useState(true);

  // hide splash and record the time
  const hideSplash = () => {
    setShowSplash(false);
    localStorage.setItem(SPLASH_KEY, Date.now());
  };

  useEffect(() => {
    // 1) Initial splash on first load, hide after 4s
    const initTimer = setTimeout(hideSplash, 4000);

    // 2) When tab/app becomes visible again:
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const last = parseInt(localStorage.getItem(SPLASH_KEY) || "0", 10);
        if (Date.now() - last > TEN_MINUTES) {
          // show again for 2s, then hide (no reload)
          setShowSplash(true);
          setTimeout(hideSplash, 2000);
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearTimeout(initTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  // don't pad or show bottom nav on these routes
  const hideBottomNavOn = ["/", "/splash", "/ticketmaster", "/test"];
  const addPadding = !hideBottomNavOn.includes(location.pathname);

  return (
    <div className="relative min-h-screen flex flex-col">
      {showSplash ? (
        <div className="absolute inset-0 z-50">
          <SplashScreen />
        </div>
      ) : (
        <>
          <main className={`flex-grow ${addPadding ? "pb-16" : ""}`}>
            {children}
          </main>
          {!hideBottomNavOn.includes(location.pathname) && <BottomNav />}
        </>
      )}
    </div>
  );
};

export default Layout;
