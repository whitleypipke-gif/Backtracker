import React, { useState } from "react";
import { auth, db } from "../firebase.config"; // Import Firestore
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"; // Firestore methods
import { ClipLoader } from "react-spinners"; // Import spinner
import { useNavigate } from "react-router-dom"; // For navigation
import toast, { Toaster } from "react-hot-toast"; // Import React Hot Toast

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); // Initialize navigation

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
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

      toast.success("🎉 Login successful!");

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

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white">
      {/* Toast Notification Container */}
      <Toaster position="top-right" reverseOrder={false} />

      <div className="bg-gray-900 bg-opacity-50 backdrop-blur-md p-8 shadow-lg rounded-lg w-full max-w-md border border-gray-700">
        <h2 className="text-2xl font-bold text-center text-gray-200 mb-6">
          Login
        </h2>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email Field */}
          <div>
            <label className="block text-gray-300 font-medium mb-1">
              Email
            </label>
            <input
              type="email"
              className="border border-gray-700 bg-gray-800 p-3 rounded-full w-full focus:ring-2 focus:ring-blue-500 text-white"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-gray-300 font-medium mb-1">
              Password
            </label>
            <input
              type="password"
              className="border border-gray-700 bg-gray-800 p-3 rounded-full w-full focus:ring-2 focus:ring-blue-500 text-white"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Login Button with Loader */}
          <button
            type="submit"
            className={`w-full py-3 rounded-md font-semibold flex justify-center items-center transition ${
              loading
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-blue-600 hover:bg-[#0139A7]"
            }`}
            disabled={loading}
          >
            {loading ? <ClipLoader color="white" size={24} /> : "Login"}
          </button>
        </form>

        {/* Forgot Password & Signup */}
        {/* <div className="text-center mt-4">
          <a
            href="/forgot-password"
            className="text-blue-400 text-sm hover:underline"
          >
            Forgot Password?
          </a>
          <p className="mt-2 text-sm">
            Don't have an account?{" "}
            <a href="/signup" className="text-blue-400 hover:underline">
              Sign Up
            </a>
          </p>
        </div> */}
      </div>
    </div>
  );
};

export default Login;
