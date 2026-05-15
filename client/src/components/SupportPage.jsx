import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IoMdClose } from "react-icons/io";
import { MdEmail, MdHeadset, MdLocationOn, MdPhone } from "react-icons/md";
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
        firstName: "",
        lastName: "",
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
        
        // Combine firstName and lastName for the name field when sending
        const dataToSend = {
            name: `${formData.firstName} ${formData.lastName}`.trim(),
            email: formData.email,
            topic: formData.topic,
            message: formData.message,
        };
        
        console.log(" Gửi yêu cầu:", dataToSend);

        try {
            const res = await fetch("http://localhost:5000/api/support", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dataToSend),
            });

            const result = await res.json();
            console.log(" Phản hồi từ server:", result);

            if (res.ok) {
                setSuccess(true);
                setFormData({ firstName: "", lastName: "", email: "", topic: "Giao hàng", message: "" });
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
            <div className="max-w-7xl mx-auto py-12 px-6">
                <div className="bg-white rounded-2xl shadow-md p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                    {/* Left Side - Contact Information */}
                    <div className="md:pr-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        {/* Email Section */}
                            <div>
                                <div className="flex flex-col items-center text-center gap-2 mb-3">
                                    <div className="p-1 rounded-lg">
                                        <MdEmail className="text-gray-700 text-2xl" />
                                    </div>
                                    <h3 className="text-gray-700 font-semibold text-base">Email</h3>
                                </div>
                                <p className="text-gray-600 text-sm text-center mb-2">Đội ngũ thân thiện sẵn sàng giúp.</p>
                                <p className="text-gray-700 font-semibold text-sm text-center">chamsockhachhangtddd@gmail.com</p>
                            </div>

                        {/* Live Chat Section */}
                            <div>
                                <div className="flex flex-col items-center text-center gap-2 mb-3">
                                    <div className="p-1 rounded-lg">
                                        <MdHeadset className="text-gray-700 text-2xl" />
                                    </div>
                                    <h3 className="text-gray-700 font-semibold text-base">Live chat</h3>
                                </div>
                                <p className="text-gray-600 text-sm text-center mb-2">Đội ngũ thân thiện sẵn sàng giúp.</p>
                                <p className="text-gray-700 font-semibold text-sm text-center cursor-pointer hover:underline">Bắt đầu trò chuyện</p>
                            </div>

                        {/* Office Section */}
                            <div>
                                <div className="flex flex-col items-center text-center gap-2 mb-3">
                                    <div className="p-1 rounded-lg">
                                        <MdLocationOn className="text-gray-700 text-2xl" />
                                    </div>
                                    <h3 className="text-gray-700 font-semibold text-base">Văn phòng</h3>
                                </div>
                                <p className="text-gray-600 text-sm text-center mb-2">Ghé thăm văn phòng chính.</p>
                                <div className="text-center">
                                    <p className="text-gray-700 font-semibold text-sm">42 Hoang Van Thu</p>
                                    <p className="text-gray-700 font-semibold text-sm">Hai Chau, Da Nang</p>
                                </div>
                            </div>

                        {/* Phone Section */}
                            <div>
                                <div className="flex flex-col items-center text-center gap-2 mb-3">
                                    <div className="p-1 rounded-lg">
                                        <MdPhone className="text-gray-700 text-2xl" />
                                    </div>
                                    <h3 className="text-gray-700 font-semibold text-base">Điện thoại</h3>
                                </div>
                                <p className="text-gray-600 text-sm text-center mb-2">Thứ Hai - Thứ Sáu 8-17h.</p>
                                <p className="text-gray-700 font-semibold text-sm text-center">0909 090 090</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Contact Form */}
                    <div className="md:pl-6">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {success && (
                                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg text-sm">
                                        Gửi thành công! Chúng tôi sẽ phản hồi sớm nhất.
                                    </div>
                                )}
                                {error && (
                                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
                                        {error}
                                    </div>
                                )}

                                {/* First Name and Last Name Row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-700 font-semibold mb-2 text-sm">
                                            Họ <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="firstName"
                                            placeholder="Họ"
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            required
                                            className="w-full border-2 border-gray-200 px-3 py-2 rounded-lg focus:border-purple-500 focus:outline-none transition bg-white text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 font-semibold mb-2 text-sm">
                                            Tên <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="lastName"
                                            placeholder="Tên"
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            required
                                            className="w-full border-2 border-gray-200 px-3 py-2 rounded-lg focus:border-purple-500 focus:outline-none transition bg-white text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2 text-sm">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="you@company.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="w-full border-2 border-gray-200 px-3 py-2 rounded-lg focus:border-purple-500 focus:outline-none transition bg-white text-sm"
                                    />
                                </div>

                                {/* Support Topic */}
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2 text-sm">
                                        Mục hỗ trợ <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        name="topic"
                                        value={formData.topic}
                                        onChange={handleChange}
                                        className="w-full border-2 border-gray-200 px-3 py-2 rounded-lg focus:border-purple-500 focus:outline-none transition bg-white text-sm"
                                        required
                                    >
                                        <option value="Giao hàng">Giao hàng</option>
                                        <option value="Thanh toán">Thanh toán</option>
                                        <option value="Sản phẩm">Sản phẩm</option>
                                        <option value="Tài khoản">Tài khoản</option>
                                        <option value="Khác">Khác</option>
                                    </select>
                                </div>

                                {/* Message */}
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2 text-sm">
                                        Tin nhắn <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        name="message"
                                        placeholder="Để lại lời nhắn cho chúng tôi..."
                                        value={formData.message}
                                        onChange={handleChange}
                                        required
                                        className="w-full border-2 border-gray-200 px-3 py-2 rounded-lg focus:border-purple-500 focus:outline-none transition bg-white h-28 resize-none text-sm"
                                    />
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 bg-white text-red-700 border border-blue-300 rounded text-sm hover:bg-blue-50 shadow-sm"
                                >
                                    Gửi tin nhắn
                                </button>
                            </form>
                    </div>
                </div>
                </div>
            </div>

            {/* Footer có sẵn */}
            <Footers />
        </div>
    );
}



