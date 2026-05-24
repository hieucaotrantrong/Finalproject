import React, { useEffect, useState } from "react";

const SIDE_PREFIX = "side::";
const TOP_PREFIX = "top::";

const isSideBanner = (imageUrl = "") => imageUrl.startsWith(SIDE_PREFIX);
const toDisplayImageUrl = (imageUrl = "") => imageUrl.replace(SIDE_PREFIX, "");

export default function Carousel() {
  const [banners, setBanners] = useState([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    fetch("http://localhost:5000/api/banners")
      .then((res) => res.json())
      .then((data) => {
        const filtered = (data || []).filter((item) => {
          const imageUrl = item?.image_url || "";
          return !isSideBanner(imageUrl) && !String(imageUrl).startsWith(TOP_PREFIX);
        });
        setBanners(filtered.slice(0, 2));
      })
      .catch(() => setBanners([]));
  }, []);

  const resolveBannerSrc = (imageUrl) => {
    if (!imageUrl) return "";
    const cleanImageUrl = toDisplayImageUrl(imageUrl);
    if (!cleanImageUrl) return "";

    if (
      cleanImageUrl.startsWith("http://") ||
      cleanImageUrl.startsWith("https://") ||
      cleanImageUrl.startsWith("/")
    ) {
      return cleanImageUrl;
    }

    const finalUrl = `/assets/${cleanImageUrl}`;
    console.log('Banner URL:', { imageUrl, cleanImageUrl, finalUrl });
    return finalUrl;
  };


  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [banners.length]);

  if (!banners.length) return null;

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 py-6">
      <div className="w-full overflow-hidden rounded-lg border border-gray-300">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {banners.map((banner, index) => (
            <img
              key={banner.id ?? index}
              src={resolveBannerSrc(banner.image_url)}
              alt={`banner-${index + 1}`}
              className="w-full h-64 object-cover flex-shrink-0"
            />
          ))}
        </div>
      </div>
    </div>
  );
}