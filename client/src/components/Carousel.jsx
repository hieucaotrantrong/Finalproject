import React, { useEffect, useState } from "react";

export default function Carousel() {
  const [banners, setBanners] = useState([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    fetch("http://localhost:5000/api/banners")
      .then((res) => res.json())
      .then((data) => setBanners(data || []))
      .catch(() => setBanners([]));
  }, []);


  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [banners.length]);

  if (!banners.length) return null;

  return (
    <div className="w-full px-10 py-6">
      <div className="w-[85%] mx-auto overflow-hidden rounded-lg border border-gray-300">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {banners.map((banner, index) => (
            <img
              key={banner.id ?? index}
              src={`/assets/${banner.image_url}`}
              alt={`banner-${index + 1}`}
              className="w-full h-64 object-cover flex-shrink-0"
            />
          ))}
        </div>
      </div>
    </div>
  );
}