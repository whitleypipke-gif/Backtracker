import React, { useRef, useState } from "react";
import Modal from "react-modal";
import { gsap } from "gsap";
import { MdInfo, MdInfoOutline, MdOutlineClose } from "react-icons/md";
import { LuDot } from "react-icons/lu";
import { IoSend, IoTicket } from "react-icons/io5";
import { BsInfoCircle, BsUpcScan } from "react-icons/bs";
import { GoChevronRight } from "react-icons/go";
import { useDispatch } from "react-redux";
import { deleteTicket } from "../redux/ticketSlice";
import MapComponent from "./Map";
import { IoTicketOutline } from "react-icons/io5";
import { FaRegCircleCheck } from "react-icons/fa6";
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
import { FaInfo, FaTicketAlt } from "react-icons/fa";
const TicketModal = ({ isOpen, onClose, ticket }) => {
  if (!ticket) return null;

  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isTransferDetailOpen, setIsTransferDetailOpen] = useState(false);

  // The selected seats from the seat selection step
  const [selectedSeats, setSelectedSeats] = useState([]);
  const ticketRef = useRef(); // Reference to the ticket component

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

  // Refs for animating the modals
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
          className="fixed inset-0 bg-white flex flex-col"
          ref={mainModalRef}
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
          <div className="flex-1 overflow-y-auto scrollbar-hide p-4 pb-32">
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
                    className="flex-none w-80 h-[494px] rounded-xl relative border-[1.6px] border-gray-300 rounded-t-[14px] "
                  >
                    <div className="bg-customBlue rounded-t-xl">
                      {/* Top Bar */}
                      <div className="text-white text-xs p-2 flex justify-between items-center">
                        <psuedo className="w-[18px]" />
                        <p className="text-xs  opacity-70">
                          {capitalize(ticket.ticketHeader) || "GA"}
                        </p>
                        <MdInfoOutline className="text-lg" />
                      </div>

                      {/* Modified Middle Bar */}
                      {ticket.row && ticket.seatNumber ? (
                        <div className="text-white px-6 text-base py-4 flex justify-between items-center">
                          <div className="flex flex-col justify-evenly items-center w-[25%] text-center">
                            <span className="text-xs font-semibold">SEC</span>
                            <span className=" font-semibold">
                              {capitalize(ticket.section) || "GA"}
                            </span>
                          </div>
                          <div className="flex text-center flex-col">
                            <span className=" text-xs font-light">Row</span>
                            <span className=" font-semibold">
                              {capitalize(ticket.row)}
                            </span>
                          </div>
                          <div className="flex flex-col text-center">
                            <span className=" text-xs font-light">
                              {capitalize(ticket.admissionType) ||
                                "General Admission"}
                            </span>
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
                              {capitalize(ticket.section) || "GA"}
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
                    <div className="py-6 px-4 pb-12 bg-white text-gray-800 rounded-b-xl">
                      <p className="text-sm text-center font-bold mb-2">
                        {ticket.gate || "GATE 1"}
                      </p>
                      {/* View Ticket Button */}
                      <button
                        className="bg-black w-[90%] mx-auto text-white py-2 text-xs mt-4 font-light mb-2 flex items-center justify-center rounded-[1px]"
                        // onClick={handleDeleteTicket}
                      >
                        <BsUpcScan className="mr-2" />
                        View Ticket
                      </button>
                      {/* Ticket Details Link */}
                      <p className="text-neutral-700 text-xs text-center font-bold mt-5 cursor-pointer">
                        Ticket Details
                      </p>
                    </div>
                    <div className="w-[90%] mx-auto rounded-xl border-b border border-customBlue rounded-b-xl"></div>
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
                className="bg-customBlue text-white w-36 py-6 h-10 rounded-lg text-sm items-center flex justify-center"
                onClick={() => setIsTransferOpen(true)}
              >
                Transfer
              </button>
              <button
                disabled={!ticket.forSale}
                className={`
    w-36 py-6 h-10 rounded-lg flex items-center justify-center text-sm font-medium
    ${
      ticket.forSale
        ? "bg-customBlue text-white hover:bg-[#0139A7]"
        : "bg-gray-400 text-gray-200 cursor-not-allowed opacity-50"
    }
  `}
              >
                Sell
              </button>
              <button
                className="bg-customBlue text-white w-36 py-6 h-10 rounded-lg text-sm items-center flex justify-center "
                onClick={() => setIsTransferOpen(true)}
              >
                Orders
              </button>
            </div>
            <div className="mt-7 rounded-2xl">
              <MapComponent lat={ticket.lat} lng={ticket.lng} />
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
            Sec {ticket.section || "GA"}, Row {ticket.row || "-"}
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
                  SEAT
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
          onClick={() => onDone(selectedSeats)}
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
            Sec <span className="font-bold">{ticket.section || "GA"}</span> Row{" "}
            {ticket.row || "?"}
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
                className="w-full border border-gray-400 rounded text-[16px] px-3 py-2 h-20 outline-none resize-none"
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
