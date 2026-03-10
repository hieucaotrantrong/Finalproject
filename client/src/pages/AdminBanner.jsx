import React, { useEffect, useState } from "react";

export default function AdminBanner() {

  const [banners, setBanners] = useState([]);
  const [image, setImage] = useState("");
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
        image_url: image
      })
    });

    setImage("");
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
    setImage(banner.image_url);
  };

  /* Update */
  const updateBanner = async () => {

    await fetch(`${API}/${editingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image_url: image
      })
    });

    setEditingId(null);
    setImage("");
    fetchBanners();
  };

  return (
    <div className="p-10 bg-gray-100 min-h-screen">

      <h1 className="text-2xl font-bold mb-6">
        Quản lý Banner
      </h1>

      {/* Add banner */}
      <div className="bg-yellow-400 p-3 rounded mb-6 text-center font-semibold">
        {editingId ? "Sửa Banner" : "Thêm Banner"}
      </div>

      <div className="flex gap-4 mb-8">

        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) setImage(file.name);
          }}
          className="border p-2"
        />

        {editingId ? (
          <button
            onClick={updateBanner}
            className="bg-yellow-500 text-white px-4 py-2 rounded"
          >
            Cập nhật
          </button>
        ) : (
          <button
            onClick={addBanner}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Thêm
          </button>
        )}

      </div>

      {/* Banner table */}
      <table className="w-full bg-white rounded shadow">

        <thead className="bg-yellow-400">

          <tr>
            <th className="p-3">ID</th>
            <th className="p-3">Banner</th>
            <th className="p-3">Tên ảnh</th>
            <th className="p-3">Hành động</th>
          </tr>

        </thead>

        <tbody>

          {banners.map((banner) => (

            <tr key={banner.id} className="border-t text-center">

              <td className="p-3">{banner.id}</td>

              <td className="p-3">
                <img
                  src={`/assets/${banner.image_url}`}
                  className="h-16 mx-auto"
                />
              </td>

              <td className="p-3">
                {banner.image_url}
              </td>

              <td className="p-3">

                <button
                  onClick={() => startEdit(banner)}
                  className="bg-yellow-400 px-3 py-1 rounded mr-2"
                >
                  Sửa
                </button>

                <button
                  onClick={() => deleteBanner(banner.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded"
                >
                  Xóa
                </button>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}