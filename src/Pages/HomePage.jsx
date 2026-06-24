import React, { useState, useEffect } from "react";
import Navbar from "../Components/NavBar";
import { db } from "../firebase.config"; // Adjust if needed
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";

// 1) Import the arrow icon
import { GoArrowRight } from "react-icons/go";

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedTitle, setSelectedTitle] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const snapshot = await getDocs(collection(db, "posts"));
        // Store {id, ...data} so we can delete by ID later
        const fetchedPosts = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));
        setPosts(fetchedPosts);
      } catch (err) {
        console.error("Error fetching posts:", err);
      }
    };
    fetchPosts();
  }, []);

  // Separate mainEvent, mainOthers, and popularNearYou
  const mainEventPost = posts.find((p) => p.eventType === "Main Event");
  const mainOthers = posts.filter((p) => p.eventType === "Main Others");
  const popularNearYou = posts.filter(
    (p) => p.eventType === "Popular Near You"
  );

  // Example subCategories
  const subCategories = [
    "Concerts",
    "Sports",
    "Arts Theater & Comedy",
    "Family",
  ];
  const featuredEvents = posts.filter((p) => p.eventType === "Featured");

  // Confirm & delete from Firestore
  const handleDelete = async (postId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this event?"
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "posts", postId));
      // Remove from local state
      setPosts((prev) => prev.filter((item) => item.id !== postId));
      alert("Event deleted successfully!");
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  // Click on a card (image area) => toggle selection
  const handleCardClick = (index) => {
    if (selectedCard === index) {
      setSelectedCard(null);
      setSelectedTitle(null);
    } else {
      setSelectedCard(index);
      setSelectedTitle(index);
    }
  };

  // Click on the title => toggle selection
  const handleTitleClick = (index, e) => {
    e.stopPropagation();
    if (selectedTitle === index) {
      setSelectedCard(null);
      setSelectedTitle(null);
    } else {
      setSelectedCard(index);
      setSelectedTitle(index);
    }
  };

  // Click on partial blue overlay => ask for delete
  const handleArrowClick = (e, postId) => {
    e.stopPropagation();
    handleDelete(postId);
  };

  useEffect(() => {
  window.scrollTo(0, 0);

  document.documentElement.style.setProperty(
    "--safe-area-color",
    "#121212"
  );
}, []);

  return (
    <>
      <Navbar />

      <main className="bg-white  text-white">
        {/* MAIN EVENT or fallback hero */}
        {mainEventPost ? (
          <section
            className="relative flex h-54 bg-cover bg-center"
            style={{ backgroundImage: `url('${mainEventPost.imageUrl}')` }}
          >
            {/* Dark Overlay if desired */}
            {/* <div className="absolute inset-0 bg-black bg-opacity-30"></div> */}
            <div className="absolute bottom-4 left-4 z-10 text-white">
              {/* Title in big text or subheading */}
              <h1 className="text-xl font-medium mb-3">
                {mainEventPost.title}
              </h1>
              {/* CoverTag on button => deletes post */}
              <button
                onClick={() => handleDelete(mainEventPost.id)}
                className="bg-customBlue hover:bg-[#0139A7] px-5 py-2.5 text-white rounded font-semibold"
              >
                {mainEventPost.coverTag || "Main Event"}
              </button>
            </div>
          </section>
        ) : (
          // Fallback hero
          <section
            className="relative flex h-54 bg-cover bg-center"
            style={{ backgroundImage: `url('/shakira.jpg')` }}
          >
            <div className="absolute inset-0 bg-black bg-opacity-30"></div>
            <div className="absolute bottom-4 left-4 z-10 text-white">
              <h1 className="text-xl font-medium mb-3">Shakira</h1>
              <button className="bg-customBlue hover:bg-[#0139A7] px-4 py-2 text-white rounded font-semibold">
                Find Tickets
              </button>
            </div>
          </section>
        )}

        {/* MAIN OTHERS */}
        {mainOthers.length > 0 && (
          <section className="bg-white text-black p-4">
            {/* <h2 className="text-xl font-bold mb-4">Main Others</h2> */}
            <div className="grid gap-6 md:grid-cols-2">
              {mainOthers.map((post, index) => {
                const isCardSelected = selectedCard === `mOthers_${index}`;
                const isTitleSelected = selectedTitle === `mOthers_${index}`;

                return (
                  <div
                    key={post.id}
                    className="cursor-pointer"
                    onClick={() => handleCardClick(`mOthers_${index}`)}
                  >
                    <div className="relative w-full h-48 overflow-hidden rounded-lg shadow-md mb-2">
                      {isCardSelected && (
                        <div className="absolute inset-0 bg-customBlue/20 z-10" />
                      )}
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                      {isCardSelected && (
                        <div
                          className="absolute top-0 right-0 h-full w-8 bg-customBlue flex items-center justify-center z-20"
                          onClick={(e) => handleArrowClick(e, post.id)}
                        >
                          <GoArrowRight className="text-white w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="px-4">
                      <p className="text-gray-700 mb-1">{post.coverTag}</p>
                      <h3
                        onClick={(e) => handleTitleClick(`mOthers_${index}`, e)}
                        className={`
                          text-lg
                          font-semibold
                          mt-2
                          hover:underline
                          cursor-pointer
                          ${
                            isTitleSelected
                              ? "text-customBlue underline"
                              : "text-black"
                          }
                        `}
                      >
                        {post.title}
                      </h3>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="px-4 mt-4">
          <div className="border-t border-gray-300"></div>
        </div>

        {/* POPULAR NEAR YOU */}
        <section className="bg-white text-black p-4">
          <h2 className="text-xl font-bold mb-6 text-center">
            POPULAR NEAR YOU
          </h2>

          {subCategories.map((subCat) => {
            const subCatPosts = popularNearYou.filter(
              (p) => p.subCategory === subCat
            );

            // If no posts for this subCat, skip
            if (subCatPosts.length === 0) return null;

            return (
              <div key={subCat} className="mb-10">
                {/* Category header (e.g. Concerts) with 'See All' */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-lg font-semibold">{subCat}</h3>
                  <button className="text-blue-600 font-medium hover:underline">
                    See All
                  </button>
                </div>

                {/* Display each post in this subCategory */}
                <div className="grid gap-6 md:grid-cols-2">
                  {subCatPosts.map((post) => {
                    // We'll no longer handle highlight logic (isCardSelected etc.)
                    // We'll just show a "Delete Arrow" button on the right side of the image.
                    const handleArrowClick = (e, postId) => {
                      e.stopPropagation();
                      const confirmDelete = window.confirm(
                        "Are you sure you want to delete this event?"
                      );
                      if (!confirmDelete) return;
                      handleDelete(postId);
                    };

                    return (
                      <div key={post.id} className="cursor-pointer">
                        {/* Image & Button Container */}
                        <div className="relative w-full h-48 overflow-hidden rounded-lg shadow-md mb-2">
                          <img
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-full h-full  object-cover"
                          />
                          {/* Always-visible Button with Arrow (top-right) */}
                          <button
                            onClick={(e) => handleArrowClick(e, post.id)}
                            className="
                    absolute 
                    top-1/2 
                    right-0 
                    transform 
                    translate-y-8
                    bg-customBlue 
                    text-white 
                    px-3
                    py-2 
                    rounded-sm 
                    shadow 
                    flex 
                    items-center 
                    justify-center
                  "
                          >
                            <GoArrowRight className="text-2xl" />
                          </button>
                        </div>
                        <div className="px-2">
                          {/* Possibly show the genre or R&B as post.coverTag */}
                          <p className="text-gray-700 mb-1">{post.coverTag}</p>
                          <h4
                            className="
                    text-base 
                    font-semibold 
                    mt-1 
                    hover:underline 
                    cursor-pointer 
                    text-black
                  "
                          >
                            {post.title}
                          </h4>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
        {/* HORIZONTAL LINE SEPARATOR */}
        <div className="px-4 ">
          <div className="border-t border-gray-300"></div>
        </div>

        {/* FEATURED EVENTS SECTION */}
        {featuredEvents.length > 0 && (
          <section className="bg-white text-black px-4">
            <h2 className="text-xl font-bold mb-6 mt-4 text-center">
              FEATURED 
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {featuredEvents.map((post, index) => {
                // We'll mimic the "Main Others" logic for highlighting
                const isCardSelected = selectedCard === `featured_${index}`;
                const isTitleSelected = selectedTitle === `featured_${index}`;

                return (
                  <div
                    key={post.id}
                    className="cursor-pointer"
                    onClick={() => handleCardClick(`featured_${index}`)}
                  >
                    <div className="relative w-full h-48 overflow-hidden rounded-lg shadow-md mb-2">
                      {/* If selected, show translucent blue overlay */}
                      {isCardSelected && (
                        <div className="absolute inset-0 bg-customBlue/20 z-10" />
                      )}
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                      {/* Show delete arrow if selected */}
                      {isCardSelected && (
                        <div
                          className="absolute top-0 right-0 h-full w-8 bg-customBlue flex items-center justify-center z-20"
                          onClick={(e) => handleArrowClick(e, post.id)}
                        >
                          <GoArrowRight className="text-white w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="px-4">
                      {/* Only Title (no coverTag) */}
                      <h3
                        onClick={(e) =>
                          handleTitleClick(`featured_${index}`, e)
                        }
                        className={`
                  text-lg 
                  font-semibold 
                  mt-2 
                  hover:underline 
                  cursor-pointer
                  ${
                    isTitleSelected ? "text-customBlue underline" : "text-black"
                  }
                `}
                      >
                        {post.title}
                      </h3>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </>
  );
};

export default Home;
