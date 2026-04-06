import React, { useState, useEffect } from "react";

const SIDE_PREFIX = "side::";
const TOP_PREFIX = "top::";

const isSideBanner = (imageUrl = "") => imageUrl.startsWith(SIDE_PREFIX);
const isTopBanner = (imageUrl = "") => imageUrl.startsWith(TOP_PREFIX);
const toDisplayImageUrl = (imageUrl = "") => imageUrl.replace(SIDE_PREFIX, "").replace(TOP_PREFIX, "");

const resolveBannerSrc = (imageUrl = "") => {
  const cleanImageUrl = toDisplayImageUrl(imageUrl);

  if (!cleanImageUrl) return "";

  if (
    cleanImageUrl.startsWith("http://") ||
    cleanImageUrl.startsWith("https://") ||
    cleanImageUrl.startsWith("/")
  ) {
    return cleanImageUrl;
  }

  return `/assets/${cleanImageUrl}`;
};

export default function PromoBanner() {

  const [currentSlide, setCurrentSlide] = useState(0);
  const [banners, setBanners] = useState([]);


  useEffect(() => {
    fetch("http://localhost:5000/api/banners")
      .then((res) => res.json())
      .then((data) => {
        const horizontalBanners = (data || []).filter((banner) => {
          const imageUrl = banner?.image_url || "";
          return !isSideBanner(imageUrl) && !isTopBanner(imageUrl);
        });

        setBanners(horizontalBanners.slice(0, 2));
      })
      .catch(() => setBanners([]));
  }, []);

  /* auto slide */
  useEffect(() => {

    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 3000);

    return () => clearInterval(interval);

  }, [banners.length]);

  if (!banners.length) return null;

  return (
    <div className="w-full bg-white py-4">

      <div className="max-w-7xl mx-auto px-4">

        <div className="relative overflow-hidden rounded-lg">

          {/* Banner */}
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >

            {banners.map((banner, index) => (

              <div key={banner.id ?? index} className="w-full flex-shrink-0">

                <img
                    src={resolveBannerSrc(banner.image_url)}
                  alt={`banner-${index}`}
                    className="w-full h-56 object-cover"
                />

              </div>

            ))}

          </div>

          {/* Dots indicator */}
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">

            {banners.map((_, index) => (

              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full ${
                  currentSlide === index ? "bg-white" : "bg-white/50"
                }`}
              />

            ))}

          </div>

        </div>

      </div>

    </div>
  );
}