import React, { useState, useEffect } from "react";

export default function PromoBanner() {

  const [currentSlide, setCurrentSlide] = useState(0);
  const [banners, setBanners] = useState([]);

  /* lấy banner từ backend */
  useEffect(() => {
    fetch("http://localhost:5000/api/banners")
      .then((res) => res.json())
      .then((data) => setBanners(data || []))
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
                  src={`/assets/${banner.image_url}`}
                  alt={`banner-${index}`}
                  className="w-full h-56 object-fill"
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