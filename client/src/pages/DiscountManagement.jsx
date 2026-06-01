import React, { useEffect, useState } from "react";
import { FaCheck, FaTimes } from "react-icons/fa";

const panelClass = "rounded-2xl border border-gray-200 bg-white";
const inputClass = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300";
const actionButtonClass = "px-6 py-2.5 rounded border transition-all text-[15px] font-medium whitespace-nowrap";

const DiscountManagement = () => {
  const API = "http://localhost:5000/api/discounts";
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [popup, setPopup] = useState({ show: false, message: "", type: "success" });

  const [form, setForm] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: "",
    min_amount: "",
    max_uses: "",
    expiry_date: "",
    description: "",
    is_active: true,
  });

  const [formErrors, setFormErrors] = useState({});

  // Fetch all discounts
  const fetchDiscounts = async () => {
    setLoading(true);
    try {
      const res = await fetch(API);
      const data = await res.json();
      setDiscounts(data);
    } catch (err) {
      showPopup("Lỗi khi lấy dữ liệu mã giảm giá", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  // Show popup notification
  const showPopup = (message, type = "success") => {
    setPopup({ show: true, message, type });
    setTimeout(() => setPopup({ show: false, message: "", type: "" }), 3000);
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (!form.code.trim()) errors.code = "Mã giảm giá không được để trống";
    if (!form.discount_value) errors.discount_value = "Giá trị giảm giá không được để trống";
    if (form.discount_type === "percentage" && (form.discount_value > 100 || form.discount_value < 0)) {
      errors.discount_value = "Phần trăm phải từ 0-100";
    }
    if (form.discount_type === "fixed" && form.discount_value < 0) {
      errors.discount_value = "Giảm giá phải lớn hơn 0";
    }
    if (form.min_amount && form.min_amount < 0) {
      errors.min_amount = "Giá trị tối thiểu phải lớn hơn 0";
    }
    return errors;
  };

  // Add new discount
  const handleAdd = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const payload = {
        ...form,
        discount_value: parseFloat(form.discount_value),
        min_amount: form.min_amount ? parseFloat(form.min_amount) : 0,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        expiry_date: form.expiry_date || null,
      };

      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showPopup("Tạo mã giảm giá thành công", "success");
        resetForm();
        fetchDiscounts();
      } else {
        const error = await res.json();
        showPopup(error.error || "Lỗi khi tạo mã giảm giá", "error");
      }
    } catch (err) {
      showPopup("Lỗi khi tạo mã giảm giá", "error");
    }
  };

  // Update discount
  const handleUpdate = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const payload = {
        ...form,
        discount_value: parseFloat(form.discount_value),
        min_amount: form.min_amount ? parseFloat(form.min_amount) : 0,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        expiry_date: form.expiry_date || null,
      };

      const res = await fetch(`${API}/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showPopup("Cập nhật mã giảm giá thành công", "success");
        resetForm();
        fetchDiscounts();
      } else {
        const error = await res.json();
        showPopup(error.error || "Lỗi khi cập nhật mã giảm giá", "error");
      }
    } catch (err) {
      showPopup("Lỗi khi cập nhật mã giảm giá", "error");
    }
  };

  // Delete discount
  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa mã giảm giá này?")) return;

    try {
      const res = await fetch(`${API}/${id}`, { method: "DELETE" });
      if (res.ok) {
        showPopup("Xóa mã giảm giá thành công", "success");
        fetchDiscounts();
      } else {
        showPopup("Lỗi khi xóa mã giảm giá", "error");
      }
    } catch (err) {
      showPopup("Lỗi khi xóa mã giảm giá", "error");
    }
  };

  // Start edit
  const handleEdit = (discount) => {
    setEditingId(discount.id);
    setForm({
      code: discount.code,
      discount_type: discount.discount_type,
      discount_value: discount.discount_value,
      min_amount: discount.min_amount,
      max_uses: discount.max_uses,
      expiry_date: discount.expiry_date ? discount.expiry_date.split("T")[0] : "",
      description: discount.description,
      is_active: discount.is_active,
    });
    setFormErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Reset form
  const resetForm = () => {
    setForm({
      code: "",
      discount_type: "percentage",
      discount_value: "",
      min_amount: "",
      max_uses: "",
      expiry_date: "",
      description: "",
      is_active: true,
    });
    setEditingId(null);
    setFormErrors({});
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("vi-VN", {
      // format as number with thousands separator (no currency symbol)
      style: "decimal",
    }).format(value || 0);
  };

  const formatDate = (date) => {
    if (!date) return "Không hạn";
    return new Date(date).toLocaleDateString("vi-VN");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-gray-900">
      {/* Popup Notification */}
      {popup.show && (
        <div className={`fixed top-4 right-4 p-4 rounded-xl text-white shadow-lg ${popup.type === "success" ? "bg-emerald-600" : "bg-rose-600"} z-50`}>
          {popup.message}
        </div>
      )}

      <div className="mx-auto max-w-[1400px] space-y-5">
        <section className={`${panelClass} p-5 shadow-sm`}>
         
        </section>

        {/* Form */}
        <section className={`${panelClass} p-6 shadow-sm`}>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Mã Giảm Giá */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-800">Mã Giảm Giá *</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => {
                setForm({ ...form, code: e.target.value.toUpperCase() });
                if (formErrors.code) setFormErrors({ ...formErrors, code: "" });
              }}
              placeholder="VD: SAVE20"
              className={`${inputClass} ${formErrors.code ? "border-rose-500 ring-1 ring-rose-300" : ""}`}
            />
            {formErrors.code && <p className="text-rose-600 text-sm mt-1">{formErrors.code}</p>}
          </div>

          {/* Loại Giảm Giá */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-800">Loại Giảm Giá *</label>
            <select
              value={form.discount_type}
              onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
              className={inputClass}
            >
              <option value="percentage">Phần Trăm (%)</option>
              <option value="fixed">Số Tiền Cố Định (đ)</option>
            </select>
          </div>

          {/* Giá Trị Giảm Giá */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-800">
              Giá Trị Giảm Giá ({form.discount_type === "percentage" ? "%" : "đ"}) *
            </label>
            <input
              type="number"
              value={form.discount_value}
              onChange={(e) => {
                setForm({ ...form, discount_value: e.target.value });
                if (formErrors.discount_value) setFormErrors({ ...formErrors, discount_value: "" });
              }}
              placeholder="Nhập giá trị"
              className={`${inputClass} ${formErrors.discount_value ? "border-rose-500 ring-1 ring-rose-300" : ""}`}
              min="0"
              max={form.discount_type === "percentage" ? "100" : ""}
              step="0.01"
            />
            {formErrors.discount_value && <p className="text-rose-600 text-sm mt-1">{formErrors.discount_value}</p>}
          </div>

          {/* Giá Trị Tối Thiểu */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-800">Giá Trị Tối Thiểu (đ)</label>
            <input
              type="text"
              value={form.min_amount ? formatCurrency(Number(form.min_amount)) : ''}
              onChange={(e) => {
                // Keep only digits when typing
                const digits = e.target.value.replace(/\D/g, '');
                setForm({ ...form, min_amount: digits ? Number(digits) : '' });
                if (formErrors.min_amount) setFormErrors({ ...formErrors, min_amount: "" });
              }}
              placeholder="VD: 500000"
              className={`${inputClass} ${formErrors.min_amount ? "border-rose-500 ring-1 ring-rose-300" : ""}`}
            />
            <p className="text-xs text-gray-500 mt-1">Áp dụng cho đơn hàng từ mức này trở lên.</p>
          </div>

          {/* Số Lần Sử Dụng Tối Đa */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-800">Số Lần Sử Dụng Tối Đa</label>
            <input
              type="number"
              value={form.max_uses}
              onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
              placeholder="VD: 100 (để trống = vô hạn)"
              className={inputClass}
              min="1"
            />
          </div>

          {/* Ngày Hết Hạn */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-800">Ngày Hết Hạn</label>
            <input
              type="date"
              value={form.expiry_date}
              onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        {/* Mô Tả */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2 text-gray-800">Mô Tả</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Mô tả về mã giảm giá (VD: Giảm 20% cho khách hàng mới)"
            className={`${inputClass} h-24 resize-none`}
          />
        </div>

        {/* Trạng Thái */}
        <div className="flex items-center mb-6 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            className="w-4 h-4 mr-2 accent-gray-600"
          />
          <label className="text-sm font-medium text-gray-800">Kích Hoạt Mã Giảm Giá</label>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={editingId ? handleUpdate : handleAdd}
            className={`${actionButtonClass} bg-white border-gray-500 text-gray-700 hover:bg-gray-100`}
          >
            {editingId ? "Cập Nhật" : "Tạo Mã"}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className={`${actionButtonClass} bg-white border-gray-300 text-gray-700 hover:border-gray-400`}
            >
              Hủy
            </button>
          )}
        </div>
        </section>

      {/* Discounts Table */}
        <section className={`${panelClass} p-5 shadow-sm`}>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm bg-white">
          <thead className="bg-gray-100 text-gray-800">
            <tr>
              <th className="px-4 py-2 text-left">Mã</th>
              <th className="px-4 py-2 text-left">Loại</th>
              <th className="px-4 py-2 text-left">Giá Trị</th>
              <th className="px-4 py-2 text-left">Tối Thiểu</th>
              <th className="px-4 py-2 text-left">Hạn Chế</th>
              <th className="px-4 py-2 text-left">Còn Lại</th>
              <th className="px-4 py-2 text-left">Hết Hạn</th>
              <th className="px-4 py-2 text-left">Trạng Thái</th>
              <th className="px-4 py-2 text-center">Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="px-4 py-4 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : discounts.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-4 py-4 text-center text-gray-500">
                  Chưa có mã giảm giá nào
                </td>
              </tr>
            ) : (
              discounts.map((discount) => (
                <tr key={discount.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-gray-800">{discount.code}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full border border-gray-300 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700">
                      {discount.discount_type === "percentage" ? "%" : "đ"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {discount.discount_type === "percentage"
                      ? `${discount.discount_value}%`
                      : formatCurrency(discount.discount_value)}
                  </td>
                  <td className="px-4 py-3">{formatCurrency(discount.min_amount)}</td>
                  <td className="px-4 py-3">{discount.max_uses || "Vô hạn"}</td>
                                    <td className="px-4 py-3 font-semibold text-blue-600">
                                      {discount.max_uses ? `${Math.max(0, discount.max_uses - (discount.current_uses || 0))}` : "Vô hạn"}
                                    </td>
                  <td className="px-4 py-3">{formatDate(discount.expiry_date)}</td>
                  <td className="px-4 py-3">
                    {discount.is_active ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700 text-xs font-semibold">
                        <FaCheck /> Hoạt động
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700 text-xs font-semibold">
                        <FaTimes /> Vô hiệu
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <button
                      onClick={() => handleEdit(discount)}
                      className="rounded border border-gray-500 px-3 py-1 mr-2 text-sm text-gray-700 transition hover:bg-gray-100"
                      title="Chỉnh sửa"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(discount.id)}
                      className="rounded border border-red-500 px-3 py-1 text-sm text-red-500 transition hover:bg-red-50"
                      title="Xóa"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
        </section>
      </div>
    </div>
  );
};

export default DiscountManagement;
