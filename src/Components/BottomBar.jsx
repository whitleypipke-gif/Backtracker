import { IoSearchOutline, IoHeartSharp, IoTicket } from "react-icons/io5";
import { FaMoneyBillWave } from "react-icons/fa";
import { FaCircleUser } from "react-icons/fa6";
import { useNavigate, useLocation } from "react-router-dom"; // ✅ Import useLocation

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation(); // ✅ Get current location

  const tabs = [
    {
      id: "discover",
      label: "Discover",
      icon: <IoSearchOutline size={22} />,
      path: "/home",
    },
    {
      id: "foryou",
      label: "For You",
      icon: <IoHeartSharp size={22} />,
      path: "/foryou",
    },
    {
      id: "myevents",
      label: "My Events",
      icon: <IoTicket size={22} />,
      path: "/myevents",
    },
    {
      id: "sell",
      label: "Sell",
      icon: <FaMoneyBillWave size={22} />,
      path: "/ticketconfirm",
    },
    {
      id: "account",
      label: "My Account",
      icon: <FaCircleUser size={22} />,
      path: "/account",
    },
  ];

  return (
    <div className="fixed z-40 bottom-0 left-0 w-full bg-white text-white py-3 border-t border-gray-200 flex justify-around">
      {tabs.map((tab) => {
        // ✅ Determine active tab by checking if current path matches tab.path
        const isActive = location.pathname === tab.path;

        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center text-sm transition-all ${
              isActive ? "text-customBlue" : "text-customGray"
            }`}
          >
            {tab.icon}
            <span className="mt-1 font-medium text-xxs">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default BottomNav;
