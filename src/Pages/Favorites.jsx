import { useEffect } from "react";
import { IoHeartOutline } from "react-icons/io5";

const Favorites = () => {
  useEffect(() => {
    window.scrollTo(0, 0);

    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", "#ffffff");
  }, []);

  const refreshFavorites = () => {
    window.location.reload();
  };

  return (
    <main className="safe-area-page safe-area-light flex min-h-screen items-center justify-center bg-white px-6 pb-24 text-customBlack">
      <section className="flex w-full max-w-md -translate-y-4 flex-col items-center text-center">
        <div
          className="relative flex h-24 w-24 items-center justify-center rounded-full bg-customBlue"
          role="img"
          aria-label="Favorite events"
        >
          <span
            aria-hidden="true"
            className="absolute h-11 w-9 -translate-x-2 -rotate-6 rounded-sm border-[3px] border-white"
          />
          <span
            aria-hidden="true"
            className="absolute h-11 w-9 translate-x-2 rotate-6 rounded-sm border-[3px] border-white bg-customBlue"
          />
          <IoHeartOutline
            aria-hidden="true"
            className="relative z-10 h-6 w-6 translate-x-2 text-white"
          />
        </div>

        <h1 className="mt-12 text-2xl font-bold tracking-tight text-black">
          No favorite events
        </h1>

        <p className="mt-7 max-w-sm text-md leading-8 text-neutral-700">
          Events you favorite will automatically appear here
        </p>

        <button
          type="button"
          onClick={refreshFavorites}
          className="mt-9 flex min-h-12 w-[50%] items-center justify-center border-2 border-customBlue bg-white px-6 text-md font-bold text-customBlue transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue focus-visible:ring-offset-2 active:bg-blue-100"
        >
          Refresh
        </button>
      </section>
    </main>
  );
};

export default Favorites;