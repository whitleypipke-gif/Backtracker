import React from "react";
// import { Html, Body } from "@react-email/components";

export default function Test({
  recipientName,
  senderName,

  eventTitle,
  eventDateTime,
  eventLocation,

  section,
  row,
  seatNo,
  admissionType,

  seats,

  acceptUrl,
}) {
  return (
    // <Html>
    <div
      style={{
        margin: 0,
        padding: "10px",
        backgroundColor: "#efefef",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundImage:
            "url('https://res.cloudinary.com/domlob3pr/image/upload/v1781487541/image_8d44d644_krse2n.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          padding: "0px 20px",
          color: "#fff",
          textAlign: "center",
        }}
      >
        <img
          src={`https://res.cloudinary.com/domlob3pr/image/upload/v1781445850/ticketmasterw_uzc40u.png`}
          alt="TickOnt"
          style={{
            width: "120px",
            display: "block",
            marginBottom: "",
          }}
        />

        <h1
          style={{
            margin: 0,
            fontSize: "30px",
            fontWeight: 300,
            marginBottom: "",
          }}
        >
          Ticket Transfer
        </h1>
      </div>

      {/* Main Card */}
      <div
          style={{
            backgroundColor: "#ffffff",
            maxWidth: "380px",
            margin: "20px auto",
            border: "1px solid #d6d6d6",
          }}
        >
          {/* Transfer Icon */}
          <div
            style={{
              padding: "30px",
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                borderTop: "2px solid #024bde",
                width: "125px",
                height: "1px",
              }}
            ></div>

            <div
              style={{
                width: "50px",
                height: "50px",
                lineHeight: "50px",
                borderRadius: "50%",
                backgroundColor: "#5e6ceb",
                color: "#fff",
                fontSize: "46px",
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                style={{
                  width: "90%",
                }}
                src="https://res.cloudinary.com/domlob3pr/image/upload/v1781485114/arrow-angular-top-right__1_zsormm.png"
                alt=""
              />
            </div>
            <div
              style={{
                borderTop: "2px solid #024bde",
                width: "125px",
                height: "1px",
              }}
            ></div>
          </div>

          {/* Greeting */}
          <div
            style={{
              padding: "0 25px 25px",
              color: "#111",
            }}
          >
            <p>Hi {recipientName},</p>

            <p>
              <strong>{senderName}</strong> has sent you ticket(s).
            </p>
          </div>

          {/* Event Box */}
          <div
            style={{
              margin: "0 25px",
              border: "1px solid #d6d6d6",
            }}
          >
            <div
              style={{
                padding: "10px 20px",
              }}
            >
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  marginBottom: "5px",
                }}
              >
                {eventTitle}
              </div>

              <div
                style={{
                  marginBottom: "10px",
                  color: "#555",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <img
                  style={{
                    width: "26px",
                    marginRight: "5px",
                  }}
                  src="https://res.cloudinary.com/domlob3pr/image/upload/v1781483647/Screenshot_2026-06-15_013223_lb9bp9.png"
                  alt=""
                />{" "}
                {eventLocation}
              </div>

              <div
                style={{
                  color: "#555",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <img
                  style={{
                    width: "24px",
                    marginRight: "5px",
                  }}
                  src="https://res.cloudinary.com/domlob3pr/image/upload/v1781484329/calendar-blank-light__pt5i9v.png"
                  alt=""
                />{" "}
                {eventDateTime}
              </div>
            </div>

            <div
              style={{
                borderTop: "1px solid #d6d6d6",
                padding: "20px",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: "5px",
                  display: "flex",
                  alignItems: "center",
                  fontSize: "13px",
                }}
              >
                <img
                  style={{
                    width: "20px",
                    marginRight: "5px",
                  }}
                  src="https://res.cloudinary.com/domlob3pr/image/upload/v1781484330/ticket-outline__uzxbxz.png"
                  alt=""
                />
                x{seats} ticket(s)
              </div>

              <p
                style={{
                  marginBottom: "10px",
                  display: "flex",
                  alignItems: "center",
                  fontSize: "11px",
                }}
              >
                Details
              </p>

              <table
                width="100%"
                style={{
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <tbody>
                  <tr>
                    <th align="left">Section</th>
                    <th align="left">Row</th>
                    <th align="left">Seat</th>
                    <th align="left">Type</th>
                  </tr>

                  <tr>
                    <td>{section}</td>
                    <td>{row}</td>
                    <td>{seatNo || "-"}</td>
                    <td>{admissionType}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* CTA */}
          <div
            style={{
              padding: "10px 40px",
              marginBottom: "20px",
            }}
          >
            <a
              href={acceptUrl}
              style={{
                display: "block",
                textAlign: "center",
                backgroundColor: "#024bde",
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 700,
                padding: "8px",
                fontSize: "18px",
              }}
            >
              Accept Ticket(s)
            </a>
          </div>

          {/* Information */}
          <div
            style={{
              padding: "0 25px 30px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#444",
              lineHeight: "15px",
            }}
          >
            <p>Accepting tickets sent to you is free.</p>

            <p
              style={{
                marginBottom: "15px",
              }}
            >
              Sign in to your Ticketmaster account or create one to accept them.
            </p>

            <p>
              If you have purchased these tickets via an External Resale
              Platform and the event is unexpectedly canceled, postponed, or
              significantly changed, then you must contact this third party for
              information about refund options.
            </p>

            <p
              style={{
                textAlign: "center",
                marginTop: "40px",
                fontWeight: 700,
              }}
            >
              THIS EMAIL DOES NOT GRANT EVENT ENTRY
            </p>
          </div>
        </div>
    </div>
    // </Html>
  );
}
