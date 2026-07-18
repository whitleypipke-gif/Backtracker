import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  clearTickets,
  setTickets,
  setTicketsError,
} from "../redux/ticketSlice";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import CountryFlag from "react-country-flag";
import { useAuth } from "../Context/AuthContext";
import TicketModal from "../Components/TicketModal";
import { toast } from "react-hot-toast";
import { db } from "../firebase.config";

const DEFAULT_COUNTRY = {
  isoCode: "US",
  name: "United States",
};

const normalizeCountry = (country) => {
  if (typeof country === "string") {
    return {
      isoCode: country.toUpperCase(),
      name: country,
    };
  }

  return {
    isoCode: country?.isoCode || country?.code || DEFAULT_COUNTRY.isoCode,
    name: country?.name || DEFAULT_COUNTRY.name,
  };
};

const getTicketName = (ticket) =>
  ticket.ticketName ||
  ticket.ticketname ||
  ticket.ticket_name ||
  ticket.title ||
  ticket.name ||
  "Ticket";

const isPendingTicket = (ticket) =>
  String(ticket.status ?? "").toLowerCase() === "pending";

const toSearchText = (value) => String(value ?? "").toLowerCase();

const MyEvents = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const tickets = useSelector((state) => state.tickets.tickets);
  const {
    userData,
    isMaster: isMasterUser,
    status: userStatus,
  } = useSelector((state) => state.user);
  const userProfileLoaded =
    userStatus === "succeeded" || userStatus === "failed";

  // We'll treat all visible tickets as upcoming.
  const upcomingTickets = tickets.filter((ticket) => !ticket.hide);
  const pastTickets = [];

  const [searchParams] = useSearchParams();

  const action = searchParams.get("action");

  const transferId = searchParams.get("transferId");

  const acceptingTransfer = action === "accept-transfer" && Boolean(transferId);

  // Manage active tab locally
  const [activeTab, setActiveTab] = useState("upcoming");

  // Country state (for header flag)
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketSearch, setTicketSearch] = useState("");
  const processedTransfersRef = useRef(new Set());

  // useEffect(() => {
  //   if (accepting === "true" && transferId) {
  //     // show transfer acceptance UI
  //   }
  // }, [accepting, transferId]);

  useEffect(() => {
    const handlePopState = (event) => {
      console.log("POPSTATE:", event.state);
      const state = event.state;

      // Still inside TicketModal
      if (state?.ticketModal === true) {
        return;
      }

      // Actually left TicketModal
      setShowModal(false);
      setSelectedTicket(null);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      console.log(window.history.state);
    };
  }, []);

  const [helpTapCount, setHelpTapCount] = useState(0);
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState([]);

  const handleHelpTap = () => {
    if (!isMasterUser) return;

    const nextCount = helpTapCount + 1;

    if (nextCount >= 2) {
      setShowDevMenu(true);
      setHelpTapCount(0);
      return;
    }

    setHelpTapCount(nextCount);

    setTimeout(() => {
      setHelpTapCount(0);
    }, 1500);
  };

  const toggleTicketSelection = (ticketId) => {
    setSelectedTickets((prev) =>
      prev.includes(ticketId)
        ? prev.filter((id) => id !== ticketId)
        : [...prev, ticketId],
    );
  };

  // const hideSelectedTickets = async () => {
  //   try {
  //     const selectedTicketObjects = tickets.filter((ticket) =>
  //       selectedTickets.includes(ticket.id),
  //     );

  //     await Promise.all(
  //       selectedTicketObjects.map((ticket) =>
  //         updateDoc(doc(db, "tickets", ticket.id), {
  //           hide: !ticket.hide,
  //         }),
  //       ),
  //     );

  //     toast.success(`${selectedTickets.length} ticket(s) hidden`);

  //     setSelectedTickets([]);
  //   } catch (err) {
  //     console.error(err);
  //     toast.error("Failed to hide tickets");
  //   }
  // };

  const deleteSelectedTickets = async () => {
    const confirmed = window.confirm(
      `Delete ${selectedTickets.length} ticket(s)?`,
    );

    if (!confirmed) return;

    try {
      await Promise.all(
        selectedTickets.map((ticketId) =>
          deleteDoc(doc(db, "tickets", ticketId)),
        ),
      );

      toast.success(`${selectedTickets.length} ticket(s) deleted`);

      setSelectedTickets([]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete tickets");
    }
  };

  useEffect(() => {
    setSelectedCountry(
      userData?.country ? normalizeCountry(userData.country) : DEFAULT_COUNTRY,
    );
  }, [userData?.country]);

  useEffect(() => {
    if (!user?.uid || !userProfileLoaded) {
      dispatch(clearTickets());
      return;
    }

    const source = isMasterUser ? "master" : "user";
    const ticketsRef = isMasterUser
      ? collection(db, "tickets")
      : collection(db, "users", user.uid, "myTickets");

    const unsubscribe = onSnapshot(
      ticketsRef,
      (snapshot) => {
        const updated = snapshot.docs.map((ticketDoc) => ({
          id: ticketDoc.id,
          ...ticketDoc.data(),
        }));

        dispatch(
          setTickets({
            tickets: updated,
            source,
            ownerUid: isMasterUser ? null : user.uid,
          }),
        );
      },
      (error) => {
        console.error("Tickets listener error:", error);
        dispatch(setTicketsError(error.message));
      },
    );

    return () => unsubscribe();
  }, [dispatch, isMasterUser, user?.uid, userProfileLoaded]);

  useEffect(() => {
    if (!user?.uid || !userProfileLoaded || isMasterUser || !acceptingTransfer) {
      return;
    }

    const createMyTicketFromTransfer = async () => {
      if (processedTransfersRef.current.has(transferId)) return;
      processedTransfersRef.current.add(transferId);

      try {
        const transferRef = doc(db, "transfers", transferId);
        const transferSnap = await getDoc(transferRef);

        if (!transferSnap.exists()) {
          toast.error("Transfer not found");
          return;
        }

        const transferData = transferSnap.data();
        const { ticketId, seats } = transferData;

        if (!ticketId) {
          toast.error("Transfer is missing a ticket ID");
          return;
        }

        if (seats === undefined || seats === null) {
          toast.error("Transfer is missing seat quantity");
          return;
        }

        const ticketRef = doc(db, "tickets", ticketId);
        const ticketSnap = await getDoc(ticketRef);

        if (!ticketSnap.exists()) {
          toast.error("Ticket not found");
          return;
        }

        const userTicketRef = doc(db, "users", user.uid, "myTickets", ticketId);

        await setDoc(
          userTicketRef,
          {
            ...ticketSnap.data(),
            id: ticketId,
            originalTicketId: ticketId,
            transferId,
            quantity: seats,
            status: "pending",
            acceptedAt: serverTimestamp(),
          },
          { merge: true },
        );

        toast.success("Transferred ticket added to My Events");
      } catch (error) {
        processedTransfersRef.current.delete(transferId);
        console.error("Error creating ticket from transfer:", error);
        toast.error("Failed to add transfer ticket");
      }
    };

    createMyTicketFromTransfer();
  }, [acceptingTransfer, isMasterUser, transferId, user?.uid, userProfileLoaded]);

  // Handler for opening a ticket view.
  // When a user clicks, ask if they want to delete the ticket.
  const openModal = (ticket) => {
    setSelectedTicket(ticket);
    setShowModal(true);

    window.history.pushState(
      { ticketModal: true },
      "",
      window.location.pathname,
    );
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedTicket(null);

    if (window.history.state?.ticketModal) {
      window.history.back();
    }
  };

  const toggleTicketVisibility = async (ticket) => {
    try {
      await updateDoc(doc(db, "tickets", ticket.id), {
        hide: !ticket.hide,
      });

      toast.success(ticket.hide ? "Ticket made visible" : "Ticket hidden");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update ticket");
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const search = ticketSearch.toLowerCase();

    return [
      getTicketName(ticket),
      ticket.location,
      ticket.dateTime,
      ticket.section,
      `${ticket.quantity ?? 0} tickets`,
    ].some((value) => toSearchText(value).includes(search));
  });

  useEffect(() => {
    window.scrollTo(0, 0);

    document.documentElement.style.setProperty(
      "--safe-area-color",
      "#121212",
    );
  }, []);

  return (
    <div className="min-h-screen  bg-white text-white">
      {/* Header with flag */}
      <header className="px-4 py-6 flex items-center bg-customBlack justify-between relative">
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
          <h1 className="text-center text-sm">My Events</h1>
          <div className="w-6 h-6 flex items-center p-0.5 justify-center rounded-full overflow-hidden border border-white">
            <CountryFlag
              countryCode={selectedCountry.isoCode}
              svg
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "50%",
              }}
            />
          </div>
        </div>
        <p className="ml-auto text-sm cursor-pointer" onClick={handleHelpTap}>
          Help
        </p>
      </header>

      {/* Tab Bar */}
      <div className="flex border-b shadow-md bg-customBlue">
        <button
          className={`flex-1 py-2.5 text-xs text-center ${
            activeTab === "upcoming"
              ? "text-white border-b-4 border-white"
              : "text-gray-400"
          }`}
          onClick={() => setActiveTab("upcoming")}
        >
          UPCOMING ({upcomingTickets.length})
        </button>
        <button
          className={`flex-1 py-2 text-xs text-center ${
            activeTab === "past"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-gray-300"
          }`}
          onClick={() => setActiveTab("past")}
        >
          PAST ({pastTickets.length})
        </button>
      </div>

      {/* Content */}
      <div className="p-2">
        {activeTab === "upcoming" &&
          upcomingTickets.map((ticket) =>
            isPendingTicket(ticket) ? (
              <div
                key={ticket.id}
                className="mb-2 flex w-full items-center justify-between border border-gray-200 bg-white px-4 py-4 text-black shadow-sm"
              >
                <span className="min-w-0 truncate pr-4 font-medium">
                  {getTicketName(ticket)}
                </span>
                <span className="shrink-0 text-sm capitalize text-gray-600">
                  Pending
                </span>
              </div>
            ) : (
              <div
                key={ticket.id}
                className="mb-6 overflow-hidden rounded-sm text-black cursor-pointer"
                onClick={() => openModal(ticket)}
              >
                {/* Image + Overlay; clicking calls openModal */}
                <div className="relative h-48 cursor-pointer md:h-48">
                  <img
                    src={ticket.coverImage}
                    alt={getTicketName(ticket)}
                    className="h-48 w-full object-cover"
                  />

                  <div className="absolute bottom-0 w-full text-white">
                    <div className="w-[60%] border border-neutral-800 bg-neutral-800 px-4 pt-2 capitalize">
                      {ticket.dateTime}
                    </div>
                  </div>
                </div>
                <div className="w-full text-white">
                  <div className="w-full border border-neutral-800 bg-neutral-800 px-4 pb-1 pt-2 text-[1.5rem] font-extrabold capitalize">
                    {getTicketName(ticket)}
                  </div>
                  <div className="flex w-full items-center justify-between border border-neutral-800 bg-neutral-800 px-4 pb-4.5 text-[0.875rem] font-light capitalize">
                    {ticket.location}
                    <div className="flex items-center justify-items-end text-lg font-bold">
                      <svg
                        className="-rotate-3"
                        width="20"
                        height="20"
                        viewBox="0 0 94 97"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M71.1992 0.19043L71.8721 0.101562L73.8232 14.8789L91.0635 18.374L93.4355 18.792L83.0381 77.7549L83.0781 77.832L62.2559 96.1748L62.2051 96.4111L28.0674 89.0068L28.0693 88.9932L15.2627 91.252L14.2773 91.4258L0.472656 13.1328L0.423828 13.1406L0 10.1709L71.1729 0L71.1992 0.19043ZM79.7256 59.5645L79.7402 59.5742L79.7295 59.5898L79.7559 59.7881L79.583 59.8105L64.5029 82.5693L35.8438 87.6221L61.2627 93.1357L80.2256 76.4307L89.9629 21.2119L74.2393 18.0244L79.7256 59.5645ZM3.44336 12.709L16.7109 87.9492L62.7129 79.8379L76.6074 58.8701L69.2676 3.30273L3.44336 12.709ZM62.4355 71.791L21.3359 78.1836L20.1064 70.2793L61.2061 63.8857L62.4355 70.791ZM62.7764 12.833L62.8525 12.8223L63.6006 18L64.0869 21.0439L64.042 21.0508L67.085 42.0889L67.1006 42.0869L68.6758 51.9619L18.8184 59.9121L17.7041 52.9287L17.6846 52.9316L17.4854 51.5576L17.2432 50.0361L17.2646 50.0322L14.1514 28.5059L12.6543 19.1182L62.5117 11.168L62.7764 12.833ZM24.0986 27.4189L27.1416 48.457L57.209 43.6631L54.166 22.625L24.0986 27.4189ZM52.2041 38.4854L30.3857 41.9414L28.665 31.0762L50.4834 27.6211L52.2041 38.4854Z"
                          fill="white"
                        />
                      </svg>
                      <p className="ml-1">
                        <span className="text-xs">x</span>
                        {ticket.quantity}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ),
          )}

        {activeTab === "upcoming" && upcomingTickets.length === 0 && (
          <p className="text-center text-gray-500 mt-4">No upcoming events.</p>
        )}
        {activeTab === "past" && pastTickets.length === 0 && (
          <p className="text-center text-gray-500 mt-4">No past events.</p>
        )}
      </div>

      {/* Render the TicketModal */}
      <TicketModal
        isOpen={showModal}
        onClose={closeModal}
        ticket={selectedTicket}
        user={user}
        // generateTicketPDF={generateTicketPDF}
      />
      {isMasterUser && showDevMenu && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center">
          <div className="bg-white text-black w-[95%] max-w-md rounded-lg p-4 max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center mb-1">
              <h2 className="font-bold">Developer Ticket Tools</h2>

              <button
                onClick={() => setShowDevMenu(false)}
                className="font-bold"
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              placeholder="Search tickets..."
              value={ticketSearch}
              onChange={(e) => setTicketSearch(e.target.value)}
              className="w-full mb-3 border rounded px-3 py-2 text-[1rem]"
            />
            <div className="space-y-1 overflow-y-auto max-h-[50vh] border rounded p-2 mb-3">
              {filteredTickets.map((ticket) => (
                <label
                  key={ticket.id}
                  className="flex items-center gap-2 text-xs p-2 border-b"
                >
                  {/* Delete Selection */}
                  <input
                    type="checkbox"
                    checked={selectedTickets.includes(ticket.id)}
                    onChange={() => toggleTicketSelection(ticket.id)}
                  />

                  {/* Ticket Info */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="truncate font-medium">
                      {getTicketName(ticket)}
                    </span>

                    <span className="text-[0.6875rem] text-gray-500 truncate">
                      {ticket.dateTime} • {ticket.quantity} tickets •{" "}
                      {ticket.section || "GA"}
                    </span>
                  </div>

                  {/* Visibility Toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleTicketVisibility(ticket);
                    }}
                    className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                      ticket.hide ? "bg-red-300" : "bg-green-500"
                    }`}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
                        ticket.hide ? "translate-x-0" : "translate-x-5"
                      }`}
                    />
                  </button>
                </label>
                // <label
                //   key={ticket.id}
                //   className="flex items-center gap-2 text-xs p-1 border-b"
                // >
                //   <input
                //     type="checkbox"
                //     checked={selectedTickets.includes(ticket.id)}
                //     onChange={() => toggleTicketSelection(ticket.id)}
                //   />
                //   <div className="flex flex-col">
                //     <span className="truncate">{ticket.title}</span>
                //     <span>
                //       {ticket.dateTime} -- "{ticket.quantity} tickets" --{" "}
                //       {ticket.location}
                //     </span>
                //   </div>

                //   <span
                //     className={`text-[0.625rem] px-2 py-0.5 rounded ${
                //       ticket.hide
                //         ? "bg-red-100 text-red-700"
                //         : "bg-green-100 text-green-700"
                //     }`}
                //   >
                //     {ticket.hide ? "Hidden" : "Visible"}
                //   </span>
                // </label>
              ))}
            </div>

            <div className="flex items-center justify-center">
              {/* <button
                disabled={!selectedTickets.length}
                onClick={hideSelectedTickets}
                className="flex-1 bg-yellow-500 text-white rounded py-2 text-sm"
              >
                Switch visibility
              </button> */}

              <button
                disabled={!selectedTickets.length}
                onClick={deleteSelectedTickets}
                className="flex-1 bg-red-600 text-white rounded py-2 text-sm"
              >
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyEvents;