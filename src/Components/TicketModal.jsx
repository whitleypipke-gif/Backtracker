import React, { useEffect, useRef, useState } from "react";
import Modal from "react-modal";
import { gsap } from "gsap";
import { MdInfo, MdInfoOutline, MdOutlineClose } from "react-icons/md";
import { LuDot } from "react-icons/lu";
import { IoBarcode, IoSend, IoTicket } from "react-icons/io5";
import { BsArrowBarLeft, BsInfoCircle, BsUpcScan } from "react-icons/bs";
import { GoArrowUpRight, GoChevronRight } from "react-icons/go";
import { useDispatch } from "react-redux";
import { deleteTicket } from "../redux/ticketSlice";
import MapComponent from "./Map";
import { IoTicketOutline } from "react-icons/io5";
import { PiBarcodeLight } from "react-icons/pi";
import { FaRegCircleCheck, FaRotate } from "react-icons/fa6";
import { HiDotsVertical } from "react-icons/hi";
import { LuTickets } from "react-icons/lu";
import QRCode from "qrcode";
import html2canvas from "html2canvas-pro";
import { ClipLoader } from "react-spinners";
import jsPDF from "jspdf";
// 1) Firestore addDoc import
import { db } from "../firebase.config";
import { collection, addDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { AiOutlineCheck } from "react-icons/ai";
import { TbCards } from "react-icons/tb";
import { FaArrowLeft, FaInfo, FaTicketAlt } from "react-icons/fa";
const TicketModal = ({ isOpen, onClose, ticket }) => {
  if (!ticket) return null;

  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isTransferDetailPageOpen, setIsTransferDetailPageOpen] =
    useState(false);
  const [isTransferDetailOpen, setIsTransferDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("tickets");

  // The selected seats from the seat selection step
  const [selectedSeats, setSelectedSeats] = useState([]);
  const ticketRef = useRef(); // Reference to the ticket component
  const [screenHeight] = useState(window.innerHeight);

  // Generate a PDF blob from the ticket element
  const generateTicketPDF = async () => {
    if (!ticketRef.current) return null;
    try {
      console.log("generateTicketPDF: Starting PDF generation...");

      // Preserve original styles
      const originalBg = ticketRef.current.style.backgroundColor;
      const headerEl = ticketRef.current.querySelector(".bg-blue-700");
      let originalHeaderRadius = "";
      if (headerEl) {
        originalHeaderRadius = headerEl.style.borderRadius;
        headerEl.style.borderRadius = "0";
        console.log(
          "generateTicketPDF: Header border radius set to 0 for capture.",
        );
      }

      // Set a clean background for capture
      ticketRef.current.style.backgroundColor = "#fff";
      console.log("generateTicketPDF: Background set to white for capture.");

      // Capture the ticket element with higher resolution
      const canvas = await html2canvas(ticketRef.current, {
        scale: 3,
        useCORS: true,
      });
      console.log("generateTicketPDF: html2canvas capture complete.");

      const imgData = canvas.toDataURL("image/png");
      console.log("generateTicketPDF: Ticket image data URL generated.");

      // Create a new PDF document
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Calculate dimensions to maintain aspect ratio
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const imgWidth = pageWidth;
      const imgHeight = (canvasHeight * pageWidth) / canvasWidth;
      const yPosition = (pageHeight - imgHeight) / 8;
      console.log(
        `generateTicketPDF: Calculated image dimensions: ${imgWidth} x ${imgHeight}, yPosition: ${yPosition}`,
      );

      // Add the captured ticket image to the PDF
      pdf.addImage(imgData, "PNG", 0, yPosition, imgWidth, imgHeight);
      console.log("generateTicketPDF: Ticket image added to PDF.");

      // --- Generate a QR Code with dummy data ---
      const dummyTicketId = "TICKET-123456"; // Dummy data for QR code
      console.log(
        "generateTicketPDF: Generating QR Code with value:",
        dummyTicketId,
      );

      const qrDataUrl = await QRCode.toDataURL(dummyTicketId);
      console.log(
        "generateTicketPDF: QR Code generated, data URL length:",
        qrDataUrl.length,
      );

      if (!qrDataUrl.startsWith("data:image/png")) {
        console.error(
          "generateTicketPDF: Unexpected QR code data URL format",
          qrDataUrl,
        );
      }

      // Define size and position for the QR code (in mm)
      const qrWidth = 60; // width in mm
      const qrHeight = 40; // height in mm
      const qrX = (pageWidth - qrWidth) / 2; // Center horizontally
      // Position the QR code toward the bottom of the ticket image; adjust offset as needed
      const qrY = yPosition + imgHeight - 90;

      // Add the QR code image to the PDF
      pdf.addImage(qrDataUrl, "PNG", qrX, qrY, qrWidth, qrHeight);
      console.log(
        "generateTicketPDF: QR Code added to PDF at position:",
        qrX,
        qrY,
      );

      // Generate PDF blob
      const pdfBlob = pdf.output("blob");
      console.log("generateTicketPDF: PDF generation complete, blob created.");

      // Restore original styles
      ticketRef.current.style.backgroundColor = originalBg;
      if (headerEl) {
        headerEl.style.borderRadius = originalHeaderRadius;
      }
      console.log("generateTicketPDF: Styles restored. Returning PDF blob.");

      return pdfBlob;
    } catch (error) {
      console.error("Error generating PDF:", error);
      return null;
    }
  };

  useEffect(() => {
    const handlePopState = (event) => {
      const state = event.state;

      setIsTransferDetailPageOpen(Boolean(state?.ticketDetails));
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      console.log(window.history.state);
    };
  }, []);

  const mainModalRef = useRef(null);
  const transferModalRef = useRef(null);
  const transferDetailModalRef = useRef(null);

  const quantityNumber = Number(ticket.quantity) || 1;
  const dispatch = useDispatch();
  // ~~~~~ MAIN TICKET MODAL ANIMATIONS ~~~~~
  const afterOpenMainModal = () => {
    gsap.fromTo(
      mainModalRef.current,
      { y: "100%", opacity: 0 },
      { y: "0%", opacity: 1, duration: 0.3, ease: "power2.out" },
    );
  };
  const beforeCloseMainModal = () => {
    return new Promise((resolve) => {
      gsap.to(mainModalRef.current, {
        y: "100%",
        opacity: 0,
        duration: 0.2,
        onComplete: resolve,
      });
    });
  };

  // ~~~~~ TRANSFER SEAT SELECTION MODAL ANIMATIONS ~~~~~
  const afterOpenTransferModal = () => {
    gsap.fromTo(
      transferModalRef.current,
      { y: "100%", opacity: 0 },
      { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" },
    );
  };
  const beforeCloseTransferModal = () => {
    return new Promise((resolve) => {
      gsap.to(transferModalRef.current, {
        y: "100%",
        opacity: 0,
        duration: 0.2,
        onComplete: resolve,
      });
    });
  };
  const handleDeleteTicket = async () => {
    if (window.confirm("Do you want to delete this ticket?")) {
      try {
        await dispatch(deleteTicket(ticket.id)).unwrap();
        toast.success("Ticket deleted successfully.");
        onClose();
      } catch (error) {
        console.error("Delete error:", error);
        toast.error("Failed to delete ticket.");
      }
    }
  };
  // ~~~~~ FINAL TRANSFER DETAIL MODAL ANIMATIONS ~~~~~
  const afterOpenTransferDetailModal = () => {
    gsap.fromTo(
      transferDetailModalRef.current,
      { y: "100%", opacity: 0 },
      { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" },
    );
  };
  const beforeCloseTransferDetailModal = () => {
    return new Promise((resolve) => {
      gsap.to(transferDetailModalRef.current, {
        y: "100%",
        opacity: 0,
        duration: 0.2,
        onComplete: resolve,
      });
    });
  };

  // React Modal Styles
  const mainModalStyles = {
    content: {
      inset: 0,
      padding: 0,
      border: "none",
      borderRadius: 0,
      background: "transparent",
      overflow: "hidden",
    },
    overlay: {
      backgroundColor: "transparent",
      zIndex: 9999,
    },
  };

  const transferModalStyles = {
    content: {
      margin: 0,
      padding: 0,
      border: "none",
      borderRadius: "0.5rem 0.5rem 0 0",
      bottom: 0,
      left: 0,
      right: 0,
      top: "auto",
      background: "white",
      overflow: "hidden",
    },
    overlay: {
      backgroundColor: "rgba(0,0,0,0.5)",
      zIndex: 10000,
    },
  };

  const ticketDetailsModalStyles = {
    content: {
      inset: 0,
      padding: 0,
      border: "none",
      borderRadius: 0,
      background: "transparent",
      overflow: "hidden",
    },
    overlay: {
      backgroundColor: "transparent",
      zIndex: 10000,
    },
  };

  const capitalize = (str) => {
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <>
      {/* MAIN TICKET MODAL */}
      <Modal
        isOpen={isOpen}
        onAfterOpen={afterOpenMainModal}
        onRequestClose={async () => {
          await beforeCloseMainModal();
          onClose();
        }}
        style={mainModalStyles}
        closeTimeoutMS={300}
        ariaHideApp={false}
      >
        <div
          ref={mainModalRef}
          className="bg-white flex flex-col overflow-hidden"
          style={{
            height: `${screenHeight}px`,
          }}
          // className="fixed inset-0 bg-white flex flex-col"
          // ref={mainModalRef}
        >
          {/* Header */}
          <div className="flex items-center bg-customBlack justify-between px-4 py-6 border-b border-gray-200">
            <MdOutlineClose
              className="text-2xl text-white cursor-pointer"
              onClick={async () => {
                await beforeCloseMainModal();
                onClose();
              }}
            />
            <h2 className="text-base font-semibold text-white">My Tickets</h2>
            <p className="text-sm text-white cursor-pointer">Help</p>
          </div>

          {/* Main content: horizontally scrollable tickets */}
          <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pt-0.5 pb-32">
            <div
              className="flex space-x-4 overflow-x-auto scrollbar-hide"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {Array.from({ length: quantityNumber }).map((_, i) => {
                const baseSeat = ticket.seatNumber
                  ? Number(ticket.seatNumber)
                  : null;
                const dynamicSeat = baseSeat !== null ? baseSeat + i : null;
                return (
                  <div
                    ref={ticketRef}
                    key={i}
                    className="flex-none w-80 h-[30.875rem] rounded-xl relative border-[0.1rem] border-gray-300 rounded-t-[0.875rem]"
                  >
                    <div className="bg-customBlue rounded-t-xl">
                      {/* Top Bar */}
                      <div className="text-white text-xs p-2 flex justify-between items-center">
                        <psuedo className="w-[1.125rem]" />
                        <p className="text-xs  opacity-70">
                          {capitalize(ticket.ticketHeader) || "GA"}
                        </p>
                        <MdInfoOutline className="text-lg" />
                      </div>

                      {/* Modified Middle Bar */}
                      {ticket.row && ticket.seatNumber ? (
                        <div className="bg-customBlue text-white px-9 text-base py-4 flex justify-between">
                          <div className="flex flex-col justify-center items-center">
                            <span className="text-xs">SEC</span>
                            <span className=" font-semibold">
                              {ticket.section || "GA"}
                            </span>
                          </div>
                          <div className="flex flex-col justify-center items-center">
                            <span className="text-xs">Row</span>
                            <span className=" font-semibold">
                              {capitalize(ticket.row)}
                            </span>
                          </div>
                          <div className="flex flex-col justify-center items-center">
                            <span className="text-xs">Seat</span>
                            <span className=" font-semibold">
                              {dynamicSeat}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-customBlue text-white px-9 text-base py-4 flex justify-between">
                          <div className="flex flex-col justify-center items-center">
                            <span className="text-xs">SEC</span>
                            <span className=" font-semibold">
                              {ticket.section || "GA"}
                            </span>
                          </div>
                          <span className=" font-semibold">
                            {capitalize(ticket.admissionType) ||
                              "General Admission"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Ticket Image */}
                    <div className="relative h-52 w-full bg-gray-200">
                      <img
                        crossOrigin="anonymous"
                        src={ticket.coverImage}
                        alt={ticket.title}
                        className="object-cover w-full h-full"
                      />

                      <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-black via-black/70 to-transparent"></div>
                      <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 text-center text-white w-full px-4">
                        <h2 className="text-lg font-normal">{ticket.title}</h2>
                        <p className="flex items-center justify-center text-xs font-light">
                          {ticket.dateTime}
                          <LuDot className="text-xl mx-0.5" />
                          {ticket.location}
                        </p>
                      </div>
                    </div>

                    {/* Lower Section */}
                    <div className="py-4 px-4 pb-12 bg-white text-gray-800 rounded-b-xl">
                      {ticket.gate && (
                        <p className="text-sm text-center font-bold mb-2">
                          {ticket.gate || "GATE 1"}
                        </p>
                      )}
                      {/* View Ticket Button */}
                      <button
                        className={`bg-black w-[90%] mx-auto text-white py-2 text-xs mt-4 font-light mb-2 flex items-center justify-center rounded-[0.0625rem] ${ticket.gate ? "" : "mt-8"}`}
                        // onClick={handleDeleteTicket}
                      >
                        <PiBarcodeLight className="mr-2 text-2xl" />
                        View Ticket
                      </button>
                      {/* Ticket Details Link */}
                      <p
                        className="text-neutral-700 text-[0.875rem] text-center font-extrabold mt-5 cursor-pointer"
                        onClick={() => {
                          if (!isTransferDetailPageOpen) {
                            window.history.pushState(
                              {
                                ...window.history.state,
                                ticketDetails: true,
                              },
                              "",
                            );

                            setIsTransferDetailPageOpen(true);
                          }
                        }}
                      >
                        Ticket Details
                      </p>
                    </div>
                    <div className="absolute bottom-0 w-full flex justify-center">
                      <div className="w-[90%] mx-auto rounded-xl border-b border border-customBlue rounded-b-xl"></div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center space-x-2 mt-6">
              {Array.from({ length: quantityNumber }).map((_, index) => (
                <span
                  key={index}
                  className="w-2 h-2 rounded-full bg-gray-300"
                ></span>
              ))}
            </div>

            {/* Transfer & Sell Buttons */}
            <div className="mt-6 flex justify-center space-x-4">
              <button
                className="bg-customBlue text-white w-28 py-5.5 h-10 rounded-lg text-sm items-center flex justify-center"
                onClick={() => setIsTransferOpen(true)}
              >
                Transfer
              </button>
              <button
                disabled={!ticket.forSale}
                className={` w-28 py-5.5 h-10 rounded-lg flex items-center justify-center text-sm font-medium ${
                  ticket.forSale
                    ? "bg-customBlue text-white hover:bg-[#0139A7]"
                    : "bg-gray-400 text-gray-200 cursor-not-allowed opacity-50"
                }`}
              >
                Sell
              </button>
              <button
                className="bg-customBlue text-white w-28 py-5.5 h-10 rounded-lg text-sm items-center flex justify-center "
                // onClick={() => setIsTransferOpen(true)}
              >
                Orders
              </button>
            </div>

            <div className="mt-3 rounded-2xl relative">
              <p className="absolute z-9999 top-2 left-4 text-xl text-white drop-shadow-[0_3px_2px_rgba(0,0,0,1)] ">
                {ticket.location}
              </p>
              <MapComponent lat={ticket.lat} lng={ticket.lng} />
            </div>
          </div>
        </div>
      </Modal>

      {/* {TICKET DETAILS MODAL} */}
      <Modal
        isOpen={isTransferDetailPageOpen}
        onAfterOpen={afterOpenTransferModal}
        onRequestClose={() => {
          window.history.back();
        }}
        style={ticketDetailsModalStyles}
        ariaHideApp={false}
      >
        <div ref={transferModalRef} className="bg-white h-full overflow-y-auto">
          <div className="w-full h-64 relative">
            <div className="absolute top-0 left-0 w-full flex justify-between items-center text-white px-4 py-3">
              <div
                className="cursor-pointer bg-neutral-800/50 px-2.5 py-2.5 rounded-full text-[1.125rem] flex items-center justify-center text-white"
                onClick={() => window.history.back()}
              >
                <FaArrowLeft />
              </div>
              <div
                className="cursor-pointer bg-neutral-800/50 px-4 py-2 rounded-full text-[0.875rem] flex items-center justify-center text-white"
                // onClick={() => setIsTransferDetailPageOpen(false)}
              >
                Help
              </div>
            </div>
            <img
              src={ticket.coverImage}
              alt=""
              className="w-full h-full object-cover"
            />

            <div className="absolute bottom-0 px-4 w-full text-white">
              <div className="bg-neutral-800 border border-neutral-800 px-4 pt-2 w-[60%] capitalize">
                {" "}
                {ticket.dateTime}
              </div>
            </div>
          </div>
          <div className="px-4 w-full text-white">
            <div className="bg-neutral-800 border border-neutral-800 px-4 pt-2 pb-1 w-full capitalize text-[1.5rem] font-extrabold">
              {" "}
              {ticket.title}
            </div>
            <div className="bg-neutral-800 border border-neutral-800 px-4 pb-4.5 w-full capitalize text-[0.875rem] font-light flex items-center justify-between">
              {ticket.location}
              <p className="font-bold text-lg flex items-center justify-items-end">
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
                  {quantityNumber}
                </p>
              </p>
            </div>
            <div className="bg-customBlue py-3 w-full capitalize text-[0.9375rem] flex items-center justify-center font-medium">
              <p className="flex items-center justify-center">
                <PiBarcodeLight className="text-[1.75rem]" />
                <span className="ml-1"></span>
                View Tickets
              </p>
            </div>
          </div>

          <div className="w-full px-4">
            {/* Tickets and Extras tab placement */}
            <div className="flex mx-1 items-center justify-between font-medium">
              <div
                className={`cursor-pointer flex items-center justify-center w-full relative mr-1 py-4.5 font-bold text-sm ${activeTab === "tickets" ? "text-gray-900" : "text-gray-700"}`}
                onClick={() => setActiveTab("tickets")}
              >
                Tickets
                <div
                  className={`absolute bottom-0 w-full ${activeTab === "tickets" ? "text-gray-900 border-gray-900 border-b-4" : "text-gray-700 border-gray-400 border-b-[0.1875rem]"}`}
                ></div>
              </div>
              <div
                className={`cursor-pointer flex items-center justify-center w-full relative ml-1 py-4.5 font-bold text-sm ${activeTab === "extras" ? "text-gray-900" : "text-gray-700"}`}
                // onClick={() => setActiveTab("extras")}
                disabled={true}
              >
                Extras
                <div
                  className={`absolute bottom-0 w-full ${activeTab === "extras" ? "text-gray-900 border-gray-900 border-b-4" : "text-gray-700 border-gray-400 border-b-[0.1875rem]"}`}
                ></div>
              </div>
            </div>
            {activeTab === "tickets" && (
              <div className="mb-11">
                <div className="pt-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg text-gray-900 font-bold">
                      Order #29-{ticket.id}/PGR
                    </h3>
                    <p className="text-gray-400 text-[0.9375rem]">
                      x{quantityNumber} Tickets
                    </p>
                  </div>
                  <div className="text-gray-900 text-2xl font-bold">
                    <HiDotsVertical />
                  </div>
                </div>

                {Array.from({ length: quantityNumber }).map((_, i) => {
                  const baseSeat = ticket.seatNumber
                    ? Number(ticket.seatNumber)
                    : null;
                  const dynamicSeat = baseSeat !== null ? baseSeat + i : null;
                  return (
                    <div
                      ref={ticketRef}
                      key={i}
                      className="mt-5 space-y-3 text-gray-800"
                    >
                      <div className="w-full py-4 px-6 mb-0.5 text-sm font-bold text-gray bg-neutral-200">
                        Verified Fan Onsale
                      </div>
                      <div className="w-full py-4 px-6 bg-neutral-200 flex items-center justify-between">
                        <div className="flex flex-col items-start justify-center">
                          <p className="font-bold text-gray-600 text-sm mb-1">
                            SECTION
                          </p>
                          <p className="text-gray-800 font-extrabold text-[0.9375rem]">
                            {ticket.section}
                          </p>
                        </div>
                        <div className="flex flex-col items-center justify-center">
                          <p className="font-bold text-gray-600 text-sm mb-1">
                            ROW
                          </p>
                          <p className="text-gray-800 font-extrabold text-[0.9375rem]">
                            {ticket.row || "--"}
                          </p>
                        </div>
                        <div className="flex flex-col items-end justify-center">
                          <p className="font-bold text-gray-600 text-sm mb-1">
                            SEAT
                          </p>
                          <p className="text-gray-800 font-extrabold text-[0.9375rem]">
                            {dynamicSeat || "--"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pill tab */}
          <div className="sticky bottom-9 z-10 w-full flex justify-center items-center">
            <div className="border border-neutral-300 h-18 w-50 bottom-9 z-10 mx-auto rounded-full bg-white shadow-lg shadow-neutral-300 backdrop-blur-md flex items-center justify-center">
              <div
                className="flex flex-col items-center justify-center w-full h-full"
                onClick={() => setIsTransferOpen(true)}
              >
                <GoArrowUpRight className={`text-[1.75rem]  text-customBlue`} />
                <p className="text-[0.75rem] font-medium">Transfer</p>
              </div>
              <div className="flex flex-col items-center justify-center w-full h-full border-l-[0.0125rem] border-gray-300 text-neutral-400">
                <FaRotate className={`text-[1.375rem] mb-1.5`} />
                <p className="text-[0.75rem] font-medium">Sell</p>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* TRANSFER MODAL (Seat Selection) */}
      <Modal
        isOpen={isTransferOpen}
        onAfterOpen={afterOpenTransferModal}
        onRequestClose={async () => {
          await beforeCloseTransferModal();
          setIsTransferOpen(false);
        }}
        style={transferModalStyles}
        ariaHideApp={false}
      >
        <div
          className="rounded-t-lg shadow-lg py-2 px-4 relative"
          ref={transferModalRef}
        >
          {/* Transfer Modal Header */}
          <div className="flex items-center justify-center border-b pb-2 relative">
            <h2 className="text-xs font-medium ">Select Tickets to Transfer</h2>
          </div>

          {/* Info Message */}
          <div className="flex items-center border-b py-1 mt-1 text-sm text-gray-900">
            <MdInfo className="mr-2 text-5xl text-gray-400" />
            <span>
              Only transfer tickets to people you know and trust to ensure
              everyone stays safe.
            </span>
          </div>

          {/* Seat Selection */}
          <TransferSeatSelector
            quantityNumber={quantityNumber}
            ticket={ticket}
            onDone={(selected) => {
              setSelectedSeats(selected);
              beforeCloseTransferModal().then(() => {
                setIsTransferOpen(false);
                setIsTransferDetailOpen(true);
              });
            }}
          />
        </div>
      </Modal>

      {/* FINAL TRANSFER DETAILS MODAL */}
      <TransferDetailModal
        isOpen={isTransferDetailOpen}
        onClose={() => setIsTransferDetailOpen(false)}
        selectedSeats={selectedSeats}
        ticket={ticket}
        generateTicketPDF={generateTicketPDF}
      />
    </>
  );
};

/* ~~~~~~~~~~~~~~ SEAT SELECTION COMPONENT ~~~~~~~~~~~~~~ */
function TransferSeatSelector({ quantityNumber, ticket, onDone }) {
  const [selectedSeats, setSelectedSeats] = useState([]);

  const toggleSeat = (seatIndex) => {
    setSelectedSeats((prev) => {
      const isSelected = prev.includes(seatIndex);
      if (isSelected) {
        return prev.filter((idx) => idx !== seatIndex);
      } else {
        return [...prev, seatIndex];
      }
    });
  };

  return (
    <>
      <div className="mt-4">
        <div className="flex items-center justify-between space-x-2">
          <p className="text-base text-black font-medium">
            {`Section ${ticket.section || "GA"} ${ticket.row ? `, Row ${ticket.row || "-"}` : ""}`}
          </p>
          {/* Show number selected & total */}
          <div className="text-black flex items-center font-medium">
            <IoTicket className="mr-1 text-gray-500 text-sm" />
            {quantityNumber} ticket(s)
          </div>
        </div>

        <div className="flex justify-center space-x-4 mt-4">
          {Array.from({ length: quantityNumber }).map((_, i) => {
            const isSelected = selectedSeats.includes(i);
            return (
              <button
                key={i}
                onClick={() => toggleSeat(i)}
                className="w-16 h-20 shadow-lg bg-white flex flex-col justify-start items-center rounded-xl border border-gray-300 relative"
              >
                {/* Blue Top Portion */}
                <div className="bg-customBlue w-full text-white text-xs flex justify-center items-center py-2 rounded-t-md">
                  {ticket.row
                    ? `SEAT ${ticket.seatNumber ? Number(ticket.seatNumber) + i : i + 1}`
                    : ticket.section}
                </div>

                {/* Selectable Circle */}
                <span
                  className={`mt-4 w-5 h-5 border border-gray-400 rounded-full ${
                    isSelected ? "bg-blue-600" : "bg-white"
                  }`}
                ></span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t mt-4 translate-y-4 border-gray-200"></div>

      {/* Bottom Row => (# selected) & Transfer To */}
      <div className="mt-6 mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          {selectedSeats.length} Selected
        </p>
        <button
          className="flex items-center  text-blue-600 font-medium text-xs"
          onClick={() => selectedSeats.length > 0 && onDone(selectedSeats)}
        >
          Transfer To
          <GoChevronRight className="ml-1" />
        </button>
      </div>
    </>
  );
}

/* ~~~~~~~~~~~~~~ FINAL TRANSFER DETAIL MODAL ~~~~~~~~~~~~~~ */
function TransferDetailModal({
  isOpen,
  onClose,
  selectedSeats,
  ticket,
  generateTicketPDF,
}) {
  const transferDetailModalRef = useRef(null);
  const [successName, setSuccessName] = useState("");
  // 2) Local states to capture user input
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailOrMobile, setEmailOrMobile] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const afterOpen = () => {
    gsap.fromTo(
      transferDetailModalRef.current,
      { y: "100%", opacity: 0 },
      { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" },
    );
  };
  const beforeClose = () => {
    return new Promise((resolve) => {
      gsap.to(transferDetailModalRef.current, {
        y: "100%",
        opacity: 0,
        duration: 0.2,
        onComplete: resolve,
      });
    });
  };

  // The number of seats the user selected
  const seatCount = selectedSeats.length;
  // Function to upload the PDF blob to Cloudinary
  const uploadPDFToCloudinary = async (pdfBlob) => {
    // Convert blob to a File object
    const pdfFile = new File([pdfBlob], "ticket.pdf", {
      type: "application/pdf",
    });

    const formData = new FormData();
    formData.append("file", pdfFile);
    formData.append("upload_preset", "Ticket"); // Use your Cloudinary preset
    formData.append("resource_type", "raw"); // Specify raw for non-image files

    const cloudinaryUploadUrl =
      "https://api.cloudinary.com/v1_1/domlob3pr/raw/upload";

    try {
      const response = await fetch(cloudinaryUploadUrl, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.secure_url) {
        // Append attachment flag and filename
        return data.secure_url + "?fl_attachment=true&filename=ticket.pdf";
      } else {
        throw new Error("PDF upload failed");
      }
    } catch (err) {
      console.error("Cloudinary PDF Upload Error:", err);
      return null;
    }
  };

  // 3) Handle the final transfer => Save to Firestore
  const handleTransfer = async () => {
    try {
      setLoading(true);
      // 1. Generate the PDF blob using the function passed from TicketModal
      const pdfBlob = await generateTicketPDF();
      let ticketPdfUrl = "";
      if (pdfBlob) {
        // 2. Upload the PDF to Cloudinary and get the URL
        ticketPdfUrl = await uploadPDFToCloudinary(pdfBlob);
      }
      // 3. Compose the transfer data including the PDF URL
      const transferData = {
        firstName,
        lastName,
        emailOrMobile,
        note,
        seats: selectedSeats,
        ticketId: ticket.id,
        eventTitle: ticket.title,
        eventDateTime: ticket.dateTime,
        eventLocation: ticket.location,
        eventCoverImage: ticket.coverImage,
        section: ticket.section || "GA",
        row: ticket.row || "-",
        createdAt: new Date().toISOString(),
        ticketPdfUrl, // New field: URL of the uploaded ticket PDF
      };

      await addDoc(collection(db, "transfers"), transferData);

      setLoading(false);

      setSuccessName(firstName);
      setShowSuccess(true);
      setFirstName("");
      setLastName("");
      setEmailOrMobile("");
      setNote("");
    } catch (error) {
      console.error("Error transferring ticket:", error);
      setLoading(false);
    }
  };

  return (
    <>
      // Transfer Details Modal: collect recipient info and confirm transfer
      <Modal
        isOpen={isOpen}
        onAfterOpen={afterOpen}
        onRequestClose={async () => {
          await beforeClose();
          onClose();
        }}
        style={{
          content: {
            margin: 0,
            padding: 0,
            border: "none",
            borderRadius: "0.5rem 0.5rem 0 0",
            bottom: 0,
            left: 0,
            right: 0,
            top: "auto",
            background: "white",
            overflow: "hidden",
          },
          overlay: {
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 10001,
          },
        }}
        ariaHideApp={false}
      >
        {loading && (
          <div className="fixed inset-0 bg-white/90 z-50 flex items-center justify-center">
            <img
              src="/ticketmasterf.png"
              alt="Loading…"
              className="w-40 h-32 animate-ping"
            />
          </div>
        )}

        <div
          className="rounded-t-lg shadow-lg p-4  pt-2 relative"
          ref={transferDetailModalRef}
        >
          {/* Header */}
          <div className="flex items-center justify-center border-b border-gray-300 pb-2 relative">
            <h2 className="text-xs font-bold ">Transfer Tickets</h2>
          </div>

          {/* Ticket Summary */}
          <p className="text-sm font-normal mt-2">
            <p className="text-xs">
              {seatCount} Ticket(s) Selected <br />
            </p>
            {`Section ${ticket.section || "GA"} ${ticket.row ? `, Row ${ticket.row || "-"}` : ""}`}
          </p>

          {/* Transfer Form */}
          <div className="mt-3 space-y-2 text-xs">
            <div className="space-y-1">
              <label className="block text-black font-medium">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-gray-400 rounded px-3 py-2"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-black font-medium">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-gray-400 rounded px-3 py-2"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-black font-medium">Email</label>
              <input
                type="text"
                value={emailOrMobile}
                onChange={(e) => setEmailOrMobile(e.target.value)}
                className="w-full border border-gray-400 rounded px-3 py-2"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-black font-medium">Note</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full border border-gray-400 rounded text-[1rem] px-3 py-2 h-20 outline-none resize-none"
              />
            </div>
          </div>

          <div className="border-t mt-1 border-gray-200  mb-12"></div>
          <button
            className="absolute left-2 flex bottom-6 items-center text-xs  text-customBlue font-medium"
            onClick={async () => {
              await beforeClose();
              onClose();
            }}
          >
            <GoChevronRight className="rotate-180 mr-1" />
            Back
          </button>

          <button
            className="absolute right-2 bg-customBlue py-2 bottom-4 px-2 w-36 justify-center  rounded-sm flex items-center text-xs  text-white font-normal"
            onClick={handleTransfer}
          >
            {loading ? (
              <ClipLoader size={15} color="#fff" />
            ) : (
              `Transfer ${seatCount} Ticket(s)`
            )}
          </button>
        </div>
      </Modal>
      // Success Modal: show after transfer is complete
      <Modal
        isOpen={showSuccess}
        onRequestClose={() => setShowSuccess(false)}
        overlayClassName="fixed inset-0 bg-black/50 z-[11000] flex items-center justify-center"
        className="relative w-full h-full mx-auto bg-white overflow-hidden z-[11001]"
        ariaHideApp={false}
      >
        {/* Header with blue bar + logo */}
        <div className="bg-white border-b border-gray-200 px-6 py- flex justify-center">
          <img src="/ticketmasterf.png" alt="ticketmaster" className="h-20" />
        </div>

        {/* Body */}
        <div className="px-6 py-8">
          <h2 className="text-center text-lg font-semibold text-gray-700 mb-8">
            Your Ticket Transfer Is On The Way
            {successName ? ` to ${successName}` : ""}
          </h2>

          {/* Progress Steps */}
          <div className="flex items-center">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div className="p-2 bg-customBlue text-white rounded-full">
                <IoTicketOutline size={14} />
              </div>
              <span className="mt-2 text-xs text-customBlue">Sent</span>
            </div>

            {/* Connector */}
            <div className="w-32 h-0.5 bg-gray-300 -translate-y-3 relative">
              <div className="absolute top-0 left-0 " />
            </div>

            {/* Step 2 */}
            <div className="flex -mx-2 flex-col items-center">
              <div className="p-2 border-2  border-dashed border-gray-300 text-gray-400 rounded-full">
                <FaRegCircleCheck size={14} />
              </div>
              <span className="mt-2 text-xs text-gray-400">Accepted</span>
            </div>

            {/* Connector */}
            <div className="w-32 h-0.5 bg-gray-300 -translate-y-3 " />

            {/* Step 3 */}
            <div className="flex -mx-2 flex-col items-center">
              <div className="p-2 border-2 border-dashed border-gray-300 text-gray-400 rounded-full">
                <LuTickets size={14} />
              </div>
              <span className="mt-2 text-xs text-gray-400">Complete</span>
            </div>
          </div>

          {/* Done Button */}
          {/* Done Button */}
          <div className="mt-80 flex justify-center">
            <button
              className="bg-customBlue text-white py-2 px-6 rounded-md font-medium"
              onClick={async () => {
                await beforeClose();
                onClose();
                setShowSuccess(false);
              }}
            >
              Got it
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default TicketModal;
