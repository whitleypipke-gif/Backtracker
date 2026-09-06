import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
const CACHE_MIGRATION_KEY = "cloudinary-cache-cleared-2.7";

const clearOldCloudinaryCache = async () => {
  if (!("caches" in window)) return;

  if (localStorage.getItem(CACHE_MIGRATION_KEY)) {
    return;
  }

  try {
    await caches.delete("cloudinary-images");

    localStorage.setItem(CACHE_MIGRATION_KEY, "true");

    console.log("Old Cloudinary image cache cleared");
  } catch (error) {
    console.error("Failed to clear Cloudinary cache:", error);
  }
};

clearOldCloudinaryCache();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
