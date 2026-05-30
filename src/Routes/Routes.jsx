import { Routes, Route } from "react-router-dom";
import Home from "../Pages/HomePage";
import Login from "../Pages/Login";
import { AuthProvider } from "../Context/AuthContext";
import ForYou from "../Pages/ForYou";
// import TicketmasterClone from "../Pages/ticketmasterpage";
import ProtectedRoute from "./ProtectedRoutes";
import SplashScreen from "../Components/SplashScreen";
import TicketConfirm from "../Pages/Ticketconfirm";
import Account from "../Pages/Account";
import MyEvents from "../Pages/MyEvents";
const AppRoutes = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        {/* <Route path="/ticketmaster" element={<TicketmasterClone />} /> */}
       
        <Route path="/splash" element={<SplashScreen />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<Home />} />
          <Route path="/myevents" element={<MyEvents />} />
           <Route path="/account" element={<Account />} />
          <Route path="/ticketconfirm" element={<TicketConfirm />} />
          <Route path="/foryou" element={<ForYou />} />
        </Route>

      </Routes>
    </AuthProvider>
  );
};

export default AppRoutes;
