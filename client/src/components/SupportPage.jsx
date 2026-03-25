import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IoMdClose } from "react-icons/io";
import Home from "./Home";
import Footers from "./Footers";
import Carousel from "./Carousel";

const SIDE_PREFIX = "side::";

const isSideBanner = (imageUrl = "") => imageUrl.startsWith(SIDE_PREFIX);
const toDisplayImageUrl = (imageUrl = "") => imageUrl.replace(SIDE_PREFIX, "");

export default function SupportPage() {
    const navigate = useNavigate();
    const [sideBanner, setSideBanner] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        topic: "Giao hàng",
        message: "",
    });

    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch("http://localhost:5000/api/banners")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const firstSideBanner = data.find((item) => isSideBanner(item.image_url));
                    setSideBanner(firstSideBanner || null);
                }
            })
            .catch(err => console.log("Lỗi fetch banner:", err));
    }, []);

    const resolveBannerSrc = (banner) => {
        const cleanImageUrl = toDisplayImageUrl(banner?.image_url || "");

        if (!cleanImageUrl) {
            return "/assets/bannerngang.png";
        }

        if (
            cleanImageUrl.startsWith("http://") ||
            cleanImageUrl.startsWith("https://") ||
            cleanImageUrl.startsWith("/")
        ) {
            return cleanImageUrl;
        }

        return `/assets/${cleanImageUrl}`;
    };

    const sideBannerSrc = resolveBannerSrc(sideBanner);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccess(false);
        setError("");
        console.log(" Gửi yêu cầu:", formData);

        try {
            const res = await fetch("http://localhost:5000/api/support", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const result = await res.json();
            console.log(" Phản hồi từ server:", result);

            if (res.ok) {
                setSuccess(true);
                setFormData({ name: "", email: "", topic: "Giao hàng", message: "" });
            } else {
                setError(result.error || "Gửi thất bại. Vui lòng thử lại.");
            }
        } catch (err) {
            console.error("❌ Lỗi:", err);
            setError("Không thể kết nối đến server.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header từ Home component */}
            <Home />

            {/* Side Banners */}
            <div className="hidden xl:block fixed left-3 top-[190px] z-40">
                <img
                    src={sideBannerSrc}
                    alt="Left side banner"
                    className="w-[110px] h-[330px] rounded-lg object-cover"
                />
            </div>

            <div className="hidden xl:block fixed right-3 top-[190px] z-40">
                <img
                    src={sideBannerSrc}
                    alt="Right side banner"
                    className="w-[110px] h-[330px] rounded-lg object-cover"
                />
            </div>

            <Carousel />

            {/* Support Content */}
            <div className="max-w-2xl mx-auto pt-10 pb-10 px-6">
                <div className="bg-white shadow-md rounded-xl p-6 relative">
                    <h2 className="text-2xl font-bold mb-4">Liên hệ hỗ trợ</h2>
                    <p className="mb-6 text-gray-600">
                        Bạn gặp vấn đề? Hãy gửi thông tin cho chúng tôi để được hỗ trợ nhanh nhất.
                    </p>

                    {success && (
                        <div className="mb-4 text-green-600 font-semibold">
                            Gửi thành công! Chúng tôi sẽ phản hồi sớm nhất.
                        </div>
                    )}
                    {error && (
                        <div className="mb-4 text-red-600 font-semibold">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                            type="text"
                            name="name"
                            placeholder="Họ và tên"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full border border-gray-300 p-2 rounded-md"
                        />
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="w-full border border-gray-300 p-2 rounded-md"
                        />
                        <select
                            name="topic"
                            value={formData.topic}
                            onChange={handleChange}
                            className="w-full border border-gray-300 p-2 rounded-md"
                        >
                            <option>Giao hàng</option>
                            <option>Thanh toán</option>
                            <option>Sản phẩm</option>
                            <option>Khác</option>
                        </select>
                        <textarea
                            name="message"
                            placeholder="Mô tả vấn đề bạn gặp phải..."
                            value={formData.message}
                            onChange={handleChange}
                            required
                            className="w-full border border-gray-300 p-2 rounded-md h-32"
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                        >
                            Gửi hỗ trợ
                        </button>
                    </form>
                </div>
            </div>

            {/* Footer có sẵn */}
            <Footers />
        </div>
    );
}



