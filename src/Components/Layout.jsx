import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { clearTickets } from "../redux/ticketSlice";
import { clearUser, fetchUser } from "../redux/userSlice";
import BottomNav from "./BottomBar";
import SplashScreen from "./SplashScreen";

const SPLASH_KEY = "lastSplashTimestamp";
const TEN_MINUTES = 10 * 60 * 1000;

const Layout = ({ children }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const resumeTimerRef = useRef(null);

  const hideSplash = useCallback(() => {
    setShowSplash(false);
    localStorage.setItem(SPLASH_KEY, String(Date.now()));
  }, []);

  // AuthContext owns the login session. Layout uses that session to load the
  // corresponding Firestore profile into userSlice once for the whole app.
  useEffect(() => {
    if (authLoading) return;

    // Prevent tickets from a previous account flashing while a new profile is
    // being resolved.
    dispatch(clearTickets());

    if (user?.uid) {
      dispatch(fetchUser(user.uid));
    } else {
      dispatch(clearUser());
    }
  }, [authLoading, dispatch, user?.uid]);

  useEffect(() => {
    const initTimer = window.setTimeout(hideSplash, 4000);

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;

      const lastSplash = Number.parseInt(
        localStorage.getItem(SPLASH_KEY) || "0",
        10,
      );

      if (Date.now() - lastSplash <= TEN_MINUTES) return;

      setShowSplash(true);
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = window.setTimeout(hideSplash, 2000);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearTimeout(initTimer);
      window.clearTimeout(resumeTimerRef.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [hideSplash]);

  const hideBottomNavOn = ["/", "/splash", "/ticketmaster", "/test"];
  const hideBottomNav = hideBottomNavOn.includes(location.pathname);

  return (
    <div className="relative flex min-h-screen flex-col">
      {showSplash ? (
        <div className="absolute inset-0 z-50">
          <SplashScreen />
        </div>
      ) : (
        <>
          <main className={`flex-grow ${hideBottomNav ? "" : "pb-16"}`}>
            {children}
          </main>
          {!hideBottomNav && <BottomNav />}
        </>
      )}
    </div>
  );
};

export default Layout;