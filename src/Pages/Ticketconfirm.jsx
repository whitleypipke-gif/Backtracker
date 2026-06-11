import React, { useState, useEffect } from "react";
import { IoTicketOutline } from "react-icons/io5";
import { FaRegCircleCheck } from "react-icons/fa6";
import { LuTickets } from "react-icons/lu";
import { db } from "../firebase.config";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "../Context/AuthContext";

const TicketConfirm = () => {
  const { user } = useAuth();
  const [ticketName, setTicketName] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchTicketName = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setTicketName(snap.data().Ticketname || "");
        }
      } catch (err) {
        console.error("Error fetching Ticketname:", err);
      }
    };
    fetchTicketName();
  }, [user]);

  return (
    <div className=" bg-white flex flex-col">
      {/* Header with blue bar + logo */}
      <div className="bg-white border-b border-gray-200 px-6  flex justify-center">
        <img src="/ticketmasterf.png" alt="ticketmaster" className="h-20" />
      </div>

      {/* Body */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 ">
        <h2 className="text-center text-2xl mt-4 font-semibold text-gray-700 mb-12">
          {ticketName && `${ticketName} `}
          Has Accepted Your Ticket  Transfer!
        </h2>

        {/* Progress Steps */}
        <div className="flex items-center w-full max-w-md justify-center">
          {/* Step 1 */}
          <div className="flex flex-col items-center">
            <div className="p-2 bg-customBlue text-white rounded-full">
              <IoTicketOutline size={14} />
            </div>
            <span className="mt-2 text-xs text-customBlue">Sent</span>
          </div>

          {/* Connector */}
          <div className="w-32 h-0.5 bg-customBlue -translate-y-3 relative">
            <div className="absolute top-0 left-0 " />
          </div>

          {/* Step 2 */}
          <div className="flex -mx-2 flex-col items-center">
            <div className="p-2  bg-customBlue text-white rounded-full">
              <FaRegCircleCheck size={14} />
            </div>
            <span className="mt-2 text-xs text-gray-400">Accepted</span>
          </div>

          {/* Connector */}
          <div className="w-32 h-0.5 bg-customBlue -translate-y-3 " />

          {/* Step 3 */}
          <div className="flex -mx-2 flex-col items-center">
            <div className="p-2  bg-customBlue text-white rounded-full">
              <LuTickets size={14} />
            </div>
            <span className="mt-2 text-xs text-gray-400">Complete</span>
          </div>
        </div>

        {/* Done Button */}
        <button className="mt-8 px-6 py-3 bg-customBlue text-white rounded-full hover:bg-blue-600">
          Done
        </button>
      </div>
    </div>
  );
};

export default TicketConfirm;
