import React, { useState, useEffect } from "react";
import { IoMailOutline, IoHeart, IoTicket } from "react-icons/io5";
import { FaLocationArrow, FaMoneyBillWave, FaRegBell } from "react-icons/fa";
import { MdOutlineHelpOutline, MdOutlinePayment } from "react-icons/md";
import { GrMapLocation } from "react-icons/gr";
import { TiLocationArrowOutline } from "react-icons/ti";
import { TfiEmail } from "react-icons/tfi";
import { BiEdit, BiBell } from "react-icons/bi";
import { Switch } from "@headlessui/react";
import { useAuth } from "../Context/AuthContext";
import { PiHeartStraightLight, PiHeartStraightBold } from "react-icons/pi";
import { GoChevronRight } from "react-icons/go";
import CountryFlag from "react-country-flag";
import { LuPen, LuWallet } from "react-icons/lu";
import { SlBookOpen } from "react-icons/sl";
import Modal from "react-modal";
import toast from "react-hot-toast";
// Firestore imports
import { db, auth } from "../firebase.config";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
// Redux imports for user management
import { useSelector, useDispatch } from "react-redux";
import { fetchUser, updateUser } from "../redux/userSlice";

import { startRegistration } from "@simplewebauthn/browser";

import { Country, City } from "country-state-city";
import { HiOutlineKey } from "react-icons/hi2";

const Account = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // Redux: get userData and status from store
  const dispatch = useDispatch();
  const userData = useSelector((state) => state.user.userData);
  const userStatus = useSelector((state) => state.user.status);

  // Local states for editing fields
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  const [receiveNotifications, setReceiveNotifications] = useState(false);
  const [locationBasedContent, setLocationBasedContent] = useState(false);

  // Cities & Countries arrays
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);

  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedCity, setSelectedCity] = useState("");
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showFavoriteInput, setShowFavoriteInput] = useState(false);
  const [favoriteValue, setFavoriteValue] = useState("");

  const API_URL = import.meta.env.VITE_PASSKEY_API

  const createPasskey = async () => {
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

      const registrationResponse = await startRegistration({
        optionsJSON: options,
      });

      const verifyRes = await fetch(
        `${API_URL}/passkey/register/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uid: user.uid,
            registrationResponse,
          }),
        },
      );

      const verification = await verifyRes.json();
      
      toast.success('Passkey Created')
    } catch (error) {
      console.error(error);
    }
  };

  // toggle the input visibility
  const handleFavoriteClick = () => {
    setShowFavoriteInput((v) => !v);
  };

  // save to Firestore
  const handleSaveFavorite = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { Ticketname: favoriteValue });
      toast.success("Favourite saved!");
      setShowFavoriteInput(false);
    } catch (err) {
      console.error(err);
      toast.error("Could not save favourite.");
    }
  };
  // Fetch user data from Firestore on mount using Redux
  useEffect(() => {
    if (user && !userData) {
      dispatch(fetchUser(user.uid));
    }
  }, [user, userData, dispatch]);

  // Update local edit fields when Redux user data is available
  useEffect(() => {
    if (userData) {
      setNewName(userData.name || "New User");
      setNewEmail(userData.email || user.email);

      if (userData.location) {
        setSelectedCity(userData.location);
      }

      if (userData.country?.isoCode) {
        setSelectedCountry(userData.country);
      } else {
        const usa = Country.getAllCountries().find((c) => c.isoCode === "US");

        if (usa) {
          setSelectedCountry(usa);
        }
      }
    }
  }, [userData, user]);

  useEffect(() => {
    const allCountries = Country.getAllCountries();

    setCountries(allCountries);
  }, []);

  useEffect(() => {
    if (!selectedCountry) return;

    const countryCities = City.getCitiesOfCountry(selectedCountry.isoCode);

    setCities(
      (countryCities || []).filter(
        (city, index, self) =>
          index ===
          self.findIndex(
            (c) =>
              c.name === city.name &&
              c.latitude === city.latitude &&
              c.longitude === city.longitude,
          ),
      ),
    );

    if (!selectedCity && countryCities && countryCities.length > 0) {
      setSelectedCity(countryCities[0].name);
    }
  }, [selectedCountry]);

  // Update city in Firestore
  // const handleSelectCity = async (city) => {
  //   setSelectedCity(city);
  //   setShowCityDropdown(false);
  //   if (user) {
  //     const userRef = doc(db, "users", user.uid);
  //     await updateDoc(userRef, { location: city });
  //   }
  // };

  const handleSelectCity = async (city) => {
    setSelectedCity(city.name);
    setShowCityDropdown(false);

    if (user) {
      const userRef = doc(db, "users", user.uid);

      await updateDoc(userRef, {
        location: city.name,
      });
      dispatch(
        updateUser({
          uid: user.uid,
          location: city.name,
        }),
      );
    }
  };

  // Update country in Firestore
  // const handleSelectCountry = async (countryObj) => {
  //   setSelectedCountry(countryObj);
  //   setShowCountryDropdown(false);
  //   if (user) {
  //     const userRef = doc(db, "users", user.uid);
  //     await updateDoc(userRef, { country: countryObj, location: "" });
  //   }
  // };

  const handleSelectCountry = async (countryObj) => {
    setSelectedCountry(countryObj);
    setSelectedCity("");
    setShowCountryDropdown(false);

    if (user) {
      const userRef = doc(db, "users", user.uid);

      await updateDoc(userRef, {
        country: countryObj,
        location: "",
      });
      dispatch(
        updateUser({
          uid: user.uid,
          country: countryObj,
          location: "",
        }),
      );
    }
  };

  // Save updated name and email via Redux
  const handleSaveNotifications = async () => {
    if (!user) return;
    dispatch(updateUser({ uid: user.uid, name: newName, email: newEmail }))
      .then(() => {
        toast.success("Profile updated successfully.");
        setShowNotificationsModal(false);
      })
      .catch((error) => {
        console.error("Error updating profile:", error);
        toast.error("Failed to update profile.");
      });
  };

  return (
    <div className="min-h-screen bg-white text-black pb-10">
      {/* Header Section */}
      <div className="bg-customBlack text-white py-6 text-center relative">
        <h1 className="mb-2">My Account</h1>
        {userData ? (
          <div className="text-left px-2">
            <p
              onClick={() => setShowLogoutModal(true)}
              className="cursor-pointer text-lg font-semibold mb-1"
            >
              {userData.name}
            </p>
            <p className="text-sm text-gray-300">{userData.email}</p>
          </div>
        ) : (
          <h2 className="text-base font-semibold mb-2">My Account</h2>
        )}
        {!user && (
          <p className="text-gray-300">
            Welcome to{" "}
            <span className="font-semibold italic">ticketmaster</span>
          </p>
        )}
        {!user && (
          <button className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg text-lg font-semibold">
            Sign In
          </button>
        )}
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white text-black rounded-lg shadow-lg p-6 w-80">
            <h3 className="text-lg font-semibold mb-4">Logout</h3>
            <p className="mb-6">Are you sure you want to logout?</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  logout();
                  setShowLogoutModal(false);
                  navigate("/"); // Redirect to home route after logout
                }}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Section */}
      <div className="px-2 mt-6">
        <h3 className="text-base font-medium mb-2">Notifications</h3>
        {/* Clicking this row opens the modal to edit name and email */}
        <div
          className="flex justify-between items-center px-2 py-3 cursor-pointer"
          onClick={() => setShowNotificationsModal(true)}
        >
          <div className="flex items-center gap-3">
            <TfiEmail className="text-xl" />
            <p>My Notifications</p>
          </div>
          <GoChevronRight className="text-gray-800 text-2xl" />
        </div>
        <div className="flex justify-between items-center px-2 py-1">
          <div className="flex items-center gap-3">
            <BiBell className="text-xl" />
            <p>Receive Notifications?</p>
          </div>
          <Switch
            checked={receiveNotifications}
            onChange={setReceiveNotifications}
            className={`${
              receiveNotifications ? "bg-blue-600" : "bg-gray-200"
            } relative inline-flex h-6 w-11 items-center rounded-full`}
          >
            <span
              className={`${
                receiveNotifications ? "translate-x-6" : "translate-x-1"
              } inline-block h-4 w-4 transform bg-white rounded-full transition`}
            />
          </Switch>
        </div>
      </div>

      {/* Location Settings */}
      <div className="px-2 mt-6 relative">
        <h3 className="text-base font-semibold flex items-center gap-2">
          Location Settings{" "}
          <span className="bg-blue-600 text-white text-xs px-3 py-0.5 rounded-full">
            NEW!
          </span>
        </h3>

        <div className="flex justify-between items-center px-2 py-3 relative">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 flex items-center p-0.5 justify-center rounded-full overflow-hidden border border-white">
              <CountryFlag
                countryCode={selectedCountry?.isoCode}
                svg
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                }}
              />
            </div>
            <p>My Country</p>
          </div>
          <div className="flex items-center gap-2 relative">
            <span className="text-blue-600 font-semibold">
              {selectedCountry?.name || "Select Country"}
            </span>
            <BiEdit
              className="text-customBlue text-xl cursor-pointer"
              onClick={() => {
                setShowCountryDropdown(!showCountryDropdown);
                setShowCityDropdown(false);
              }}
            />
            {showCountryDropdown && (
              <div className="absolute right-0 top-8 w-48 h-90 bg-white text-black border border-gray-300 rounded-lg shadow-lg z-50 overflow-y-auto no-scrollbar">
                {countries.map((c) => (
                  <div
                    key={c.isoCode}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleSelectCountry(c)}
                  >
                    <CountryFlag
                      countryCode={c.isoCode}
                      svg
                      style={{
                        width: "1.25em",
                        height: "1.25em",
                        borderRadius: "50%",
                      }}
                    />
                    <span className="text-sm">{c.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center px-2 py-3">
          <div className="flex items-center gap-3">
            <GrMapLocation className="text-xl" />
            <p>My Location</p>
          </div>
          <div className="flex items-center gap-2 relative">
            <span className="text-blue-600 font-semibold text-base">
              {selectedCity || "City"}
            </span>
            <BiEdit
              className={`text-xl ${
                selectedCountry
                  ? "text-customBlue cursor-pointer"
                  : "text-gray-400 cursor-not-allowed"
              }`}
              onClick={() => {
                if (!selectedCountry) return;

                setShowCityDropdown(!showCityDropdown);
                setShowCountryDropdown(false);
              }}
            />
            {showCityDropdown && (
              <div className="absolute right-0 top-8 w-48 h-76 bg-white text-black border border-gray-300 rounded-lg shadow-lg z-50 overflow-y-auto no-scrollbar">
                {cities.map((city) => (
                  <div
                    key={`${city.countryCode}-${city.name}-${city.latitude}-${city.longitude}`}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleSelectCity(city)}
                  >
                    {city.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center py-3 px-2">
          <div className="flex items-center gap-3">
            <TiLocationArrowOutline className="text-2xl" />
            <p>Location Based Content</p>
          </div>
          <Switch
            checked={locationBasedContent}
            onChange={setLocationBasedContent}
            className={`${
              locationBasedContent ? "bg-blue-600" : "bg-gray-200"
            } relative inline-flex h-6 w-11 items-center rounded-full`}
          >
            <span
              className={`${
                locationBasedContent ? "translate-x-6" : "translate-x-1"
              } inline-block h-4 w-4 transform bg-white rounded-full transition`}
            />
          </Switch>
        </div>
      </div>
      <div className="px-4 mt-4">
        <div className="border-b border-gray-200"></div>
      </div>

      {/* Preferences */}
      <div className="px-2 mt-4">
        <h3 className="text-base font-semibold mb-2">Preferences</h3>
        <div
          onClick={handleFavoriteClick}
          className="flex justify-between items-center px-2 py-3 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <PiHeartStraightBold className="text-xl" />
            <p>My Favourites</p>
          </div>
          <GoChevronRight className="text-gray-900 text-2xl" />
        </div>

        {/* Inline input for Ticketname */}
        {showFavoriteInput && (
          <div className="px-2 py-2 flex items-center gap-2">
            <input
              type="text"
              value={favoriteValue}
              onChange={(e) => setFavoriteValue(e.target.value)}
              placeholder="Enter ticket name"
              className="flex-1 border border-gray-300 rounded-md p-2"
            />
            <button
              onClick={handleSaveFavorite}
              className="px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              Save
            </button>
          </div>
        )}
        <div className="flex justify-between items-center px-2 py-3">
          <div className="flex items-center gap-3">
            <LuWallet className="text-xl" />
            <p>Saved Payment Methods</p>
          </div>
          <GoChevronRight className="text-gray-900 text-2xl" />
        </div>
        <div
          className="flex justify-between items-center px-2 py-3 cursor-pointer"
          onClick={() => createPasskey()}
        >
          <div className="flex items-center gap-3">
            <HiOutlineKey className="text-xl" />
            <p>Create a Passkey</p>
          </div>
          <GoChevronRight className="text-gray-900 text-2xl" />
        </div>
      </div>
      <div className="px-4 mt-4">
        <div className="border-b border-gray-200"></div>
      </div>
      {/* Help & Guidance */}
      <div className="px-2 mt-4">
        <h3 className="text-base font-semibold mb-2">Help & Guidance</h3>

        <div className="flex justify-between items-center px-2 py-3">
          <div className="flex items-center gap-3">
            <MdOutlineHelpOutline className="text-xl" />
            <p>Need Help?</p>
          </div>
          <GoChevronRight className="text-gray-900 text-2xl" />
        </div>

        <div className="flex justify-between items-center px-2 py-3">
          <div className="flex items-center gap-3">
            <LuPen className="text-xl" />
            <p>Give Us Feedback</p>
          </div>
          <GoChevronRight className="text-gray-900 text-2xl" />
        </div>

        <div className="flex justify-between items-center px-2 py-3">
          <div className="flex items-center gap-3">
            <SlBookOpen className="text-xl" />
            <p>Legal</p>
          </div>
          <GoChevronRight className="text-gray-900 text-2xl" />
        </div>
      </div>

      {/* Notifications Modal */}
      <Modal
        isOpen={showNotificationsModal}
        onRequestClose={() => setShowNotificationsModal(false)}
        style={{
          content: {
            top: "50%",
            left: "50%",
            right: "auto",
            bottom: "auto",
            transform: "translate(-50%, -50%)",
            border: "none",
            borderRadius: "0.5rem",
            padding: "1.5rem",
            width: "90%",
            maxWidth: "25rem",
          },
          overlay: {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 10000,
          },
        }}
        ariaHideApp={false}
      >
        <h2 className="text-xl font-semibold mb-4">Edit Account</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2"
          />
        </div>
        <div className="flex justify-end gap-4">
          <button
            onClick={() => setShowNotificationsModal(false)}
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveNotifications}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-[#0139A7]"
          >
            Save
          </button>
        </div>
      </Modal>

      {/* <Toaster position="top-right" reverseOrder={false} /> */}
    </div>
  );
};

export default Account;
