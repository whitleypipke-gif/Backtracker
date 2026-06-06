import React, { useState } from "react";
import { db } from "../firebase.config";
import { collection, addDoc, setDoc, doc } from "firebase/firestore";
import { Toaster, toast } from "react-hot-toast";
function generateTicketId() {
  const twoDigits = Math.floor(Math.random() * 90 + 10).toString(); // 10-99
  const fiveDigits = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0"); // 00000-99999
  const firstLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
  const secondLetter = String.fromCharCode(97 + Math.floor(Math.random() * 26)); // a-z
  const singleDigit = Math.floor(Math.random() * 10).toString();

  return `${twoDigits}${fiveDigits}${firstLetter}${secondLetter}${singleDigit}`;
}

// Helper function to format date and time into a string like "Mon, Jun 9, 6:45 PM"
function formatDateTime(dateValue, timeValue) {
  // If either date or time is missing, return an empty string
  if (!dateValue || !timeValue) return "";

  // Create a combined Date object
  // dateValue is "YYYY-MM-DD", timeValue is "HH:mm"
  const combined = new Date(`${dateValue}T${timeValue}`);

  // Format options for day: "Mon, Jun 9"
  const dateOptions = { weekday: "short", month: "short", day: "numeric" };
  const datePart = combined.toLocaleDateString("en-US", dateOptions);

  // Format options for time: "6:45 PM"
  const timeOptions = { hour: "numeric", minute: "numeric", hour12: true };
  const timePart = combined.toLocaleTimeString("en-US", timeOptions);

  // Combine them into a single string
  // e.g. "Mon, Jun 9, 6:45 PM"
  return `${datePart}, ${timePart}`;
}

const AddTicket = () => {
  const [ticketTitle, setTicketTitle] = useState("");
  const [dateValue, setDateValue] = useState(""); // For type="date"
  const [timeValue, setTimeValue] = useState(""); // For type="time"
  const [location, setLocation] = useState("");
  const [ticketQuantity, setTicketQuantity] = useState("");
  const [coverImage, setCoverImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [admissionType, setAdmissionType] = useState("");
  const [section, setSection] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const [forSale, setForSale] = useState(false); // new

  const [ticketHeader, setTicketHeader] = useState("");
  const [row, setRow] = useState(""); // New: Row input
  const [seatNumber, setSeatNumber] = useState(""); // New: Seat Number input
  // Cloudinary config (use your own details)
  const cloudinaryUploadUrl =
    "https://api.cloudinary.com/v1_1/domlob3pr/image/upload";
  const cloudinaryUploadPreset = "Ticket";

  // Handle image upload to Cloudinary
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

  // Handle the entire ticket creation
  const handleUpload = async () => {
    // Basic validations
    if (
      !ticketHeader ||
      !ticketTitle ||
      !dateValue ||
      !timeValue ||
      !location ||
      !lat ||
      !lng ||
      !ticketQuantity ||
      !coverImage
    ) {
      setError("Please fill in all fields, including the cover image.");
      toast.error("All fields are required!");
      return;
    }

    setUploading(true);
    setError("");

    try {
      // 1) Upload cover image to Cloudinary
      const imageUrl = await uploadImageToCloudinary(coverImage);
      if (!imageUrl) {
        setUploading(false);
        return;
      }

      // 2) Format the date/time into a single string
      const formattedDateTime = formatDateTime(dateValue, timeValue);
      const customTicketId = generateTicketId();
      await setDoc(doc(db, "tickets", customTicketId), {
        ticketHeader,
        title: ticketTitle,
        dateTime: formattedDateTime,
        location,
        quantity: ticketQuantity,
        row, // Save row to Firestore
        seatNumber, // Save seat number to Firestore
        forSale,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        coverImage: imageUrl,
        admissionType, // ✅ New field
        section, // ✅ New field
        createdAt: new Date(),
      });

      toast.success("Ticket added successfully!");

      // Reset form fields
      setTicketTitle("");
      setDateValue("");
      setTicketHeader("");
      setTimeValue("");
      setLocation("");
      setLat("");
      setLng("");

      setTicketQuantity("");
      setRow("");
      setSeatNumber("");
      setAdmissionType("");
      setForSale(false); // Reset forSale state
      setCoverImage(null);
      setPreviewUrl(null);
    } catch (err) {
      console.error("Error uploading data:", err);
      setError("Error adding ticket.");
      toast.error("Error adding ticket to Firestore");
    }

    setUploading(false);
  };

  // Handle cover image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError("");
    }
  };

  // Remove currently selected image
  const removeImage = () => {
    setCoverImage(null);
    setPreviewUrl(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-gray-100 flex flex-col items-center py-10 px-4">
      {/* React Hot Toast */}
      <Toaster position="top-right" reverseOrder={false} />

      <div className="bg-white/10 backdrop-blur-md shadow-2xl rounded-xl p-6 w-full max-w-lg">
        <h2 className="text-3xl font-bold mb-6 text-center">Add New Ticket</h2>

        {error && <p className="text-red-400 text-center mb-4">{error}</p>}

        {/* Ticket Title */}
        <div className="mb-4">
          <label className="block font-medium mb-1">Ticket Header:</label>
          <input
            type="text"
            value={ticketHeader}
            onChange={(e) => setTicketHeader(e.target.value)}
            placeholder="Enter ticket header"
            className="border border-gray-300 rounded-md p-3 w-full text-gray-900 focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-1">Ticket Title:</label>
          <input
            type="text"
            value={ticketTitle}
            onChange={(e) => setTicketTitle(e.target.value)}
            placeholder="Enter ticket title"
            className="
              border 
              border-gray-300 
              rounded-md 
              p-3 
              w-full 
              text-gray-900
              focus:ring-2 
              focus:ring-blue-400
            "
          />
        </div>

        {/* Date & Time (two separate inputs) */}
        <div className="mb-4 flex gap-2">
          <div className="flex-1">
            <label className="block font-medium mb-1">Select Date:</label>
            <input
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="
                border 
                border-gray-300 
                rounded-md 
                p-3 
                w-full 
                text-gray-900
                focus:ring-2 
                focus:ring-blue-400
              "
            />
          </div>
          <div className="flex-1">
            <label className="block font-medium mb-1">Select Time:</label>
            <input
              type="time"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              className="
                border 
                border-gray-300 
                rounded-md 
                p-3 
                w-full 
                text-gray-900
                focus:ring-2 
                focus:ring-blue-400
              "
            />
          </div>
        </div>
        {/* For Sale Checkbox */}
        <div className="mb-4 flex items-center">
          <input
            type="checkbox"
            id="forSale"
            checked={forSale}
            onChange={(e) => setForSale(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="forSale" className="text-sm font-medium">
            For Sale
          </label>
        </div>

        {/* Location */}
        <div className="mb-4">
          <label className="block font-medium mb-1">Location:</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Event venue/location"
            className="
              border 
              border-gray-300 
              rounded-md 
              p-3 
              w-full 
              text-gray-900
              focus:ring-2 
              focus:ring-blue-400
            "
          />
        </div>

        {/* Ticket Quantity */}
        <div className="mb-4">
          <label className="block font-medium mb-1">Ticket Quantity:</label>
          <input
            type="number"
            value={ticketQuantity}
            onChange={(e) => setTicketQuantity(e.target.value)}
            placeholder="Number of tickets available"
            className="
              border 
              border-gray-300 
              rounded-md 
              p-3 
              w-full 
              text-gray-900
              focus:ring-2 
              focus:ring-blue-400
            "
          />
        </div>
        {/* Admission Type */}
        <div className="mb-4">
          <label className="block font-medium mb-1">Admission Type:</label>
          <input
            type="text"
            value={admissionType}
            onChange={(e) => setAdmissionType(e.target.value)}
            placeholder="General Admission, VIP"
            className="
      border 
      border-gray-400 
      rounded-md 
      p-3 
      w-full 
      text-gray-900
      focus:ring-2 
      focus:ring-blue-400
    "
          />
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-1">Row:</label>
          <input
            type="text"
            value={row}
            onChange={(e) => setRow(e.target.value)}
            placeholder="Enter row"
            className="border border-gray-400 rounded-md p-3 w-full text-gray-900 focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* New: Seat Number */}
        <div className="mb-4">
          <label className="block font-medium mb-1">Seat Number:</label>
          <input
            type="text"
            value={seatNumber}
            onChange={(e) => setSeatNumber(e.target.value)}
            placeholder="Enter seat number"
            className="border border-gray-400 rounded-md p-3 w-full text-gray-900 focus:ring-2 focus:ring-blue-400"
          />
        </div>
        {/* Latitude */}
        <div className="mb-4">
          <label className="block font-medium mb-1">
            Latitude: this is for the map
          </label>
          <input
            type="number"
            step="any"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="e.g. 6.5244"
            className="
              border 
              border-gray-400 
              rounded-md 
              p-3 
              w-full 
              text-gray-900
              focus:ring-2 
              focus:ring-blue-400
            "
          />
        </div>

        {/* Longitude */}
        <div className="mb-4">
          <label className="block font-medium mb-1">
            Longitude: this is for the map
          </label>
          <input
            type="number"
            step="any"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="e.g. 3.3792"
            className="
              border 
              border-gray-400 
              rounded-md 
              p-3 
              w-full 
              text-gray-900
              focus:ring-2 
              focus:ring-blue-400
            "
          />
        </div>

        {/* Section */}
        <div className="mb-4">
          <label className="block font-medium mb-1">Section:</label>
          <input
            type="text"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            placeholder="GA, VIP"
            className="
      border 
      border-gray-400 
      rounded-md 
      p-3 
      w-full 
      text-gray-900
      focus:ring-2 
      focus:ring-blue-400
    "
          />
        </div>

        {/* Cover Image */}
        <div className="mb-4">
          <label className="block font-medium mb-1">Cover Image:</label>
          <div className="flex items-center space-x-2">
            {/* Hidden file input */}
            <input
              type="file"
              id="coverImageFile"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <label
              htmlFor="coverImageFile"
              className="
                inline-block 
                bg-blue-600 
                hover:bg-[#0139A7] 
                text-white 
                px-4 
                py-2 
                rounded-md 
                cursor-pointer 
                transition
              "
            >
              Choose File
            </label>
            <span className="text-sm text-gray-400">
              {coverImage ? coverImage.name : "No file chosen"}
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
              className="
                absolute 
                top-2 
                right-2 
                bg-red-600 
                text-white 
                rounded-md 
                px-2 
                py-1
                shadow-md 
                transition
                opacity-80
                hover:opacity-100
              "
            >
              Remove
            </button>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleUpload}
          disabled={uploading}
          className={`
            w-full 
            py-3 
            rounded-md 
            font-semibold 
            text-white 
            mt-4
            ${
              uploading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-[#0139A7]"
            }
          `}
        >
          {uploading ? "Uploading..." : "Add Ticket"}
        </button>
      </div>
    </div>
  );
};

export default AddTicket;