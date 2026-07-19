import React, { useState, useEffect } from "react";
import { db } from "../firebase.config"; // Adjust import path if needed
import {
  collection,
  doc,
  deleteDoc,
  getDocs,
  addDoc, // left in for your existing usage
} from "firebase/firestore";
import { Toaster, toast } from "react-hot-toast";
import AddTicket from "../Components/AddTicket";

const ForYou = () => {
  /* -------------------------------------------------------------------------
     PART A: EVENT-UPLOAD FORM
  ------------------------------------------------------------------------- */
  const [title, setTitle] = useState("");
  const [coverTag, setCoverTag] = useState("");
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // new fields for event type & subCategory
  const [eventType, setEventType] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.size) {
      toast.error("No transfers selected");
      return;
    }
    if (!window.confirm(`Delete ${selectedIds.size} transfers?`)) return;

    // delete in parallel, then refresh
    await Promise.all(
      Array.from(selectedIds).map((id) => deleteDoc(doc(db, "transfers", id)))
    );
    toast.success("Deleted selected transfers");
    setSelectedIds(new Set());
    const snap = await getDocs(collection(db, "transfers"));
    setTransfers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  // Cloudinary config
  const cloudinaryUploadUrl =
    "https://api.cloudinary.com/v1_1/domlob3pr/image/upload";
  const cloudinaryUploadPreset = "Ticket";

  // handle image upload to Cloudinary (unsigned)
  const uploadImageToCloudinary = async (imageFile) => {
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("upload_preset", cloudinaryUploadPreset);

    try {
      const response = await fetch(cloudinaryUploadUrl, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.secure_url) {
        return data.secure_url;
      } else {
        throw new Error("Image upload failed");
      }
    } catch (err) {
      console.error("Cloudinary Upload Error:", err);
      setError("Error uploading image.");
      toast.error("Error uploading image to Cloudinary");
      return null;
    }
  };

  // handle the entire upload (Text + Image)
  const handleUpload = async () => {
    // Basic validation
    if (!title || !image || !eventType) {
      setError("Please fill in the required fields.");
      toast.error("Please select an event type, title, and image!");
      return;
    }
    // Additional constraints
    if (
      (eventType === "Main Event" ||
        eventType === "Main Others" ||
        eventType === "Popular Near You") &&
      !coverTag
    ) {
      toast.error(
        "Cover Tag is required for Main Event, Main Others & Popular Near You"
      );
      return;
    }
    if (eventType === "Popular Near You" && !subCategory) {
      toast.error("Please select a sub-category for Popular Near You");
      return;
    }

    setUploading(true);
    setError("");

    try {
      // 1) Upload image to Cloudinary
      const imageUrl = await uploadImageToCloudinary(image);
      if (!imageUrl) {
        setUploading(false);
        return;
      }

      // 2) Save to Firestore
      await addDoc(collection(db, "posts"), {
        title,
        coverTag: coverTag || "",
        imageUrl,
        eventType,
        subCategory: subCategory || "",
        createdAt: new Date(),
      });

      toast.success("Upload successful!");

      // Reset form fields
      setTitle("");
      setCoverTag("");
      setImage(null);
      setPreviewUrl(null);
      setEventType("");
      setSubCategory("");
    } catch (err) {
      console.error("Upload error:", err);
      setError("Error uploading data.");
      toast.error("Error uploading data to Firestore");
    }
    setUploading(false);
  };

  // handle image selection & preview
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError("");
    }
  };

  // remove currently selected image
  const removeImage = () => {
    setImage(null);
    setPreviewUrl(null);
  };

  /* -------------------------------------------------------------------------
     PART B: FETCH & RENDER TRANSFERS FROM FIRESTORE
  ------------------------------------------------------------------------- */
  const [transfers, setTransfers] = useState([]);

  useEffect(() => {
    const fetchTransfers = async () => {
      try {
        const snap = await getDocs(collection(db, "transfers"));
        const items = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          emailOrMobile: doc.data().emailOrMobile || "",
          eventCoverImage: doc.data().eventCoverImage || "",
          eventDateTime: doc.data().eventDateTime || "",
        }));
        setTransfers(items);
      } catch (err) {
        console.error("Error fetching transfers:", err);
        toast.error("Error fetching transfers data");
      }
    };
    fetchTransfers();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", "#101828");
  }, []);

  return (
    <div className="safe-area-page safe-area-admin">
      <AddTicket />
      <div className="min-h-screen bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-gray-100 flex flex-col items-center py-10 px-4">
        <Toaster position="top-right" reverseOrder={false} />

        {/* ----------- FORM FOR UPLOADING AN EVENT ----------- */}
        <div className="bg-white/10 backdrop-blur-md shadow-2xl rounded-xl p-6 w-full max-w-lg mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center">
            Upload New Event
          </h2>

          {error && <p className="text-red-400 text-center mb-4">{error}</p>}

          {/* Event Type Dropdown */}
          <div className="mb-4">
            <label className="block font-medium mb-1">Event Type:</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="border border-gray-300 rounded-md p-3 w-full text-gray-900 focus:ring-2 focus:ring-blue-400 bg-white"
            >
              <option value="">-- Select Event Type --</option>
              <option value="Main Event">Main Event</option>
              <option value="Main Others">Main Others</option>
              <option value="Popular Near You">Popular Near You</option>
              <option value="Featured">Featured</option>
            </select>
          </div>

          {/* SubCategory (only if "Popular Near You") */}
          {eventType === "Popular Near You" && (
            <div className="mb-4">
              <label className="block font-medium mb-1">Sub-Category:</label>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="border border-gray-300 rounded-md p-3 w-full text-gray-900 focus:ring-2 focus:ring-blue-400 bg-white"
              >
                <option value="">-- Select Sub-Category --</option>
                <option value="Concerts">Concerts</option>
                <option value="Sports">Sports</option>
                <option value="Arts Theater & Comedy">
                  Arts Theater & Comedy
                </option>
                <option value="Family">Family</option>
              </select>
            </div>
          )}

          {/* Title Input */}
          <div className="mb-4">
            <label className="block font-medium mb-1">Title:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter event title"
              className="border border-gray-300 rounded-md p-3 w-full text-gray-900 focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Cover Tag */}
          {(eventType === "Main Event" ||
            eventType === "Main Others" ||
            eventType === "Popular Near You") && (
            <div className="mb-4">
              <label className="block font-medium mb-1">Cover Tag:</label>
              <input
                type="text"
                value={coverTag}
                onChange={(e) => setCoverTag(e.target.value)}
                placeholder="Enter cover tag"
                className="border border-gray-300 rounded-md p-3 w-full text-gray-900 focus:ring-2 focus:ring-blue-400"
              />
            </div>
          )}

          {/* Modern File Input */}
          <div className="mb-4">
            <label className="block font-medium mb-1">Event Image:</label>
            <div className="flex items-center space-x-2">
              <input
                type="file"
                id="imageFile"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <label
                htmlFor="imageFile"
                className="inline-block bg-blue-600 hover:bg-[#0139A7] text-white px-4 py-2 rounded-md cursor-pointer transition"
              >
                Choose File
              </label>
              <span className="text-sm text-gray-400">
                {image ? image.name : "No file chosen"}
              </span>
            </div>
          </div>

          {/* Preview if image is selected */}
          {previewUrl && (
            <div className="mb-4 relative group">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-auto rounded-md border-2 border-gray-300"
              />
              {/* Remove Image Button */}
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 bg-red-600 text-white rounded-md px-2 py-1 shadow-md transition opacity-80 hover:opacity-100"
              >
                Remove
              </button>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={uploading}
            className={`w-full py-3 rounded-md font-semibold text-white mt-4 ${
              uploading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-customBlue hover:bg-[#0139A7]"
            }`}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>

        {/* -----------------------------------------------------------------
             DISPLAY ALL TRANSFERS
           ----------------------------------------------------------------- */}
        <div className="max-w-5xl w-full">
          <h2 className="text-xl font-bold mb-3">Transfers from DB</h2>
          <p className="text-sm text-gray-200 mb-6">
            Click on any input to edit. New fields (like price, fees) start
            blank.
          </p>

          {transfers.length === 0 && (
            <p className="text-gray-400">No transfers found.</p>
          )}
          <div className="flex items-center mb-4 space-x-2">
            <input
              type="checkbox"
              checked={selectedIds.size === transfers.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedIds(new Set(transfers.map((t) => t.id)));
                } else {
                  setSelectedIds(new Set());
                }
              }}
            />
            <label className="text-sm text-gray-200">Select All</label>
            <button
              onClick={handleDeleteSelected}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            >
              Delete Selected ({selectedIds.size})
            </button>
          </div>

          {/* transfer list */}
          <div className="space-y-4">
            {transfers.map((transfer) => (
              <div key={transfer.id} className="flex items-start space-x-4">
                <input
                  type="checkbox"
                  checked={selectedIds.has(transfer.id)}
                  onChange={() => toggleSelect(transfer.id)}
                  className="mt-2"
                />
                <TransferEditor data={transfer} />
              </div>
            ))}
          </div>

       
        </div>
      </div>
    </div>
  );
};

/* 
  Subcomponent: For each transfer doc, 
  we render a small “editor” so user can edit existing fields,
  fill in new ones, then press “Send” to /send-ticket.
*/
function TransferEditor({ data }) {
  // We'll store the doc's existing fields in state so user can edit them
  const [firstName, setFirstName] = useState(data.firstName || "");
  const [lastName, setLastName] = useState(data.lastName || "");
  const [eventTitle, setEventTitle] = useState(data.eventTitle || "");
  const [eventLocation, setEventLocation] = useState(data.eventLocation || "");
  const [note, setNote] = useState(data.note || "");
  const [row, setRow] = useState(data.row || "");
  const [section, setSection] = useState(data.section || "");
  const [ticketId, setTicketId] = useState(data.ticketId || "");
  const [emailOrMobile, setEmailOrMobile] = useState(data.emailOrMobile || "");
  const [eventCoverImage, setEventCoverImage] = useState(
    data.eventCoverImage || ""
  );
  const [eventDateTime, setEventDateTime] = useState(data.eventDateTime || "");

  // Editing toggles for 3 fields
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingCoverImage, setIsEditingCoverImage] = useState(false);
  const [isEditingEventTime, setIsEditingEventTime] = useState(false);
  const [ticketPdfUrl, setTicketPdfUrl] = useState(data.ticketPdfUrl || "");
  const [senderFullName, setSenderFullName] = useState(
    data.senderFullName || ""
  );

  // seats might be array. We'll let user edit each seat.
  const [seats, setSeats] = useState(
    Array.isArray(data.seats) ? data.seats : []
  );

  // Additional new fields (not stored in DB)
  const [pricePerTicket, setPricePerTicket] = useState("");
  const [itemFee, setItemFee] = useState("");
  const [processingFee, setProcessingFee] = useState("");
  const [insuranceFee, setInsuranceFee] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [quantity, setQuantity] = useState(seats.length || 1);
  const [artist, setArtist] = useState(data.artist || "");
  const [tourCountry, setTourCountry] = useState(data.tourCountry || "");
  const [loading, setLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  // Compute total => (price/ticket * quantity) + itemFee + processingFee
  const computeTotal = () => {
    const p = parseFloat(pricePerTicket) || 0;
    const i = parseFloat(itemFee) || 0;
    const c = parseFloat(processingFee) || 0;
    const q = parseInt(quantity, 10) || 1;
    return (p * q + i + c).toFixed(2);
  };
  const total = computeTotal();

  // Handle seat changes
  const handleSeatChange = (index, newVal) => {
    setSeats((prev) => {
      const copy = [...prev];
      copy[index] = newVal;
      return copy;
    });
  };

  // All fields required
  const isFormValid = () => {
    return (
      firstName &&
      lastName &&
      eventTitle &&
      eventLocation &&
      row &&
      section &&
      ticketId &&
      emailOrMobile &&
      eventCoverImage &&
      eventDateTime &&
      artist &&
      tourCountry &&
      pricePerTicket &&
      itemFee &&
      processingFee &&
      parseInt(quantity, 10) > 0
    );
  };
  const handleDeleteTransfer = async () => {
    if (window.confirm("Are you sure you want to delete this transfer?")) {
      try {
        await deleteDoc(doc(db, "transfers", data.id));
        toast.success("Transfer deleted successfully.");
        // Optionally, update parent state to remove this transfer from the list
      } catch (error) {
        console.error("Error deleting transfer:", error);
        toast.error("Failed to delete transfer.");
      }
    }
  };

  const handleSendEmail = async () => {
    if (!isFormValid()) {
      toast.error("Please fill in all fields before sending the email.");
      return;
    }

    setLoading(true);

    const body = {
      firstName,
      lastName,
      eventTitle,
      eventLocation,
      note,
      emailOrMobile,
      eventCoverImage,
      eventDateTime,
      row,
      section,
      seats,
      ticketId: ticketId || "N/A",
      pricePerTicket,
      itemFee,
      processingFee,
      insuranceFee,
      currency,
      quantity,
      artist,
      tourCountry,
      ticketPdfUrl, // Add the ticket PDF URL here
      total,
    };

    try {
      const serverResponse = await fetch(
        "https://tickont-2.onrender.com/send-ticket",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const resData = await serverResponse.json();

      if (serverResponse.ok) {
        toast.success(`Email sent for Transfer: ${ticketId}`);

        // Delete transfer from Firestore using the local doc ID

        toast.success("Transfer deleted successfully.");
      } else {
        toast.error(resData.message || "Failed to send email.");
      }
    } catch (err) {
      console.error("Error sending email:", err);
      toast.error("Error sending email.");
    }

    setLoading(false);
  };
  const handleSendTransferToClient = async () => {
    // Minimal validation
    if (!firstName || !emailOrMobile || !eventTitle || !eventDateTime) {
      toast.error("Fill in recipient name, email/mobile and event details.");
      return;
    }

    setTransferLoading(true);

    const body = {
      emailOrMobile,
      firstName, // recipient first name
      senderFullName,

      eventTitle,
      eventLocation,
      eventDateTime,
      quantity,
      section,
      row,
      seats, // send the full array ✔️

      ticketId,
    };

    try {
      const resp = await fetch("https://tickont-2.onrender.com/send-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await resp.json();
      if (resp.ok) {
        toast.success("Transfer email sent! 🎉");
      } else {
        toast.error(data.message || "Transfer failed.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error while sending transfer.");
    }

    setTransferLoading(false);
  };

  return (
    <div className="bg-white/10 p-4 rounded-md mb-6">
      <h3 className="text-lg font-bold mb-3">{ticketId || "No Ticket ID"}</h3>

      {/* Existing DB fields */}
      <div className="grid grid-cols-2 gap-4 mb-2">
        <div>
          <label className="text-sm">First Name:</label>
          <input
            className="w-full border border-gray-300 rounded px-2 py-1 text-black"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm">Last Name:</label>
          <input
            className="w-full border border-gray-300 rounded px-2 py-1 text-black"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-2">
        <div>
          <label className="text-sm">Event Title:</label>
          <input
            className="w-full border border-gray-300 rounded px-2 py-1 text-black"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm">Event Location:</label>
          <input
            className="w-full border border-gray-300 rounded px-2 py-1 text-black"
            value={eventLocation}
            onChange={(e) => setEventLocation(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-2">
        <div>
          <label className="text-sm">Row:</label>
          <input
            className="w-full border border-gray-300 rounded px-2 py-1 text-black"
            value={row}
            onChange={(e) => setRow(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm">Section:</label>
          <input
            className="w-full border border-gray-300 rounded px-2 py-1 text-black"
            value={section}
            onChange={(e) => setSection(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-2">
        <label className="text-sm">Note:</label>
        <input
          className="w-full border border-gray-300 rounded px-2 py-1 text-black"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="bg-white/10 p-4 rounded-md mb-6">
        <h3 className="text-lg font-bold mb-3">{ticketId || "No Ticket ID"}</h3>

        {/* ✅ Email or Mobile - Click to Edit */}
        <div className="mb-4">
          <label className="block font-medium text-sm mb-1">
            Email or Mobile:
          </label>
          <input
            type="text"
            value={emailOrMobile}
            onChange={(e) => setEmailOrMobile(e.target.value)}
            onClick={() => setIsEditingEmail(true)}
            readOnly={!isEditingEmail}
            className={`w-full border border-gray-300 rounded-md px-3 py-2 text-gray-800 ${
              isEditingEmail ? "bg-white" : "bg-gray-200 cursor-pointer"
            }`}
          />
        </div>
        <div className="ticket-pdf bg-white py-4 px-6 rounded-lg mt-2">
          <p className="text-sm text-gray-700">
            Ticket PDF:{" "}
            {data.ticketPdfUrl ? (
              <a
                href={data.ticketPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline"
              >
                Download Ticket
              </a>
            ) : (
              "Not available"
            )}
          </p>
        </div>

        {/* ✅ Event Cover Image - Click to Edit */}
        <div className="mb-4">
          <label className="block font-medium text-sm mb-1">
            Event Cover Image:
          </label>
          <input
            type="text"
            value={eventCoverImage}
            onChange={(e) => setEventCoverImage(e.target.value)}
            onClick={() => setIsEditingCoverImage(true)}
            readOnly={!isEditingCoverImage}
            className={`w-full border border-gray-300 rounded-md px-3 py-2 text-gray-800 ${
              isEditingCoverImage ? "bg-white" : "bg-gray-200 cursor-pointer"
            }`}
            placeholder="Enter image URL"
          />
          {eventCoverImage && (
            <div className="mt-2">
              <img
                src={eventCoverImage}
                alt="Event Cover"
                className="w-full max-h-40 object-cover rounded-md border"
              />
            </div>
          )}
        </div>

        {/* ✅ Event Date & Time - Click to Edit */}
        <div className="mb-4">
          <label className="block font-medium text-sm mb-1">
            Event Date & Time:
          </label>
          <input
            type="text"
            value={eventDateTime}
            onChange={(e) => setEventDateTime(e.target.value)}
            onClick={() => setIsEditingEventTime(true)}
            readOnly={!isEditingEventTime}
            className={`w-full border border-gray-300 rounded-md px-3 py-2 text-gray-800 ${
              isEditingEventTime ? "bg-white" : "bg-gray-200 cursor-pointer"
            }`}
          />
        </div>
      </div>

      {/* seats array => multiple inputs */}
      <div className="mb-2">
        <p className="text-sm font-medium">Seats Numbers:</p>
        <div className="pl-4">
          {seats.map((seatVal, idx) => (
            <div key={idx} className="flex items-center mb-1">
              <label className="mr-2 text-sm">Seat {idx}:</label>
              <input
                className="border border-gray-300 rounded px-2 py-1 text-black"
                value={seatVal}
                onChange={(e) => handleSeatChange(idx, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 🔹 Artist Name Input */}
      <div className="mb-4">
        <label className="block font-medium mb-1">Artist Name:</label>
        <input
          type="text"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="Enter Artist Name"
          className="border border-gray-300 rounded-md p-3 w-full text-gray-900"
        />
      </div>
      <div>
        <label className="text-sm">Sender Full Name:</label>
        <input
          className="w-full border border-gray-300 rounded px-2 py-1 text-black"
          value={senderFullName}
          placeholder="this is for only client oh"
          onChange={(e) => setSenderFullName(e.target.value)}
        />
      </div>

      {/* 🔹 Tour Country Input */}
      <div className="mb-4">
        <label className="block font-medium mb-1">Tour Country:</label>
        <input
          type="text"
          value={tourCountry}
          onChange={(e) => setTourCountry(e.target.value)}
          placeholder="Enter Tour Country"
          className="border border-gray-300 rounded-md p-3 w-full text-gray-900"
        />
      </div>

      {/* Additional new fields */}
      <hr className="my-2 border-gray-500" />
      <p className="font-semibold mb-2">New Fields (Not in DB):</p>

      <div className="grid grid-cols-2 gap-4 mb-2">
        <div>
          <label className="text-sm">Quantity:</label>
          <input
            type="number"
            className="w-full border border-gray-300 rounded px-2 py-1 text-black"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm">Currency:</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded px-2 py-1 text-black"
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())} // Convert to uppercase
            placeholder="Enter currency (e.g., USD, NGN, EUR)"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-2">
        <div>
          <label className="text-sm">Price/Ticket</label>
          <input
            type="number"
            className="w-full border border-gray-300 rounded px-2 py-1 text-right text-black"
            step="0.01"
            value={pricePerTicket}
            onChange={(e) => setPricePerTicket(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm">Item Fee</label>
          <input
            type="number"
            className="w-full border border-gray-300 rounded px-2 py-1 text-right text-black"
            step="0.01"
            value={itemFee}
            onChange={(e) => setItemFee(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm">Processing Fee</label>
          <input
            type="number"
            className="w-full border border-gray-300 rounded px-2 py-1 text-right text-black"
            step="0.01"
            value={processingFee}
            onChange={(e) => setProcessingFee(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-2">
        <div>
          <label className="text-sm">Insurance Fee</label>
          <input
            type="number"
            className="w-full border border-gray-300 rounded px-2 py-1 text-right text-black"
            step="0.01"
            value={insuranceFee}
            onChange={(e) => setInsuranceFee(e.target.value)}
          />
        </div>
        <div className="col-span-2 flex flex-col justify-end">
          <label className="text-xs">
            (Insurance <strong>not</strong> added to total)
          </label>
        </div>
      </div>

      {/* Computed total */}
      <div className="bg-gray-800 text-right py-2 px-3 rounded-md mb-2">
        <span className="font-bold text-white">
          {currency} {total}
        </span>
      </div>

      {/* Send Button */}
      <div className="flex justify-end mt-2 space-x-4">
        <button
          onClick={handleSendEmail}
          disabled={loading || !isFormValid()}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-xs uppercase font-medium"
        >
          {loading ? "Sending..." : "Send Email"}
        </button>
        <button
          onClick={handleDeleteTransfer}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-xs uppercase font-medium"
        >
          Delete Transfer
        </button>
        <button
          onClick={handleSendTransferToClient}
          disabled={transferLoading || !senderFullName}
          className="bg-customBlue hover:bg-[#0139A7] text-white px-4 py-2 rounded text-xs uppercase font-medium"
        >
          {transferLoading ? "Sending…" : "Transfer to Client"}
        </button>
      </div>
    </div>
  );
}

export default ForYou;
