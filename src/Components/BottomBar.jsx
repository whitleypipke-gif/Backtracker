import { cloneElement } from "react";
import { IoSearchOutline, IoHeartSharp, IoTicket } from "react-icons/io5";
import { FaMoneyBillWave } from "react-icons/fa";
import { FaCircleUser } from "react-icons/fa6";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

const LayeredIcon = ({ icon, offsetX = 3, offsetY = -2, rotation = -10 }) => (
  <span
    aria-hidden="true"
    className="relative inline-flex h-6 w-7 items-center justify-center"
  >
    <span
      className="absolute left-1/2 top-1/2 opacity-45"
      style={{
        transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) rotate(${rotation}deg)`,
      }}
    >
      {cloneElement(icon)}
    </span>

    <span className="relative z-10 inline-flex">{cloneElement(icon)}</span>
  </span>
);

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Read the normalized role directly from userSlice.
  const { isMaster, status } = useSelector((state) => state.user);

  const userProfileLoaded = status === "succeeded" || status === "failed";

  const tabs = [
    {
      id: "discover",
      label: "Discover",
      icon: <IoSearchOutline size={22} />,
      path: "/home",
    },
    {
      id: "foryou",
      label: "Favorites",
      icon: <IoHeartSharp size={22} />,
      path: isMaster ? "/foryou" : "/favorites",
      layeredIcon: {
        offsetX: 5,
        offsetY: -2,
        rotation: 0,
      },
    },
    {
      id: "myevents",
      label: "My Tickets",
      icon: <IoTicket size={22} />,
      path: "/myevents",
      layeredIcon: {
        offsetX: 4,
        offsetY: -2,
        rotation: 12,
      },
    },
    {
      id: "sell",
      label: "Sell",
      icon: <FaMoneyBillWave size={22} />,
      path: "/ticketconfirm",
      masterOnly: true,
      layeredIcon: {
        offsetX: 4,
        offsetY: -2,
        rotation: -8,
      },
    },
    {
      id: "account",
      label: "My Account",
      icon: <FaCircleUser size={22} />,
      path: "/account",
    },
  ];

  const tabsToRender = tabs.filter(
    (tab) => !tab.masterOnly || (userProfileLoaded && isMaster),
  );

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed bottom-0 left-0 z-40 flex w-full justify-around border-t border-gray-200 bg-white pb-7 pt-3"
    >
      {tabsToRender.map((tab) => {
        const isActive =
          location.pathname === tab.path ||
          location.pathname.startsWith(`${tab.path}/`);

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => navigate(tab.path)}
            aria-current={isActive ? "page" : undefined}
            className={`flex flex-col items-center text-sm transition-all ${
              isActive ? "text-customBlue" : "text-customGray"
            }`}
          >
            {tab.layeredIcon ? (
              <LayeredIcon icon={tab.icon} {...tab.layeredIcon} />
            ) : (
              tab.icon
            )}
            <span className="mt-1 text-xxs font-medium">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;