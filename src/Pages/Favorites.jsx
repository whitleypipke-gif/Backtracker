import { useEffect } from "react";
import { IoHeartSharp } from "react-icons/io5";

const Favorites = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", "#ffffff");
  }, []);

  return (
    <main className="safe-area-page safe-area-light flex min-h-screen items-center justify-center bg-white px-6 pb-28">
      <section className="flex flex-col items-center text-center">
        <h1 className="text-xl font-semibold text-customBlue">
          No favorited items here...
        </h1>

        <div
          className="relative mt-7 flex h-32 w-36 items-center justify-center animate-pulse opacity-70"
          role="img"
          aria-label="Crossed-out heart"
        >
          <IoHeartSharp
            aria-hidden="true"
            className="h-full w-full text-customGray"
          />

          <span
            aria-hidden="true"
            className="absolute h-2 w-36 left-2 -rotate-45 rounded-full bg-customBlue ring-4 ring-white"
          />
        </div>
      </section>
    </main>
  );
};

export default Favorites;