import { Route, Routes } from "react-router-dom";
import Account from "../Pages/Account";
import ForYou from "../Pages/ForYou";
import Home from "../Pages/HomePage";
import Login from "../Pages/Login";
import MyEvents from "../Pages/MyEvents";
import Test from "../Pages/Test";
import TicketConfirm from "../Pages/Ticketconfirm";
import SplashScreen from "../Components/SplashScreen";
import ProtectedRoute, { MasterRoute } from "./ProtectedRoutes";
import Favorites from "../Pages/Favorites";

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Login />} />
    <Route path="/test" element={<Test />} />
    <Route path="/splash" element={<SplashScreen />} />

    <Route element={<ProtectedRoute />}>
      <Route path="/home" element={<Home />} />
      <Route path="/myevents" element={<MyEvents />} />
      <Route path="/account" element={<Account />} />
      <Route path="/foryou" element={<ForYou />} />
      <Route path="/favorites" element={<Favorites />} />

      <Route element={<MasterRoute />}>
        <Route path="/ticketconfirm" element={<TicketConfirm />} />
      </Route>
    </Route>
  </Routes>
);

export default AppRoutes;