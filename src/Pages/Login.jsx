import React, { useState } from "react";
import { auth, db } from "../firebase.config"; // Import Firestore
import {
  signInWithCustomToken,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { FiEye, FiEyeOff } from "react-icons/fi";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"; // Firestore methods
import { ClipLoader } from "react-spinners"; // Import spinner
import { useNavigate } from "react-router-dom"; // For navigation
import toast, { Toaster } from "react-hot-toast"; // Import React Hot Toast
import { startAuthentication } from "@simplewebauthn/browser";
import { BiLoader } from "react-icons/bi";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passloading, setpassLoading] = useState(false);
  const [emailExists, setEmailExists] = useState(null); // State to track email existence
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate(); // Initialize navigation

  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  // Confirm user email existence
  const confirmUserEmail = async (email) => {
    const userRef = doc(db, "users", email);
    const userSnap = await getDoc(userRef);
    setEmailExists(userSnap.exists());
  };

  const API_URL = import.meta.env.VITE_PASSKEY_API;

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      // Check if user exists in Firestore
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // If user doesn't exist, create a new document
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          name: "New User", // Default name (can be updated later)
          location: "", // Empty location (can be updated later)
          flag: "https://example.com/default-flag.png", // Placeholder flag
          createdAt: serverTimestamp(),
        });
      }

      setTimeout(() => {
        navigate("/splash"); // Redirect to home page
      }, 500); // Delay to allow users to see success message
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        toast.error("❌ User does not exist.");
      } else if (err.code === "auth/wrong-password") {
        toast.error("🔑 Incorrect password.");
      } else if (err.code === "auth/invalid-email") {
        toast.error("📧 Invalid email format.");
      } else {
        toast.error("⚠️ Login failed. Try again.");
      }
      console.error("Login error:", err);
    }
    setLoading(false);
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

        navigate("/splash");
      }

      console.log(result);

      console.log(authenticationResponse);
    } catch (error) {
      console.error(error);
      toast.error("Error using passkey sign in");
      setpassLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center text-black bg-white my-14 mx-5">
        <div className="w-full max-w-md">
          <h1 className="text-[1.4375rem] w-full max-w-md text-left font-bold mb-5">
            SIGN IN OR CREATE ACCOUNT
          </h1>
        </div>
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
          {(emailExists || email == "Usegen@ticket.com") && (
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
            className={`mb-4 ${((emailRegex.test(email) && !(emailExists || email == "Usegen@ticket.com")) || ((emailExists || email == "Usegen@ticket.com") && password !== "")) && !loading ? "bg-customBlue text-white" : "text-neutral-400 bg-neutral-100"} text-[0.9375rem] w-full max-w-md h-11 rounded-[0.2188rem] font-bold transition-all duration-300 ease-in-out flex items-center justify-center`}
            onClick={
              ((emailRegex.test(email) &&
                !(emailExists || email == "Usegen@ticket.com")) ||
                ((emailExists || email == "Usegen@ticket.com") &&
                  password !== "")) &&
              handleLogin
            }
            disabled={loading}
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
    </>

    // <div className="flex items-center justify-center min-h-screen bg-black text-white">
    //   {/* Toast Notification Container */}
    //   <Toaster position="top-right" reverseOrder={false} />

    //   <div className="bg-gray-900 bg-opacity-50 backdrop-blur-md p-8 shadow-lg rounded-lg w-full max-w-md border border-gray-700">
    //     <h2 className="text-2xl font-bold text-center text-gray-200 mb-6">
    //       Login
    //     </h2>

    //     <form onSubmit={handleLogin} className="space-y-4">
    //       {/* Email Field */}
    //       <div>
    //         <label className="block text-gray-300 font-medium mb-1">
    //           Email
    //         </label>
    //         <input
    //           type="email"
    //           className="border border-gray-700 bg-gray-800 p-3 rounded-full w-full focus:ring-2 focus:ring-blue-500 text-white"
    //           placeholder="Enter your email"
    //           value={email}
    //           onChange={(e) => setEmail(e.target.value)}
    //           required
    //         />
    //       </div>

    //       {/* Password Field */}
    //       <div>
    //         <label className="block text-gray-300 font-medium mb-1">
    //           Password
    //         </label>
    //         <input
    //           type="password"
    //           className="border border-gray-700 bg-gray-800 p-3 rounded-full w-full focus:ring-2 focus:ring-blue-500 text-white"
    //           placeholder="Enter your password"
    //           value={password}
    //           onChange={(e) => setPassword(e.target.value)}
    //           required
    //         />
    //       </div>

    //       {/* Login Button with Loader */}
    //       <button
    //         type="submit"
    //         className={`w-full py-3 rounded-md font-semibold flex justify-center items-center transition ${
    //           loading
    //             ? "bg-gray-600 cursor-not-allowed"
    //             : "bg-blue-600 hover:bg-[#0139A7]"
    //         }`}
    //         disabled={loading}
    //       >
    //         {loading ? <ClipLoader color="white" size={24} /> : "Login"}
    //       </button>
    //     </form>

    //     {/* Forgot Password & Signup */}
    //     {/* <div className="text-center mt-4">
    //       <a
    //         href="/forgot-password"
    //         className="text-blue-400 text-sm hover:underline"
    //       >
    //         Forgot Password?
    //       </a>
    //       <p className="mt-2 text-sm">
    //         Don't have an account?{" "}
    //         <a href="/signup" className="text-blue-400 hover:underline">
    //           Sign Up
    //         </a>
    //       </p>
    //     </div> */}
    //   </div>
    // </div>
  );
};

export default Login;
