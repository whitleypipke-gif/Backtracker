import React, { useState } from "react";
import CountryFlag from "react-country-flag";
import { GoChevronRight, GoChevronDown } from "react-icons/go";
import { useAuth } from "../Context/AuthContext";
import { useEffect } from "react";
import { Country, City } from "country-state-city";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.config";

import { FaMapMarkerAlt, FaCalendarAlt } from "react-icons/fa";
import { TiLocationArrowOutline } from "react-icons/ti";
import { LuCalendarFold } from "react-icons/lu";
import { GrSearch } from "react-icons/gr";
const Navbar = () => {
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);

  const [selectedCountry, setSelectedCountry] = useState(null);
  const [userCountry, setUserCountry] = useState(null)

  const [city, setCity] = useState("Los Angeles, CA");
  const [dates, setDates] = useState("All Dates");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCity, setSelectedCity] = useState(
    ''
  );
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const [selectedDate, setSelectedDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Truncate city name if longer than 20 chars
  const truncatedCity =
    selectedCity.length > 20 ? selectedCity.slice(0, 17) + "..." : selectedCity;
  const { user } = useAuth();

  const handleSelectCountry = (country) => {
    setSelectedCountry(country);
    setSelectedCity("");
    setShowCountryDropdown(false);
  };

  const handleSelectCity = (city) => {
    setSelectedCity(city.name);
    localStorage.setItem("selectedCity", city.name);
    setShowCityDropdown(false);
  };

  useEffect(() => {
    if (!user) return;
    const fetchCountry = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists() && snap.data().country?.isoCode) {
          setSelectedCountry(snap.data().country);
          setUserCountry(snap.data().country);
        } else {
          const nigeria = Country.getAllCountries().find(
            (c) => c.isoCode === "US",
          );

          setSelectedCountry(nigeria);
        }
      } catch (err) {
        console.error("Error loading country:", err);
      }
    };
    fetchCountry();
  }, [user]);

  useEffect(() => {
    const allCountries = Country.getAllCountries();
    setCountries(allCountries);
  }, []);

  useEffect(() => {
    if (!selectedCountry) return;

    const countryCities = City.getCitiesOfCountry(selectedCountry.isoCode);

    setCities(countryCities || []);

    if (countryCities && countryCities.length > 0 && !selectedCity) {
      setSelectedCity(countryCities[0].name);
    }
  }, [selectedCountry]);

  // List of countries (ISO code + name)
  // const countries = [
  //   { code: "US", name: "United States" },
  //   { code: "GB", name: "United Kingdom" },
  //   { code: "CA", name: "Canada" },
  //   { code: "FR", name: "France" },
  //   { code: "DE", name: "Germany" },
  //   { code: "IT", name: "Italy" },
  //   { code: "ES", name: "Spain" },
  //   { code: "AU", name: "Australia" },
  //   { code: "BR", name: "Brazil" },
  //   { code: "CN", name: "China" },
  //   { code: "IN", name: "India" },
  //   { code: "JP", name: "Japan" },
  //   { code: "MX", name: "Mexico" },
  //   { code: "RU", name: "Russia" },
  //   { code: "ZA", name: "South Africa" },
  //   { code: "NG", name: "Nigeria" },
  //   { code: "EG", name: "Egypt" },
  //   { code: "TR", name: "Turkey" },
  //   { code: "KR", name: "South Korea" },
  //   { code: "SA", name: "Saudi Arabia" },
  //   { code: "AE", name: "United Arab Emirates" },
  //   { code: "CH", name: "Switzerland" },
  //   { code: "SE", name: "Sweden" },
  //   { code: "NO", name: "Norway" },
  //   { code: "FI", name: "Finland" },
  //   { code: "PL", name: "Poland" },
  //   { code: "GR", name: "Greece" },
  //   { code: "NL", name: "Netherlands" },
  //   { code: "AR", name: "Argentina" },
  //   { code: "CL", name: "Chile" },
  // ];
  // const cities = [
  //   "Los Angeles",
  //   "New York",
  //   "Chicago",
  //   "Houston",
  //   "Phoenix",
  //   "Philadelphia",
  //   "San Antonio",
  //   "San Diego",
  //   "Dallas",
  //   "San Jose",
  //   "Austin",
  //   "Jacksonville",
  //   "Fort Worth",
  //   "Columbus",
  //   "San Francisco",
  //   "Charlotte",
  //   "Indianapolis",
  //   "Seattle",
  //   "Denver",
  //   "Washington D.C.",
  // ];

  const categories = [
    "Concerts",
    "Sports",
    "Arts, Theater & Comedy",
    "Festivals",
    "Family",
    "Music Festivals",
    "Broadway Shows",
    "Opera",
    "Stand-Up Comedy",
    "Circus",
    "Wrestling",
    "Basketball",
    "Baseball",
    "Football",
    "Soccer",
    "Tennis",
    "Esports",
    "Motorsports",
    "Nightlife",
    "Conferences",
  ];

  // Handle country selection
  // const handleSelectCountry = (countryObj) => {
  //   setSelectedCountry(countryObj);
  //   setShowDropdown(false);
  // };

  const handleDateChange = (e) => {
    setDates(e.target.value === "" ? "All Dates" : e.target.value);
  };

  const handleSearch = () => {
    alert(`Searching for: ${searchTerm}`);
  };
  // const handleSelectCity = (city) => {
  //   setSelectedCity(city);
  //   localStorage.setItem("selectedCity", city);
  // };

  return (
    <nav className="bg-customBlack   text-white py-4  px-2 flex flex-col md:flex-row md:items-center md:justify-between">
      {/* Top Row: Logo (Centered) and Country Selector (Right) */}
      <div>
        <div className="flex items-center justify-between w-full">
          <div></div>
          {/* Centered Logo */}
          <div className="flex justify-center">
            <img src="/logo.png" alt="Logo" className="h-6" />
          </div>

          {/* Country Selector (Right) */}
          <div className="">
            <button
              className="flex items-center h-7 w-7 gap-2 bg-black text-white rounded-full cursor-pointer px-0.5"
            >
              <div className="w-6 h-6 flex items-center p-0.5 justify-center rounded-full overflow-hidden border border-white">
                <CountryFlag
                  countryCode={userCountry?.isoCode}
                  svg
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "50%",
                  }}
                />
              </div>
            </button>

        
          </div>
        </div>

        {/* Bottom Row: Location + Date + Search */}
        <div className="flex items-center mt-3 w-full">
          {/* Location Selector */}
          <div className="relative flex items-center w-full text-white border-r border-gray-500">
            <TiLocationArrowOutline className="text-customBlue text-xl mr-2" />

            <button
              className="flex items-center text-left"
              onClick={() => {
                setShowCountryDropdown(!showCountryDropdown);
                setShowCityDropdown(false);
              }}
            >
              <span className="mr-1 text-sm">{selectedCountry?.name || "Country"}</span>

              <GoChevronDown />
            </button>

            <button
              className="flex items-center mx-2 text-left"
              onClick={() => {
                if (!selectedCountry) return;

                setShowCityDropdown(!showCityDropdown);
                setShowCountryDropdown(false);
              }}
            >
              <span className="mr-1 text-sm">{selectedCity || "City"}</span>

              <GoChevronDown />
            </button>

            {showCountryDropdown && (
              <div className="absolute top-8 left-0 w-64 max-h-80 overflow-y-auto bg-white text-black rounded shadow-lg z-50 no-scrollbar">
                {countries.map((country) => (
                  <div
                    key={country.isoCode}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                    onClick={() => {
                      setSelectedCountry(country);
                      setSelectedCity("");
                      setShowCountryDropdown(false);
                    }}
                  >
                    <CountryFlag countryCode={country.isoCode} svg />

                    {country.name}
                  </div>
                ))}
              </div>
            )}

            {showCityDropdown && (
              <div className="absolute top-8 left-40 w-64 max-h-76 overflow-y-auto bg-white text-black rounded shadow-lg z-50 no-scrollbar">
                {cities.map((city) => (
                  <div
                    key={`${city.name}-${city.latitude}-${city.longitude}`}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setSelectedCity(city.name);
                      setShowCityDropdown(false);
                    }}
                  >
                    {city.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Date Selector */}
          <div
            className="flex items-center justify-end cursor-pointer text-white w-full"
            onClick={() => setShowDatePicker(!showDatePicker)}
          >
            <div className="flex items-center gap-1">
              <LuCalendarFold className="text-customBlue mr-1" />
              <span className="text-sm">{selectedDate || "All Dates"}</span>
            </div>
            <GoChevronRight className="text-xl" />
          </div>

          {/* Calendar Popover (Hidden until clicked) */}
          {showDatePicker && (
            <input
              type="date"
              className="absolute top-24 right-4 bg-white p-2 rounded shadow-md text-black z-10"
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setShowDatePicker(false);
              }}
            />
          )}
        </div>
      </div>
      <div className="border-b border-gray-50 mt-3"></div>
      <div className="flex items-center mt-3 bg-white  font-medium overflow-hidden rounded-xs relative w-full md:w-60">
        <input
          type="text"
          placeholder="Search by Artist, Event or Venue"
          className="text-black px-2 py-2 w-full focus:outline-none pr-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <GrSearch className="absolute text-customBlue right-3  text-xl" />
      </div>
      <div className="mt-6 overflow-x-auto whitespace-nowrap no-scrollbar">
        <div className="flex gap-2 w-max">
          {categories.map((category, index) => (
            <button
              key={index}
              className="px-4 py-2 border-1 border-white text-white font-medium text-sm rounded-sm hover:bg-white hover:text-black transition"
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
