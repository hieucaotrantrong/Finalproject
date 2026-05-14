import React, { useEffect, useState } from "react";

const SIDE_PREFIX = "side::";
const TOP_PREFIX = "top::";

const isSideBanner = (imageUrl = "") => imageUrl.startsWith(SIDE_PREFIX);
const isTopBanner = (imageUrl = "") => imageUrl.startsWith(TOP_PREFIX);
const toStoredImageUrl = (imageUrl = "", type = "carousel") => {
  const cleaned = imageUrl.replace(SIDE_PREFIX, "");
  const cleanedTop = cleaned.replace(TOP_PREFIX, "");

  if (type === "side") {
    return `${SIDE_PREFIX}${cleanedTop}`;
  }

  if (type === "top") {
    return `${TOP_PREFIX}${cleanedTop}`;
  }

  return cleanedTop;
};
const toDisplayImageUrl = (imageUrl = "") => imageUrl.replace(SIDE_PREFIX, "").replace(TOP_PREFIX, "");

export default function AdminBanner() {

  const [banners, setBanners] = useState([]);
  const [image, setImage] = useState("");
  const [bannerType, setBannerType] = useState("carousel");
  const [editingId, setEditingId] = useState(null);

  const API = "http://localhost:5000/api/banners";

  /* Load banners */
  const fetchBanners = async () => {
    const res = await fetch(API);
    const data = await res.json();
    setBanners(data);
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  /* Add banner */
  const addBanner = async () => {

    if (!image) return alert("Chọn banner!");

    await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image_url: toStoredImageUrl(image, bannerType)
      })
    });

    setImage("");
    setBannerType("carousel");
    fetchBanners();
  };

  /* Delete */
  const deleteBanner = async (id) => {

    await fetch(`${API}/${id}`, {
      method: "DELETE"
    });

    fetchBanners();
  };

  /* Edit */
  const startEdit = (banner) => {
    setEditingId(banner.id);
    setImage(toDisplayImageUrl(banner.image_url));
    setBannerType(isSideBanner(banner.image_url) ? "side" : isTopBanner(banner.image_url) ? "top" : "carousel");
  };

  /* Update */
  const updateBanner = async () => {

    await fetch(`${API}/${editingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image_url: toStoredImageUrl(image, bannerType)
      })
    });

    setEditingId(null);
    setImage("");
    setBannerType("carousel");
    fetchBanners();
  };

  const resolveBannerSrc = (imageUrl) => {
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

  return (
    <div className="p-10 bg-white min-h-screen">

    

      {/* Add banner */}
      <div className="bg-slate-100 border border-slate-200 p-3 rounded mb-6 text-center font-semibold text-slate-800">
        {editingId ? "Sửa Banner" : "Thêm Banner"}
      </div>

      <div className="flex gap-4 mb-8 items-center flex-wrap">

        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) setImage(file.name);
          }}
          className="border p-2"
        />

        <select
          value={bannerType}
          onChange={(e) => setBannerType(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="carousel">Banner chính </option>
          <option value="side">Banner 2 bên</option>
          <option value="top">Banner đầu </option>
        </select>

        {editingId ? (
          <button
            onClick={updateBanner}
            className="rounded border border-gray-300 bg-white px-4 py-2 text-gray-700 transition hover:border-gray-400"
          >
            Cập nhật
          </button>
        ) : (
          <button
            onClick={addBanner}
            className="rounded border border-gray-300 bg-white px-4 py-2 text-gray-700 transition hover:border-gray-400"
          >
            Thêm
          </button>
        )}

      </div>

      {/* Banner table */}
      <table className="w-full table-fixed bg-white rounded shadow text-sm">

        <thead className="bg-slate-100 text-slate-600 font-medium">

          <tr>
            <th className="w-16 p-3 font-medium">ID</th>
            <th className="w-[48%] p-3 font-medium">Banner</th>
            <th className="w-[18%] p-3 font-medium">Tên ảnh</th>
            <th className="w-[16%] p-3 font-medium">Loại</th>
            <th className="w-[12%] p-3 font-medium">Hành động</th>
          </tr>

        </thead>

        <tbody>

          {banners.map((banner) => (

            <tr key={banner.id} className="border-t text-center align-middle">

              <td className="p-3">{banner.id}</td>

              <td className="p-3">
                <div className="mx-auto flex h-20 w-full items-center justify-center overflow-hidden rounded bg-slate-50 px-2">
                  <img
                    src={resolveBannerSrc(banner.image_url)}
                    className="max-h-full max-w-full object-contain"
                    alt={toDisplayImageUrl(banner.image_url)}
                  />
                </div>
              </td>

              <td className="p-3 break-all">
                {toDisplayImageUrl(banner.image_url)}
              </td>

              <td className="p-3">
                {isSideBanner(banner.image_url)
                  ? "Banner ngang nhỏ"
                  : isTopBanner(banner.image_url)
                    ? "Banner đầu header"
                    : "Banner chính"}
              </td>

              <td className="p-3">
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => startEdit(banner)}
                    className="w-14 rounded border border-gray-500 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-100"
                  >
                    Sửa
                  </button>

                  <button
                    onClick={() => deleteBanner(banner.id)}
                    className="w-14 rounded border border-red-500 px-3 py-1 text-sm text-red-500 transition hover:bg-red-50"
                  >
                    Xóa
                  </button>
                </div>
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}