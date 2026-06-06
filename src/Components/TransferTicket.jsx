// src/components/TransferTicketForm.jsx
import React, { useState } from "react";
import { Toaster, toast } from "react-hot-toast";

export default function TransferTicketForm({ ticket }) {
  // 1) Initialize your form state from `ticket` or blank
  const [firstName, setFirstName] = useState(ticket.firstName || "");
  const [lastName, setLastName] = useState(ticket.lastName || "");
  const [emailOrMobile, setEmailOrMobile] = useState(ticket.emailOrMobile || "");
  const [note, setNote] = useState(ticket.note || "");
  const [seats, setSeats] = useState(ticket.seats || []);
  const [eventTitle] = useState(ticket.title || "");
  const [eventLocation] = useState(ticket.location || "");
  const [eventDateTime] = useState(ticket.dateTime || "");
  const [section] = useState(ticket.section || "");
  const [row] = useState(ticket.row || "");
  const [ticketId] = useState(ticket.id || "");
  // (add more fields here if your backend needs them...)
  const [loading, setLoading] = useState(false);

  // 2) Send form to your API
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        firstName,
        lastName,
        emailOrMobile,
        note,
        seats,
        eventTitle,
        eventLocation,
        eventDateTime,
        section,
        row,
        ticketId,
        // …and any other fields your back-end requires…
      };
      const res = await fetch("/send-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Tickets transferred successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to transfer tickets");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl w-full bg-white/10 backdrop-blur-md p-6 rounded-lg shadow-lg">
      <Toaster position="top-right" />
      <h2 className="text-2xl font-semibold mb-4">Transfer Tickets</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Email or Mobile</label>
            <input
              type="text"
              value={emailOrMobile}
              onChange={(e) => setEmailOrMobile(e.target.value)}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <hr className="border-gray-600" />

        <h3 className="text-lg font-medium">Ticket Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Event</label>
            <input
              type="text"
              value={eventTitle}
              readOnly
              className="mt-1 block w-full bg-gray-100 border border-gray-300 rounded-md p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Location</label>
            <input
              type="text"
              value={eventLocation}
              readOnly
              className="mt-1 block w-full bg-gray-100 border border-gray-300 rounded-md p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Date & Time</label>
            <input
              type="text"
              value={eventDateTime}
              readOnly
              className="mt-1 block w-full bg-gray-100 border border-gray-300 rounded-md p-2"
            />
          </div>
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium">Section</label>
              <input
                type="text"
                value={section}
                readOnly
                className="mt-1 block w-full bg-gray-100 border border-gray-300 rounded-md p-2"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium">Row</label>
              <input
                type="text"
                value={row}
                readOnly
                className="mt-1 block w-full bg-gray-100 border border-gray-300 rounded-md p-2"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Seats</label>
          <ul className="mt-1 list-disc pl-5 bg-gray-100 p-3 rounded-md">
            {seats.map((s, i) => (
              <li key={i} className="text-gray-800">
                Seat {s}
              </li>
            ))}
          </ul>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-md text-white font-medium transition ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-[#0139A7]"
          }`}
        >
          {loading ? "Sending…" : "Accept Tickets"}
        </button>
      </form>
    </div>
);
}
