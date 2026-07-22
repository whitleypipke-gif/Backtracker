import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase.config"; // Import Firestore
import {
  signInWithCustomToken,
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  createUserWithEmailAndPassword,
} from "firebase/auth";

import { FiEye, FiEyeOff } from "react-icons/fi";
import {
  doc,
  setDoc,
  serverTimestamp,
  query,
  collection,
  where,
  limit,
  getDocs,
} from "firebase/firestore"; // Firestore methods
import { useNavigate, useLocation } from "react-router-dom"; // For navigation
import toast from "react-hot-toast"; // Import React Hot Toast
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { BiLoader } from "react-icons/bi";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passloading, setpassLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate(); // Initialize navigation
  const location = useLocation();

  const fromPathname = location.state?.from?.pathname;
  const fromSearch = location.state?.from?.search ?? "";
  const redirectPath = fromPathname
    ? `${fromPathname}${fromSearch}`
    : "/splash";

  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  const enteredEmail = email.trim();
  const isValidEmail =
    emailRegex.test(enteredEmail) || enteredEmail === "Usegen@ticket.com";
  const canSubmit = isValidEmail && password !== "" && !loading;

  const API_URL = import.meta.env.VITE_PASSKEY_API;

  const isTicketAcceptance =
  fromPathname === "/myevents" &&
  new URLSearchParams(fromSearch).get("action") === "accept-transfer";

  async function getTransferKeys(enteredEmail) {
    try {
      const q = query(
        collection(db, "transfers"),
        where("emailOrMobile", "==", enteredEmail),
        limit(1),
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log("No matching transfer found.");
        return null;
      }

      const transferDoc = snapshot.docs[0];
      const data = transferDoc.data();
      const firstName = data.firstName?.trim?.() ?? "";
      const lastName = data.lastName?.trim?.() ?? "";
      const name = [firstName, lastName].filter(Boolean).join(" ");
      const country = data.country

      return {
        id: transferDoc.id,
        firstName,
        lastName,
        name: name || "New User",
        country
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  const createUserProfile = async (user, transferData = null) => {
    const profile = {
      uid: user.uid,
      email: user.email ?? enteredEmail,
      name: transferData?.name ?? "New User",
      location: "",
      flag: "https://example.com/default-flag.png",
      createdAt: serverTimestamp(),
    };

    if (transferData?.firstName) {
      profile.firstName = transferData.firstName;
    }

    if (transferData?.lastName) {
      profile.lastName = transferData.lastName;
    }

    await setDoc(doc(db, "users", user.uid), profile);
  };

  const createAuthAccountAndProfile = async (transferData = null) => {
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        enteredEmail,
        password,
      );

      await createUserProfile(credential.user, transferData);
      return credential;
    } catch (err) {
      // If another request created the Auth profile after our existence check,
      // fall back to password verification for that new profile.
      if (err.code === "auth/email-already-in-use") {
        return await signInWithEmailAndPassword(auth, enteredEmail, password);
      }

      throw err;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!isValidEmail) {
      toast.error("📧 Invalid email.");
      return;
    }

    if (!password) {
      toast.error("🔑 Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      // 1. Auth profile already exists: verify the entered password for it.
      const signInMethods = await fetchSignInMethodsForEmail(
        auth,
        enteredEmail,
      );

      if (signInMethods.length > 0) {
        await signInWithEmailAndPassword(auth, enteredEmail, password);
      } else {
        // 2. No Auth profile: look for the first matching transfer document.
        const transferData = await getTransferKeys(enteredEmail);

        // 3. Create either a transferred profile or a base account.
        await createAuthAccountAndProfile(transferData);
      }

      const alreadyHasPasskeyforEmail =
        localStorage.getItem(`passkeyCreated_${enteredEmail}`) === "true";

      if (!alreadyHasPasskeyforEmail) {
        await createPasskey();
        localStorage.setItem(`passkeyCreated_${enteredEmail}`, "true");
      }

      navigate(redirectPath);
    } catch (err) {
      console.error(err);

      switch (err.code) {
        case "auth/wrong-password":
        case "auth/invalid-credential":
          toast.error("🔑 Incorrect password.");
          break;

        case "auth/email-already-in-use":
          toast.error("⚠️ This account already exists.");
          break;

        case "auth/invalid-email":
          toast.error("📧 Invalid email.");
          break;

        case "auth/weak-password":
          toast.error("🔑 Password should be at least 6 characters.");
          break;

        default:
          toast.error("⚠️ Login failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithPasskey = async () => {
    setpassLoading(true);
    try {
      const optionsRes = await fetch(`${API_URL}/passkey/login/options`, {
        method: "POST",
      });

      const { challengeId, options } = await optionsRes.json();

      const authenticationResponse = await startAuthentication({
        optionsJSON: options,
      });

      const verifyRes = await fetch(`${API_URL}/passkey/login/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          challengeId,
          authenticationResponse,
        }),
      });

      const result = await verifyRes.json();

      if (result.verified) {
        await signInWithCustomToken(auth, result.customToken);

        navigate(redirectPath);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error using passkey sign in");
      setpassLoading(false);
    }
  };

  const createPasskey = async () => {
    setpassLoading(true);
    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("User not authenticated");
      }

      const optionsRes = await fetch(`${API_URL}/passkey/register/options`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
        }),
      });

      const options = await optionsRes.json();
      console.log(options);

      const registrationResponse = await startRegistration({
        optionsJSON: options,
      });

      const platform = navigator.userAgentData?.platform || navigator.platform;

      const browser = navigator.userAgentData?.brands?.[0]?.brand || "Browser";

      const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();

      const deviceName = `${platform} • ${browser} • ${suffix}`;

      const verifyRes = await fetch(`${API_URL}/passkey/register/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: user.uid,
          registrationResponse,
          deviceName,
        }),
      });

      const verification = await verifyRes.json();

      toast.success("Passkey Created");
      setpassLoading(false);
    } catch (error) {
      console.error(error);
      setpassLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", "#ffffff");
  }, []);

  return (
    <main className="safe-area-page safe-area-light">
      <div className="flex flex-col items-center justify-center text-black bg-white my-14 mx-5">
        <div className="w-full max-w-md">
          <h1 className="text-[1.4375rem] w-full max-w-md text-left font-bold mb-5">
            SIGN IN OR CREATE ACCOUNT
          </h1>
        </div>
        {isTicketAcceptance && (
          <div className="w-full max-w-md mb-6 rounded-md border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">
                Accepting a Ticket
              </span>
              <br />
              You're almost there! Please sign in (or create an account if you're new). After signing in, we'll automatically take you back so you can finish accepting your ticket.
            </p>
          </div>
        )}
        <div className="w-full max-w-md">
          <h3 className="text-lg text-left mb-8 text-[1.0625rem]">
            If you don't have an account you will be prompted to create one.
          </h3>
        </div>
        <div className="w-full max-w-md mb-12">
          <label
            htmlFor="emailInput"
            className="block text-left text-[0.9063rem] mb-1.5 text-neutral-500"
          >
            Email Address
          </label>
          <input
            type="email"
            name="emailInput"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            id="emailInput"
            className="border rounded-[0.2188rem] w-full max-w-md h-11 border-neutral-500 outline-customBlue p-2"
          />
          {isValidEmail && (
            <div className="w-full max-w-md transition-all duration-600 ease-in-out">
              <label
                htmlFor="passwordInput"
                className="block text-left text-[0.9063rem] mt-3 mb-1.5 text-neutral-500"
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="passwordInput"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  id="passwordInput"
                  className="border rounded-[0.2188rem] w-full max-w-md h-11 border-neutral-500 outline-customBlue p-2 pr-10"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="w-full max-w-md">
          <button
            type="button"
            className={`mb-4 ${canSubmit ? "bg-customBlue text-white" : "text-neutral-400 bg-neutral-100"} text-[0.9375rem] w-full max-w-md h-11 rounded-[0.2188rem] font-bold transition-all duration-300 ease-in-out flex items-center justify-center`}
            onClick={handleLogin}
            disabled={!canSubmit}
          >
            Continue{" "}
            {loading && (
              <span>
                <BiLoader className="text-sm animate-spin ml-2" />
              </span>
            )}
          </button>
        </div>
        <div className="flex w-full max-w-md items-center justify-between mb-4">
          <hr className="text-neutral-300 w-[43%]" />
          <p className="font-bold text-[0.75rem]">OR</p>
          <hr className="text-neutral-300 w-[43%]" />
        </div>
        <div className="w-full max-w-md">
          <button
            className={`mb-8 text-[0.9375rem] w-full max-w-md h-11 rounded-[0.2188rem] font-bold border border-neutral-400 flex items-center justify-center transition-all ease-in-out`}
            onClick={() => {
              signInWithPasskey();
            }}
          >
            <span className="mr-2">
              <svg
                width="24"
                height="24"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#000000"
                  d="M11 18Zm-8 2v-2.8q0-.85.438-1.563T4.6 14.55q1.55-.775 3.15-1.163T11 13q.5 0 1 .038t1 .112q-.05.525.025 1.05t.25 1.025q-.575-.125-1.137-.175T11 15q-1.4 0-2.775.338T5.5 16.35q-.225.125-.363.35T5 17.2v.8h10.5v2H3Zm16 3l-1.5-1.5v-4.65q-1.1-.325-1.8-1.238T15 13.5q0-1.45 1.025-2.475T18.5 10q1.45 0 2.475 1.025T22 13.5q0 1.125-.638 2t-1.612 1.25L21 18l-1.5 1.5L21 21l-2 2Zm-.5-9q.425 0 .713-.288T19.5 13q0-.425-.288-.713T18.5 12q-.425 0-.713.288T17.5 13q0 .425.288.713T18.5 14ZM11 12q-1.65 0-2.825-1.175T7 8q0-1.65 1.175-2.825T11 4q1.65 0 2.825 1.175T15 8q0 1.65-1.175 2.825T11 12Zm0-2q.825 0 1.413-.588T13 8q0-.825-.588-1.413T11 6q-.825 0-1.413.588T9 8q0 .825.588 1.413T11 10Zm0-2Z"
                />
              </svg>
            </span>
            Sign In With A Passkey{" "}
            {passloading && (
              <span>
                <BiLoader className="text-sm animate-spin ml-2" />
              </span>
            )}
          </button>
        </div>
        <div>
          <p className="text-customBlue font-bold text-[0.9375rem] mb-10">
            How To Add A Passkey
          </p>
        </div>
        <div>
          <p className="text-[0.9375rem] text-neutral-600">
            By continuing past this page, I acknowledge that I have read and
            agree to the current{" "}
            <span className="text-customBlue underline font-bold">
              Terms of Use
            </span>
            , aincluding the arbritration agreement and class action waiver,
            updated in August 2025, and understand that information will be used
            as described in our{" "}
            <span className="text-customBlue underline font-bold">
              Privacy Policy
            </span>
            .
            <br />
            <br />
            As set forth in our Privacy Policy, we may use your information for
            email marketing, including promotions and updates on our own or
            third-party products. You can opt our of our marketing emails
            anytime.
          </p>
        </div>
      </div>
    </main>
  );
};

export default Login;
