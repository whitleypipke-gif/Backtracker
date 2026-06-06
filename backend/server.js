// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const nodemailer = require("nodemailer");
// // in your send-mail handler
// const buildTicketTransferEmail = require("./ticketTransferEmail");
// const app = express();
// app.use(cors());
// app.use(express.json());

// UPDATE FOR ABOVE
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const buildTicketTransferEmail = require("./ticketTransferEmail");

const app = express();

// CHANGE: Fail fast if required email credentials are missing.
// This prevents the server from starting successfully and then failing later during sendMail().
const requiredEnv = ["EMAIL", "PASSWORD"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

// CHANGE: Restrict CORS when CLIENT_URL is configured.
// Use comma-separated values for multiple frontends, e.g.
// CLIENT_URL=http://localhost:3000,https://yourdomain.com
const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server requests, curl, Postman, and same-origin requests.
      if (!origin) return callback(null, true);

      // If CLIENT_URL is not configured, keep existing dev behavior.
      if (allowedOrigins.length === 0) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(new Error("Not allowed by CORS"));
    },
  }),
);

// CHANGE: Add a JSON body limit to reduce abuse from oversized payloads.
app.use(express.json({ limit: "100kb" }));

// CHANGE: Basic email regex for recipient validation.
// This is not a perfect RFC validator, but it catches bad input before Nodemailer.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// CHANGE: Small dependency-free rate limiter for email routes.
// For production at scale, replace this with Redis-backed rate limiting.
const rateLimitStore = new Map();
const EMAIL_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const EMAIL_RATE_LIMIT_MAX = Number(process.env.EMAIL_RATE_LIMIT_MAX || 20);

function emailRateLimit(req, res, next) {
  const now = Date.now();
  const key = `${req.ip}:${req.path}`;
  const current = rateLimitStore.get(key) || {
    count: 0,
    resetAt: now + EMAIL_RATE_LIMIT_WINDOW_MS,
  };

  if (now > current.resetAt) {
    current.count = 0;
    current.resetAt = now + EMAIL_RATE_LIMIT_WINDOW_MS;
  }

  current.count += 1;
  rateLimitStore.set(key, current);

  if (current.count > EMAIL_RATE_LIMIT_MAX) {
    return res.status(429).json({
      success: false,
      message: "Too many email requests. Please try again later.",
    });
  }

  return next();
}

// CHANGE: Clean old rate-limit entries so the in-memory map does not grow forever.
setInterval(() => {
  const now = Date.now();

  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, EMAIL_RATE_LIMIT_WINDOW_MS).unref?.();

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });
}

function cleanText(value, fieldName, errors, options = {}) {
  const { required = true, max = 300 } = options;
  const text = String(value ?? "").trim();

  if (required && !text) {
    errors.push(`${fieldName} is required.`);
    return text;
  }

  if (text && max && text.length > max) {
    errors.push(`${fieldName} must be ${max} characters or fewer.`);
  }

  return text;
}

function normalizeEmail(value, fieldName, errors) {
  const email = cleanText(value, fieldName, errors, {
    required: true,
    max: 254,
  });

  if (email && !EMAIL_REGEX.test(email)) {
    errors.push(`${fieldName} must be a valid email address.`);
  }

  return email;
}

function toInteger(value, fieldName, errors, options = {}) {
  const { min = 1 } = options;
  const number = Number.parseInt(value, 10);

  if (!Number.isInteger(number) || number < min) {
    errors.push(
      `${fieldName} must be an integer greater than or equal to ${min}.`,
    );
    return min;
  }

  return number;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function toMoney(value, fieldName, errors, options = {}) {
  const { required = true, min = 0 } = options;

  if ((value === undefined || value === null || value === "") && !required) {
    return 0;
  }

  const number = Number.parseFloat(value);

  if (!Number.isFinite(number) || number < min) {
    errors.push(
      `${fieldName} must be a number greater than or equal to ${min}.`,
    );
    return 0;
  }

  return roundMoney(number);
}

function formatMoney(value) {
  return Number(value).toFixed(2);
}

function normalizeSeats(value) {
  if (Array.isArray(value)) {
    return value.map((seat) => String(seat ?? "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((seat) => seat.trim())
      .filter(Boolean);
  }

  if (value === undefined || value === null) {
    return [];
  }

  return [String(value).trim()].filter(Boolean);
}

function getAllowedHosts(envKey) {
  return (process.env[envKey] || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeHttpUrl(value, fieldName, errors, options = {}) {
  const { required = true, allowedHostsEnv } = options;
  const raw = String(value ?? "").trim();

  if (!raw) {
    if (required) errors.push(`${fieldName} is required.`);
    return "";
  }

  let url;

  try {
    url = new URL(raw);
  } catch {
    errors.push(`${fieldName} must be a valid URL.`);
    return "";
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    errors.push(`${fieldName} must use http or https.`);
    return "";
  }

  const allowedHosts = allowedHostsEnv ? getAllowedHosts(allowedHostsEnv) : [];

  if (
    allowedHosts.length > 0 &&
    !allowedHosts.includes(url.hostname.toLowerCase())
  ) {
    errors.push(`${fieldName} host is not allowed.`);
    return "";
  }

  return url.toString();
}

function buildTicketPdfDownloadUrl(rawUrl, errors) {
  const normalized = normalizeHttpUrl(rawUrl, "ticketPdfUrl", errors, {
    required: true,

    // CHANGE: Optional allowlist.
    // Add ALLOWED_TICKET_HOSTS=yourcdn.com,storage.googleapis.com if you want to restrict ticket URLs.
    allowedHostsEnv: "ALLOWED_TICKET_HOSTS",
  });

  if (!normalized) return "";

  const url = new URL(normalized);

  // CHANGE: Handles URLs that already have query params.
  url.searchParams.set("fl_attachment", "true");
  url.searchParams.set("filename", "ticket.pdf");

  return url.toString();
}

function buildAcceptUrl(ticketId) {
  if (!process.env.APP_URL) {
    throw new Error(
      "Missing APP_URL environment variable for transfer accept URL.",
    );
  }

  return new URL(
    `/accept/${encodeURIComponent(ticketId)}`,
    process.env.APP_URL,
  ).toString();
}

function extractYear(value) {
  const match = String(value ?? "").match(/\b(19\d{2}|20\d{2})\b/);
  return match ? match[0] : new Date().getFullYear();
}

function validateTicketPayload(body) {
  const errors = [];

  const emailOrMobile = normalizeEmail(
    body.emailOrMobile,
    "emailOrMobile",
    errors,
  );
  const firstName = cleanText(body.firstName, "firstName", errors, { max: 80 });
  const eventTitle = cleanText(body.eventTitle, "eventTitle", errors, {
    max: 200,
  });
  const eventLocation = cleanText(body.eventLocation, "eventLocation", errors, {
    max: 200,
  });
  const eventDateTime = cleanText(body.eventDateTime, "eventDateTime", errors, {
    max: 120,
  });
  const row = cleanText(body.row, "row", errors, { max: 40 });
  const artist = cleanText(body.artist, "artist", errors, { max: 120 });
  const tourCountry = cleanText(body.tourCountry, "tourCountry", errors, {
    max: 120,
  });
  const section = cleanText(body.section, "section", errors, { max: 80 });
  const currency = cleanText(body.currency, "currency", errors, { max: 8 });
  const ticketId = cleanText(body.ticketId, "ticketId", errors, { max: 120 });

  const eventCoverImage = normalizeHttpUrl(
    body.eventCoverImage,
    "eventCoverImage",
    errors,
    {
      required: true,

      // CHANGE: Optional allowlist.
      // Add ALLOWED_IMAGE_HOSTS=image.mailing.ticketmaster.com,yourcdn.com if needed.
      allowedHostsEnv: "ALLOWED_IMAGE_HOSTS",
    },
  );

  const ticketPdfDownloadUrl = buildTicketPdfDownloadUrl(
    body.ticketPdfUrl,
    errors,
  );

  const quantity = toInteger(body.quantity, "quantity", errors, { min: 1 });
  const pricePerTicket = toMoney(body.pricePerTicket, "pricePerTicket", errors);
  const itemFee = toMoney(body.itemFee, "itemFee", errors);
  const processingFee = toMoney(body.processingFee, "processingFee", errors);
  const insuranceFee = toMoney(body.insuranceFee, "insuranceFee", errors, {
    required: false,
  });

  const seatsArray = normalizeSeats(body.seats);

  if (seatsArray.length === 0) {
    errors.push("seats must contain at least one seat.");
  }

  if (seatsArray.length > 0 && seatsArray.length !== quantity) {
    errors.push("quantity must match the number of seats.");
  }

  for (const seat of seatsArray) {
    if (seat.length > 40) {
      errors.push("Each seat value must be 40 characters or fewer.");
      break;
    }
  }

  // CHANGE: Server-side total calculation.
  // This matches the Payment Summary section: ticket price + item fees + processing fee.
  // Insurance is shown in a separate insurance section in your existing template.
  const calculatedTotal = roundMoney(
    pricePerTicket * quantity + itemFee * quantity + processingFee,
  );

  if (body.total !== undefined && body.total !== null && body.total !== "") {
    const providedTotal = toMoney(body.total, "total", errors);

    if (Math.abs(providedTotal - calculatedTotal) > 0.01) {
      errors.push("total does not match the server-calculated order total.");
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    data: {
      emailOrMobile,
      firstName,
      eventTitle,
      eventLocation,
      eventDateTime,
      row,
      artist,
      tourCountry,
      section,
      seatsArray,
      quantity,
      currency,
      pricePerTicket,
      itemFee,
      processingFee,
      insuranceFee,
      ticketId,
      ticketPdfDownloadUrl,
      eventCoverImage,
      total: calculatedTotal,
    },
  };
}

function validateTransferPayload(body) {
  const errors = [];

  const emailOrMobile = normalizeEmail(
    body.emailOrMobile,
    "emailOrMobile",
    errors,
  );
  const firstName = cleanText(body.firstName, "firstName", errors, { max: 80 });
  const senderFullName = cleanText(
    body.senderFullName,
    "senderFullName",
    errors,
    {
      max: 160,
    },
  );
  const eventTitle = cleanText(body.eventTitle, "eventTitle", errors, {
    max: 200,
  });
  const eventLocation = cleanText(body.eventLocation, "eventLocation", errors, {
    max: 200,
  });
  const eventDateTime = cleanText(body.eventDateTime, "eventDateTime", errors, {
    max: 120,
  });
  const section = cleanText(body.section, "section", errors, { max: 80 });
  const row = cleanText(body.row, "row", errors, { max: 40 });
  const ticketId = cleanText(body.ticketId, "ticketId", errors, { max: 120 });
  const quantity = toInteger(body.quantity, "quantity", errors, { min: 1 });

  const seatsArray = normalizeSeats(body.seats);

  if (seatsArray.length > 0 && seatsArray.length !== quantity) {
    errors.push("quantity must match the number of seats.");
  }

  return {
    ok: errors.length === 0,
    errors,
    data: {
      emailOrMobile,
      firstName,
      senderFullName,
      eventTitle,
      eventLocation,
      eventDateTime,
      quantity,
      section,
      row,
      seatsArray,
      ticketId,
    },
  };
}

// UPDATE IS ABOVE: END

// Nodemailer Transporter (Using Gmail SMTP)
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL, // Your Gmail address
//     pass: process.env.PASSWORD, // App Password (Recommended)
//   },
// });

// UPDATE FOR ABOVE
// CHANGE: Nodemailer transporter with startup verification.
// Gmail SMTP can still throttle/block production-like traffic, but this catches bad credentials early.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error("Email transporter verification failed:", error);
  } else {
    console.log("Email transporter is ready.");
  }
});

// UPDATE IS ABOVE: END

// app.post("/send-ticket", async (req, res) => {

// UPDATE FOR ABOVE

app.post("/send-ticket", emailRateLimit, async (req, res) => {
  // UPDATE IS ABOVE: END
  try {
    // // 1) Pull dynamic fields from the request body
    // const {
    //   emailOrMobile,
    //   firstName,
    //   lastName,
    //   eventTitle,
    //   eventLocation,
    //   eventDateTime,
    //   row,
    //   eventCoverImage,
    //   artist, // ✅ Artist Name
    //   tourCountry, // ✅ Tour Country
    //   section,
    //   seats, // array of seat numbers
    //   quantity,
    //   currency,
    //   pricePerTicket,
    //   itemFee,
    //   processingFee,
    //   insuranceFee,
    //   ticketId,
    //   ticketPdfUrl, // Add the ticket PDF URL here
    //   total,
    // } = req.body;

    // // 2) Convert numeric strings to actual numbers (and format to 2 decimals)
    // const qtyNum = parseInt(quantity, 10) || 1;
    // const pricePerTicketNum = parseFloat(pricePerTicket) || 0;
    // const itemFeeNum = parseFloat(itemFee) || 0;
    // const processingFeeNum = parseFloat(processingFee) || 0;
    // const insuranceFeeNum = parseFloat(insuranceFee) || 0;
    // const totalNum = parseFloat(total) || 0;

    // // Format everything to 2 decimals
    // const pricePerTicketFmt = pricePerTicketNum.toFixed(2);
    // const itemFeeFmt = itemFeeNum.toFixed(2);
    // const processingFeeFmt = processingFeeNum.toFixed(2);
    // const insuranceFeeFmt = insuranceFeeNum.toFixed(2);
    // const totalFmt = totalNum.toFixed(2);

    // // Pre-calculate line-item multiples
    // const pricePerTicketTotal = (pricePerTicketNum * qtyNum).toFixed(2);
    // const itemFeeTotal = (itemFeeNum * qtyNum).toFixed(2);

    // // 3) Build the seat rows dynamically for each seat in seats array
    // // If seats is not an array, convert or handle gracefully
    // const seatsArray = Array.isArray(seats) ? seats : [seats];
    // const seatRowsHtml = seatsArray
    //   .map((seat) => {
    //     return `
    //     <tr>
    //       <td style="padding:10px 0px;width:40%">
    //         <table cellspacing="0" cellpadding="0" border="0" align="left">
    //           <tbody>
    //             <tr>
    //               <td style="font-weight:bold;font-size:12px;line-height:14px;color:rgb(1,80,167)">SECTION</td>
    //             </tr>
    //             <tr>
    //               <td>${section}</td>
    //             </tr>
    //           </tbody>
    //         </table>
    //       </td>
    //       <td style="padding:10px 0px">
    //         <table cellspacing="0" cellpadding="0" border="0" align="left">
    //           <tbody>
    //             <tr>
    //               <td style="font-weight:bold;font-size:12px;line-height:14px;padding-left:5px;border-left:1px solid #EBEBEB;color:rgb(1,80,167)">ROW</td>
    //             </tr>
    //             <tr>
    //               <td style="padding-left:5px;border-left:1px solid #EBEBEB">${row}</td>
    //             </tr>
    //           </tbody>
    //         </table>
    //       </td>
    //       <td style="padding:10px 0px;width:35%">
    //         <table cellspacing="0" cellpadding="0" border="0" align="left">
    //           <tbody>
    //             <tr>
    //               <td style="font-weight:bold;font-size:12px;line-height:14px;padding-left:5px;border-left:1px solid #EBEBEB;color:rgb(1,80,167)">SEAT</td>
    //             </tr>
    //             <tr>
    //               <td style="padding-left:5px;border-left:1px solid #EBEBEB">${seat}</td>
    //             </tr>
    //           </tbody>
    //         </table>
    //       </td>
    //     </tr>
    //     `;
    //   })
    //   .join("");

    // UPDATE FOR ABOVE
    // CHANGE: Validate and normalize all user-controlled input before building HTML.
    const validation = validateTicketPayload(req.body);

    if (!validation.ok) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket payload.",
        errors: validation.errors,
      });
    }

    const payload = validation.data;

    // CHANGE: Keep plain text values for email headers/subject.
    const emailOrMobile = payload.emailOrMobile;
    const firstNamePlain = payload.firstName;
    const artistPlain = payload.artist;
    const tourCountryPlain = payload.tourCountry;
    const confirmationYear = extractYear(payload.eventDateTime);

    // CHANGE: Escape values before inserting them into HTML.
    const firstName = escapeHtml(payload.firstName);
    const eventTitle = escapeHtml(payload.eventTitle);
    const eventLocation = escapeHtml(payload.eventLocation);
    const eventDateTime = escapeHtml(payload.eventDateTime);
    const row = escapeHtml(payload.row);
    const eventCoverImage = escapeHtml(payload.eventCoverImage);
    const section = escapeHtml(payload.section);
    const currency = escapeHtml(payload.currency);
    const ticketId = escapeHtml(payload.ticketId);
    const ticketPdfDownloadUrl = escapeHtml(payload.ticketPdfDownloadUrl);

    const seatsArray = payload.seatsArray.map(escapeHtml);

    const qtyNum = payload.quantity;
    const pricePerTicketNum = payload.pricePerTicket;
    const itemFeeNum = payload.itemFee;
    const processingFeeNum = payload.processingFee;
    const insuranceFeeNum = payload.insuranceFee;
    const totalNum = payload.total;

    // CHANGE: Format all displayed money values consistently.
    const pricePerTicketFmt = formatMoney(pricePerTicketNum);
    const itemFeeFmt = formatMoney(itemFeeNum);
    const processingFeeFmt = formatMoney(processingFeeNum);
    const insuranceFeeFmt = formatMoney(insuranceFeeNum);
    const totalFmt = formatMoney(totalNum);

    // CHANGE: Calculate line totals on the server instead of trusting frontend totals.
    const pricePerTicketTotal = formatMoney(pricePerTicketNum * qtyNum);
    const itemFeeTotal = formatMoney(itemFeeNum * qtyNum);

    // CHANGE: Build seat rows only after seat values have been validated and escaped.
    const seatRowsHtml = seatsArray
      .map((seat) => {
        return `
      <tr>
        <td style="padding:10px 0px;width:40%">
          <table cellspacing="0" cellpadding="0" border="0" align="left">
            <tbody>
              <tr>
                <td style="font-weight:bold;font-size:12px;line-height:14px;color:rgb(1,80,167)">SECTION</td>
              </tr>
              <tr>
                <td>${section}</td>
              </tr>
            </tbody>
          </table>
        </td>
        <td style="padding:10px 0px">
          <table cellspacing="0" cellpadding="0" border="0" align="left">
            <tbody>
              <tr>
                <td style="font-weight:bold;font-size:12px;line-height:14px;padding-left:5px;border-left:1px solid #EBEBEB;color:rgb(1,80,167)">ROW</td>
              </tr>
              <tr>
                <td style="padding-left:5px;border-left:1px solid #EBEBEB">${row}</td>
              </tr>
            </tbody>
          </table>
        </td>
        <td style="padding:10px 0px;width:35%">
          <table cellspacing="0" cellpadding="0" border="0" align="left">
            <tbody>
              <tr>
                <td style="font-weight:bold;font-size:12px;line-height:14px;padding-left:5px;border-left:1px solid #EBEBEB;color:rgb(1,80,167)">SEAT</td>
              </tr>
              <tr>
                <td style="padding-left:5px;border-left:1px solid #EBEBEB">${seat}</td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    `;
      })
      .join("");

    // UPDATE IS ABOVE: END

    // 4) Prepare the email details
    const mailOptions = {
      from: `"TicketMaster" <${process.env.EMAIL}>`, // 👈 Custom sender name
      to: emailOrMobile, // dynamic from front end

      // Subject: firstName + " this is the email confirmation, You’re in!"
      // subject: `${firstName},  You're in! Your ${artist} - ${tourCountry} Tour ticket confirmation 2025`,

      // UPDATE FOR ABOVE
      // CHANGE: Use plain text in the subject and derive the year dynamically.
      subject: `${firstNamePlain}, You're in! Your ${artistPlain} - ${tourCountryPlain} Tour ticket confirmation ${confirmationYear}`,

      // UPDATE IS ABOVE: END

      // 5) Insert dynamic data into the HTML
      html: `
        <div><br>
          <div class="gmail_quote gmail_quote_container">
            <div><br>
              <div class="gmail_quote">
                <div>
                  <div style="text-align: center;">
                    <img
                    src="https://image.mailing.ticketmaster.com/lib/fea015737460007f75/m/26/81d94a4c-1171-4900-992c-8a049f9d7ffc.png" width="135" height="20" border="0" alt="Ticketmaster" style="displayo:block; margin:0 auto;">
                    <br>
                  </div>
                <div>
                <table cellpadding=" 0" cellspacing="0" border="0" width="467">
                  <tbody>
                    <tr>
                      <td width="447" align="center" style="min-width:447px;padding:0px 10px">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tbody>
                            <tr>
                              <td align="center" style="padding:10px 0px 5px;" height="43">&nbsp;</td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table cellpadding="0" cellspacing="0" border="0" width="467">
                  <tbody>
                    <tr>
                      <td width="447" align="center" style="min-width:447px;padding:0px 10px">
                        <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="min-width:100%">
                          <tbody>
                            <tr>
                              <td>
                                <table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff">
                                  <tbody>
                                    <tr>
                                      <td style="border-width:1px 1px 0px;border-style:solid background:url('https://image.mailing.ticketmaster.com/lib/fe9e15747366047975/m/1/b58a380c-2533-49ff-b916-3059814c1503.png') center top no-repeat rgb(0,45,161);border-color:rgb(191,191,191) rgb(191,191,191)">
                                        <table width="100%" cellspacing="0" cellpadding="0" border="0" align="center">
                                          <tbody>
                                            <tr>
                                              <td style="padding:26px 16px 5px;text-align:center;color:rgb(255,255,255)">
                                                <!-- Only firstName here -->
                                                <h1 dir="auto">${firstName}, You're In!</h1>
                                              </td>
                                            </tr>
                                            <tr>
                                              <td style="padding:0px 16px 22px;text-align:center;color:rgb(255,255,255)">
                                                <a href="#" style="text-decoration:none" target="_blank">
                                                  <font style="color:rgb(255,255,255)">Order #${ticketId}</font>
                                                </a>
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table cellpadding="0" cellspacing="0" border="0" width="467">
                      <tbody>
                        <tr>
                          <td width="447" align="center" style="min-width:447px;padding:0px 10px">
                            <table cellpadding="0" cellspacing="0" width="100%" role="presentation"
                              style="min-width:100%">
                              <tbody>
                                <tr>
                                  <td>
                                    <!-- START MAIN TICKET BOX -->
                                    <table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff">
                                      <tbody>
                                        <tr>
                                          <td
                                            style="border-width:0px 1px 1px;border-style:none solid solid;border-color:currentcolor rgb(191,191,191) rgb(191,191,191)">
                                            <table width="100%" cellspacing="0" cellpadding="0" border="0"
                                              align="center">
                                              <tbody>
                                                <tr>
                                                  <td>
                                                    <table width="100%" cellspacing="0" cellpadding="0" border="0"
                                                      align="center">
                                                      <tbody>
                                                        <tr>
                                                          <td>
                                                            <table style="display:inline" width="215" cellspacing="0"
                                                              cellpadding="0" border="0" align="left" dir="auto">
                                                              <tbody>
                                                                <tr>
                                                                  <td
                                                                    style="padding:16px 0px 10px 16px;vertical-align:top;text-align:center"
                                                                    width="215">
                                                                    <!-- Event cover image -->
                                                                    <div>
                                                                      <img src="${eventCoverImage}"
                                                                        style="width:200px;max-width:100%">
                                                                    </div>
                                                                  </td>
                                                                </tr>
                                                              </tbody>
                                                            </table>
                                                            <table style="display:inline" width="200" cellspacing="0"
                                                              cellpadding="0" border="0" align="right" dir="auto">
                                                              <tbody>
                                                                <tr>
                                                                  <td style="vertical-align:top;padding-top:20px;"
                                                                    width="175">
                                                                    <table width="100%" cellspacing="0" cellpadding="0"
                                                                      border="0" align="left">
                                                                      <tbody>
                                                                        <tr>
                                                                          <!-- Event Title -->
                                                                          <td
                                                                            style="font-size:18px;line-height:22px;font-weight:bold;padding-left:16px;padding-right:16px">
                                                                            ${eventTitle}
                                                                          </td>
                                                                        </tr>
                                                                      </tbody>
                                                                    </table>
                                                                    <table width="100%" cellspacing="0" cellpadding="0"
                                                                      border="0" align="left">
                                                                      <tbody>
                                                                        <tr>
                                                                          <td style="padding:18px 10px 16px 16px"
                                                                            width="18" valign="top">
                                                                            <img
                                                                              src="https://image.mailing.ticketmaster.com/lib/fe9e15747366047975/m/1/e08ab839-29f0-4849-8f9f-39a1c73df875.png"
                                                                              width="16" height="21">
                                                                          </td>
                                                                          <!-- Location -->
                                                                          <td
                                                                            style="padding:16px 16px 16px 0px;font-size:14px;line-height:16px;text-align:left;vertical-align:middle">
                                                                            ${eventLocation}
                                                                          </td>
                                                                        </tr>
                                                                      </tbody>
                                                                    </table>
                                                                    <table width="100%" cellspacing="0" cellpadding="0"
                                                                      border="0" align="left">
                                                                      <tbody>
                                                                        <tr>
                                                                          <td style="padding:0px 10px 16px 16px"
                                                                            width="18" valign="top">
                                                                            <img
                                                                              src="https://image.mailing.ticketmaster.com/lib/fe9e15747366047975/m/1/eafb3c6f-15c2-4d46-a66e-84dede326386.png"
                                                                              width="18" height="18">
                                                                          </td>
                                                                          <!-- Date & Time -->
                                                                          <td
                                                                            style="padding:0px 16px 16px 0px;font-size:14px;line-height:16px;text-align:left;vertical-align:middle">
                                                                            ${eventDateTime}
                                                                          </td>
                                                                        </tr>
                                                                      </tbody>
                                                                    </table>
                                                                  </td>
                                                                </tr>
                                                              </tbody>
                                                            </table>
                                                          </td>
                                                        </tr>
                                                      </tbody>
                                                    </table>
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                          </td>
                                        </tr>

                                        <tr>
                                          <td
                                            style="border-width:0px 1px 1px;border-style:none solid solid;padding-bottom:16px;border-color:currentcolor rgb(191,191,191) rgb(191,191,191)">
                                            <table width="100%" cellspacing="0" cellpadding="0" border="0" align="left">
                                              <tbody>
                                                <tr>
                                                  <td style="padding:16px 16px 0px;font-size:18px;line-height:20px">
                                                    <b>Your Order</b>
                                                  </td>
                                                </tr>
                                                <tr>
                                                  <td>
                                                    <table style="display:inline" width="215" cellspacing="0"
                                                      cellpadding="0" border="0" align="left" dir="auto">
                                                      <tbody>
                                                        <tr>
                                                          <td style="padding:16px 5px 0px 16px;vertical-align:top"
                                                            width="30">
                                                            <img
                                                              src="https://image.mailing.ticketmaster.com/lib/fe9e15747366047975/m/1/f28e29a5-816c-456f-9be4-8003cbcd1218.png"
                                                              width="26" height="26">
                                                          </td>
                                                          <!-- quantity -->
                                                          <td style="padding:16px 16px 0px 0px"><b>${qtyNum}x</b> Mobile
                                                            Ticket
                                                          </td>
                                                        </tr>
                                                      </tbody>
                                                    </table>

                                                    <table style="display:inline" width="200" cellspacing="0"
                                                      cellpadding="0" border="0" align="right" dir="auto">
                                                      <tbody>
                                                        <tr>
                                                          <td style="padding:12px 16px 0px">
                                                            <!-- <a href="${ticketPdfUrl}?fl_attachment=true&filename=ticket.pdf" -->
                                                             <a href="${ticketPdfDownloadUrl}"
                                                              target="_blank"
                                                              style="text-decoration:none; display:inline-block;">
                                                              <table width="168" cellspacing="0" cellpadding="0"
                                                                border="0" align="right">
                                                                <tbody>
                                                                  <tr>
                                                                    <td
                                                                      style="padding:0px 30px;border-radius:2px;background-color:rgb(2,108,223);color:rgb(255,255,255)"
                                                                      height="37" align="center">
                                                                      <b>VIEW TICKETS</b>
                                                                    </td>
                                                                  </tr>
                                                                </tbody>
                                                              </table>
                                                            </a>

                                                          </td>
                                                        </tr>
                                                      </tbody>
                                                    </table>
                                                  </td>
                                                </tr>

                                                <!-- Display seat lines for each ticket -->
                                                <tr>
                                                  <td style="padding:16px 16px 0px">
                                                    <table width="100%" cellspacing="0" cellpadding="0" border="0"
                                                      align="left">
                                                      <tbody>
                                                        <!-- "Live Nation Presale  Ticket" label -->
                                                        <tr>
                                                          <td colspan="3"
                                                            style="padding:10px 0px;border-top:1px solid #BFBFBF;border-bottom:1px solid #EBEBEB">
                                                            Live Nation Presale ${section} Ticket
                                                          </td>
                                                        </tr>
                                                        <!-- Our dynamic seat rows -->
                                                        ${seatRowsHtml}

                                                        <!-- Price Level + currency -->
                                                        <tr>
                                                          <td colspan="3"
                                                            style="padding:10px 0px;border-top:1px solid #EBEBEB;font-size:12px;">
                                                            Price Level ${currency}${pricePerTicketFmt}, ${currency}
                                                          </td>
                                                        </tr>
                                                      </tbody>
                                                    </table>
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                          </td>
                                        </tr>

                                        <tr>
                                          <td style="height:30px;line-height:30px;">&nbsp;</td>
                                        </tr>
                                      </tbody>
                                    </table>

                                    <!-- Payment Summary Table -->
                                    <table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff">
                                      <tbody>
                                        <tr>
                                          <td style="padding:0px 16px">
                                            <table width="100%" cellspacing="0" cellpadding="0" border="0" align="left">
                                              <tbody>
                                                <tr>
                                                  <td style="text-align:center">
                                                    <b>THIS EMAIL CANNOT BE USED FOR ENTRY</b>
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>

                                    <table width="100%" cellspacing="0" cellpadding="0" border="0">
                                      <tbody>
                                        <tr>
                                          <td style="height:30px;line-height:30px">&nbsp;</td>
                                        </tr>
                                      </tbody>
                                    </table>

                                    <table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff">
                                      <tbody>
                                        <tr>
                                          <td style="border:1px solid #BFBFBF;padding:16px 16px 0px">
                                            <table width="100%" cellspacing="0" cellpadding="0" border="0" align="left">
                                              <tbody>
                                                <tr>
                                                  <td colspan="2"
                                                    style="padding-bottom:16px;font-size:18px;line-height:20px">
                                                    <b>Payment Summary</b>
                                                  </td>
                                                </tr>

                                                <tr>
                                                  <td style="padding-bottom:16px">
                                                    ${qtyNum} Live Nation Presale ${section} Ticket<br>
                                                    <font style="font-size:12px;color:rgb(100,100,100)">
                                                      ${currency} ${pricePerTicketFmt} x${qtyNum}
                                                    </font>

                                                  </td>
                                                  <td style="padding-left:10px;text-align:right;vertical-align:top">
                                                    ${currency} ${pricePerTicketTotal}
                                                  </td>
                                                </tr>

                                                <tr>
                                                  <td style="padding-bottom:16px">
                                                    Per Item Fees<br>
                                                    <font style="font-size:12px;color:rgb(100,100,100)">
                                                      ${currency} ${itemFeeFmt} (Service Charge) x${qtyNum}
                                                    </font>

                                                  </td>
                                                  <td style="padding-left:10px;text-align:right;vertical-align:top">
                                                    ${currency} ${itemFeeTotal}
                                                  </td>
                                                </tr>

                                                <tr>
                                                  <td style="padding-bottom:16px">
                                                    Order Processing Fees<br>
                                                    <font style="font-size:12px;color:rgb(100,100,100)">
                                                      Handling Fee (${currency} ${processingFeeFmt})
                                                    </font>

                                                  </td>
                                                  <td style="padding-left:10px;text-align:right;vertical-align:top">
                                                    ${currency} ${processingFeeFmt}
                                                  </td>
                                                </tr>

                                                <tr>
                                                  <td
                                                    style="padding-bottom:16px;border-top:1px solid #BFBFBF;padding-top:16px;font-size:18px;line-height:22px;">
                                                    <b>Total</b>
                                                  </td>
                                                  <td
                                                    style="width:110px;padding-left:10px;text-align:right;vertical-align:top;border-top:1px solid #BFBFBF;padding-top:16px;font-size:18px;line-height:22px;">
                                                    <b>${currency} ${totalFmt}</b>
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>

                                    <table width="100%" cellspacing="0" cellpadding="0" border="0">
                                      <tbody>
                                        <tr>
                                          <td style="height:30px;line-height:30px">&nbsp;</td>
                                        </tr>
                                      </tbody>
                                    </table>

                                    <!-- Insurance Fees -->
                                    <table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff">
                                      <tbody>
                                        <tr>
                                          <td style="border:1px solid #BFBFBF;padding:16px 16px 0px">
                                            <table width="100%" cellspacing="0" cellpadding="0" border="0" align="left">
                                              <tbody>
                                                <tr>
                                                  <td style="padding-bottom:16px;font-size:18px;line-height:20px">
                                                    <b>Your Tickets are Insured</b>
                                                  </td>
                                                  <td style="padding-left:10px;text-align:right;vertical-align:top">
                                                    <img
                                                      src="https://image.mailing.ticketmaster.com/lib/fe9e15747366047975/m/1/ae240c4e-0b6d-4ee4-95ee-c77de1753393.png"
                                                      width="20" height="20">
                                                  </td>
                                                </tr>
                                                <tr>
                                                  <td colspan="2" style="padding-bottom:16px">
                                                    Thank you for purchasing ticket insurance for this event, provided
                                                    by
                                                    Allianz Assistance.
                                                    <br><br>
                                                    If you have any questions regarding your insurance, or if you do not
                                                    receive
                                                    a confirmation email containing the details of your policy, please
                                                    contact
                                                    Allianz Assistance.
                                                  </td>
                                                </tr>
                                                <tr>
                                                  <td
                                                    style="padding-bottom:16px;border-top:1px solid #BFBFBF;padding-top:16px">
                                                    Missed Event Insurance
                                                  </td>
                                                  <td
                                                    style="padding-left:10px;text-align:right;vertical-align:top;border-top:1px solid #BFBFBF;padding-top:16px">
                                                    ${currency} ${insuranceFeeFmt}
                                                  </td>
                                                </tr>
                                                <tr>
                                                  <td
                                                    style="padding-bottom:16px;border-top:1px solid #BFBFBF;padding-top:16px;font-size:18px;line-height:22px">
                                                    <b>Total</b>
                                                  </td>
                                                  <td
                                                    style="padding-left:10px;text-align:right;vertical-align:top;border-top:1px solid #BFBFBF;padding-top:16px;font-size:18px;line-height:22px">
                                                    <b>${currency} ${insuranceFeeFmt}</b>
                                                  </td>
                                                </tr>
                                                <tr>
                                                  <td colspan="2" style="padding-bottom:16px">
                                                    <b>Payment:</b> VISA ${currency} ${insuranceFeeFmt}
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>

                                    <table width="100%" cellspacing="0" cellpadding="0" border="0">
                                      <tbody>
                                        <tr>
                                          <td style="height:30px;line-height:30px">&nbsp;</td>
                                        </tr>
                                      </tbody>
                                    </table>

                                    <table width="100%" cellspacing="0" cellpadding="0" border="0" align="left">
                                      <tbody>
                                        <tr>
                                          <td width="100%">
                                            <table width="100%" cellspacing="0" cellpadding="0" border="0"
                                              bgcolor="#f6f6f6" align="left">
                                              <tbody>
                                                <tr>
                                                  <td style="padding:23px 5px 12px 16px;vertical-align:top" width="35">
                                                    <img
                                                      src="https://image.mailing.ticketmaster.com/lib/fe9e15747366047975/m/1/d85fed21-50f9-40e5-b864-31f51db4e331.png"
                                                      width="26" height="28">
                                                  </td>
                                                  <td style="padding:30px 16px 30px 0px">
                                                    <table width="100%" cellspacing="0" cellpadding="0" border="0"
                                                      align="left">
                                                      <tbody>
                                                        <tr>
                                                          <td
                                                            style="padding-bottom:16px;font-size:18px;line-height:20px">
                                                            <b>Your Phone is Your Ticket</b>
                                                          </td>
                                                        </tr>
                                                        <tr>
                                                          <td>
                                                            Locate your tickets in your Ticketmaster account, or in your
                                                            app.
                                                            When you go mobile, your tickets will not be emailed to you
                                                            or
                                                            available for print.
                                                          </td>
                                                        </tr>
                                                      </tbody>
                                                    </table>
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>

                                    <table width="100%" cellspacing="0" cellpadding="0" border="0">
                                      <tbody>
                                        <tr>
                                          <td style="height:30px;line-height:30px">&nbsp;</td>
                                        </tr>
                                      </tbody>
                                    </table>

                                    <table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff">
                                      <tbody>
                                        <tr>
                                          <td style="border:1px solid #BFBFBF;padding:16px">
                                            <table width="100%" cellspacing="0" cellpadding="0" border="0" align="left">
                                              <tbody>
                                                <tr>
                                                  <td style="padding-bottom:16px;font-size:18px;line-height:20px">
                                                    <b>Important Information</b>
                                                  </td>
                                                  <td style="padding-left:10px;text-align:right;vertical-align:top">
                                                    <img
                                                      src="https://image.mailing.ticketmaster.com/lib/fe9e15747366047975/m/1/acd297ab-25df-4b8a-81cf-706b2f72dab1.png"
                                                      width="20" height="20">
                                                  </td>
                                                </tr>
                                                <tr>
                                                  <td colspan="2">
                                                    <!-- Terms and conditions text -->
                                                    <p><strong>Resale restrictions</strong></p>
                                                    <ol>
                                                      <li>Tickets are for personal use only and may not be resold for
                                                        profit
                                                        and/or through unauthorised resale sites such as Viagogo or
                                                        Stubhub.
                                                      </li>
                                                      <li>If you can no longer use your tickets and are not eligible for
                                                        an
                                                        exchange or refund, you may resell them through Twickets. For
                                                        all
                                                        authorised resale sites visit the Artist page at
                                                        livenation.co.uk</li>
                                                      <li>Only genuine mobile tickets will be accepted for entry.
                                                        Printouts
                                                        and/or screenshots of tickets will not be accepted. If you
                                                        bought more
                                                        than one mobile ticket and ticket transfer is unavailable, your
                                                        guests
                                                        must be with you at time of entry.</li>
                                                      <li>A strict limit of 6 tickets per person (and per household) per
                                                        event
                                                        applies in the general sale and 4 tickets per person (and per
                                                        household)
                                                        per event applies in presales. Tickets purchased over this limit
                                                        may be
                                                        cancelled and invalidated (in which case you will be refunded).
                                                      </li>
                                                      <li>Tickets purchased or resold or offered for resale in breach of
                                                        these
                                                        terms may be cancelled. </li>
                                                      <li>If there are any inconsistencies between these conditions and
                                                        any
                                                        other applicable terms and conditions, these conditions will
                                                        apply.</li>
                                                    </ol>
                                                    <p><strong>Covid-19 safety requirements</strong><br><br>
                                                      Admission to this event is at all times subject to the promoter
                                                      (Live
                                                      Nation) and venue operator&#39;s terms and conditions. Please
                                                      ensure you
                                                      read and accept these terms before purchasing tickets, in
                                                      particular those
                                                      relating to safety measures implemented to combat the spread of
                                                      COVID-19,
                                                      which may include (i) requesting audiences to demonstrate their
                                                      COVID-19
                                                      status by providing proof of a negative lateral flow test, full
                                                      vaccination, or natural immunity, and/or (ii) any other entry
                                                      requirements
                                                      recommended by government. The promoter and venue reserve the
                                                      right to
                                                      refuse admission to the event for failure to comply with such
                                                      requirements
                                                      and you will not be entitled to a refund.
                                                    </p>
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>

                                    <table width="100%" cellspacing="0" cellpadding="0" border="0">
                                      <tbody>
                                        <tr>
                                          <td style="height:30px;line-height:30px">&nbsp;</td>
                                        </tr>
                                      </tbody>
                                    </table>

                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#1F262D">
                      <tbody>
                        <tr>
                          <td align="center">
                            <table cellpadding="0" cellspacing="0" border="0" width="467">
                              <tbody>
                                <tr>
                                  <td width="447" align="center" style="min-width:447px;padding:30px 10px 20px">
                                    <table cellpadding="0" cellspacing="0" width="100%" role="presentation"
                                      style="min-width:100%">
                                      <tbody>
                                        <tr>
                                          <td>
                                            <table width="100%" cellspacing="0" cellpadding="0" border="0"
                                              bgcolor="#1F262D">
                                              <tbody>
                                                <tr>
                                                  <td align="center">
                                                    <table width="467" cellspacing="0" cellpadding="0" border="0">
                                                      <tbody>
                                                        <tr>
                                                          <td style="min-width:447px;padding:0px 10px 20px" width="447"
                                                            align="center">
                                                            <table align="center">
                                                              <tbody>
                                                                <tr>
                                                                  <td style="padding:0px 16px 10px;text-align:center">
                                                                    <a href="#"><img alt="Blog"
                                                                        src="https://image.mailing.ticketmaster.com/lib/fea015737460007f75/m/26/8946d8df-0990-444e-862b-6692c6bd0bfe.png"
                                                                        style="width:53px;height:43px"></a>
                                                                    <a href="#"><img alt="Facebook"
                                                                        src="https://image.mailing.ticketmaster.com/lib/fea015737460007f75/m/25/841e66f9-a22f-41cc-bbcb-bbe837e1c70b.png"
                                                                        style="width:53px;height:43px"></a>
                                                                    <a href="#"><img alt="Twitter"
                                                                        src="https://image.mailing.ticketmaster.com/lib/fea015737460007f75/m/26/ea36b157-2b8d-440f-9cc5-53558609aa07.png"
                                                                        style="width:53px;height:43px"></a>
                                                                    <a href="#"><img alt="Youtube"
                                                                        src="https://image.mailing.ticketmaster.com/lib/fea015737460007f75/m/26/4b220d1b-f608-4f17-b7d4-b6527234c1c5.png"
                                                                        style="width:53px;height:43px"></a>
                                                                    <a href="#"><img alt="Instagram"
                                                                        src="https://image.mailing.ticketmaster.com/lib/fea015737460007f75/m/26/57f2f2fe-2f8a-423d-bb01-e6be925f4d5e.png"
                                                                        style="width:53px;height:43px"></a>
                                                                  </td>
                                                                </tr>
                                                              </tbody>
                                                            </table>
                                                            <table width="100%" cellspacing="0" cellpadding="0"
                                                              border="0" align="left">
                                                              <tbody>
                                                                <tr>
                                                                  <td
                                                                    style="padding:16px 16px 7px;font-size:13px;line-height:17px;color:rgb(255,255,255)">
                                                                    <p
                                                                      style="padding-bottom:5px;font-size:15px;line-height:19px;font-weight:bold">
                                                                      <a href="#">
                                                                        <font style="color:rgb(0,255,255)">Ticketmaster
                                                                        </font>
                                                                      </a> |
                                                                      <a href="#">
                                                                        <font style="color:rgb(0,255,255)">Contact us
                                                                        </font>
                                                                      </a>
                                                                    </p>
                                                                    <p>This email confirms your ticket order, so
                                                                      print/save it
                                                                      for future reference. All purchases are subject to
                                                                      credit
                                                                      card approval, billing address verification and
                                                                      Terms and
                                                                      Conditions as set out in our
                                                                      <a href="#" style="text-decoration:none">
                                                                        <font style="color:rgb(0,255,255)">Purchase
                                                                          Policy
                                                                        </font>
                                                                      </a>. We make every effort to be accurate, but we
                                                                      cannot
                                                                      be responsible for changes, cancellations, or
                                                                      postponements announced after this email is sent.
                                                                    </p>
                                                                    <p>© 2022 Ticketmaster. All rights reserved.</p>
                                                                    <p>Ticketmaster UK Limited. Registered in England,
                                                                      company
                                                                      number 02662632. Registered Office: <a href="#">30
                                                                        St John
                                                                        Street, London EC1M 4AY</a></p>
                                                                    <p>Please do not reply to this email. Replies to
                                                                      this email
                                                                      will not be responded to or read. If you have any
                                                                      questions or comments,
                                                                      <a href="#" style="text-decoration:underline">
                                                                        <font style="color:rgb(0,255,255)">contact us
                                                                        </font>
                                                                      </a>.
                                                                    </p>
                                                                  </td>
                                                                </tr>
                                                              </tbody>
                                                            </table>
                                                          </td>
                                                        </tr>
                                                      </tbody>
                                                    </table>
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <img src="#" width="1" height="1" alt="">
                  </div>
                </div>
              </div>
            </div>
          </div>
      `,
    };

    // 6) Send via Nodemailer
    await transporter.sendMail(mailOptions);
    return res.status(200).json({
      success: true,
      message: "Ticket sent successfully!",
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to send ticket email." });
  }
});

// app.post("/send-transfer", async (req, res) => {
//   const { emailOrMobile, firstName, senderFullName /*…*/ } = req.body;

//   const { subject, html } = buildTicketTransferEmail({
//     firstName,
//     senderFullName,
//     eventTitle: req.body.eventTitle,
//     eventLocation: req.body.eventLocation,
//     eventDateTime: req.body.eventDateTime,
//     quantity: req.body.quantity,
//     section: req.body.section,
//     row: req.body.row,
//     seats: req.body.seats ?? [],
//     ticketId: req.body.ticketId,
//     acceptUrl: `https://your.app/accept/${req.body.ticketId}`,
//   });

//   await transporter.sendMail({
//     from: `"Ticketmaster" <${process.env.EMAIL}>`,
//     to: emailOrMobile,
//     subject,
//     html,
//   });

//   res.json({ success: true });
// });
// Start Server

// UPDATE FOR ABOVE
app.post("/send-transfer", emailRateLimit, async (req, res) => {
  try {
    // CHANGE: Validate transfer payload before building/sending email.
    const validation = validateTransferPayload(req.body);

    if (!validation.ok) {
      return res.status(400).json({
        success: false,
        message: "Invalid transfer payload.",
        errors: validation.errors,
      });
    }

    const payload = validation.data;

    // CHANGE: Build accept URL from APP_URL instead of hardcoded placeholder.
    const acceptUrl = buildAcceptUrl(payload.ticketId);

    const { subject, html } = buildTicketTransferEmail({
      // CHANGE: Escape values before inserting into transfer email HTML.
      firstName: escapeHtml(payload.firstName),
      senderFullName: escapeHtml(payload.senderFullName),
      eventTitle: escapeHtml(payload.eventTitle),
      eventLocation: escapeHtml(payload.eventLocation),
      eventDateTime: escapeHtml(payload.eventDateTime),
      quantity: payload.quantity,
      section: escapeHtml(payload.section),
      row: escapeHtml(payload.row),
      seats: payload.seatsArray.map(escapeHtml),
      ticketId: escapeHtml(payload.ticketId),
      acceptUrl: escapeHtml(acceptUrl),
    });

    await transporter.sendMail({
      from: `"Ticketmaster" <${process.env.EMAIL}>`,
      to: payload.emailOrMobile,
      subject,
      html,
    });

    return res.json({
      success: true,
      message: "Transfer email sent successfully.",
    });
  } catch (error) {
    console.error("Error sending transfer email:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send transfer email.",
    });
  }
});

// UPDATE IS ABOVE: END

// ADDITION BLOCK IS BELOW: START
// CHANGE: Simple health check for deployment monitoring.
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
  });
});

// CHANGE: Final error handler for CORS errors and unexpected middleware failures.
app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);

  return res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
});

// ADDITION BLOCK IS ABOVE: END
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
