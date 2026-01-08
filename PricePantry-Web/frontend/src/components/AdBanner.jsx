import React from "react";
import { Megaphone } from "lucide-react";

/**
 * AdBanner - Placeholder component for Google AdSense integration
 * 
 * Usage:
 * - <AdBanner type="horizontal" /> - For wide banners (leaderboard)
 * - <AdBanner type="rectangle" /> - For sidebar/inline ads
 * - <AdBanner type="mobile" /> - For mobile-optimized ads
 * 
 * To integrate Google AdSense:
 * 1. Replace the placeholder content with your AdSense ad unit code
 * 2. Add your AdSense script to public/index.html
 */
export const AdBanner = ({ type = "horizontal", className = "" }) => {
  // Define dimensions based on ad type
  const adConfig = {
    horizontal: {
      minHeight: "90px",
      maxWidth: "728px",
      label: "Ad - 728×90 Leaderboard",
    },
    rectangle: {
      minHeight: "250px",
      maxWidth: "300px",
      label: "Ad - 300×250 Rectangle",
    },
    mobile: {
      minHeight: "50px",
      maxWidth: "320px",
      label: "Ad - 320×50 Mobile",
    },
  };

  const config = adConfig[type] || adConfig.horizontal;

  return (
    <div
      className={`ad-banner-placeholder ${className}`}
      style={{
        minHeight: config.minHeight,
        maxWidth: config.maxWidth,
        width: "100%",
        margin: "0 auto",
      }}
      data-testid={`ad-banner-${type}`}
    >
      <div
        className="w-full h-full bg-gradient-to-r from-gray-100 to-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 p-4"
        style={{ minHeight: config.minHeight }}
      >
        <Megaphone className="w-6 h-6" />
        <span className="text-xs font-medium text-center">{config.label}</span>
        <span className="text-[10px] opacity-70">Google AdSense Placeholder</span>
      </div>
    </div>
  );
};

export default AdBanner;
