import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { ArrowLeft } from "lucide-react";
import Header from "./Header";
import Carousel from "./Carousel";
import Footers from "./Footers";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); // 👈 thêm
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const otpRefs = useRef([]);
  const navigate = useNavigate();

  const handleOtpChange = (element, index) => {
    if (isNaN(element.value)) return false;
    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    if (element.value !== "" && index < 5) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1].focus();
    }
  };

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOTP = async () => {
    setLoading(true);
    try {
      await axios.post("http://localhost:5000/api/password/forgot-password", {
        email,
      });
      alert("Mã xác thực đã được gửi!");
      setStep(2);
      setCountdown(60);
    } catch (error) {
      alert("Lỗi gửi OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      await axios.post("http://localhost:5000/api/password/forgot-password", {
        email,
      });
      alert("OTP đã được gửi lại!");
      setCountdown(60);
    } catch (error) {
      alert("Lỗi gửi lại OTP.");
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join("");

    if (otpCode.length < 6) {
      alert("Nhập đủ OTP!");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/password/verify-otp", {
        email,
        otp: otpCode,
      });

      setStep(3);
    } catch (error) {
      alert("OTP không đúng!");
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      alert("Vui lòng nhập đầy đủ!");
      return;
    }

    // ✅ THÊM VALIDATE (KHÔNG ĐỔI GÌ KHÁC)
    if (newPassword.length < 6) {
      alert("Mật khẩu phải >= 6 ký tự!");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Mật khẩu không khớp!");
      return;
    }

    try {
      const otpCode = otp.join("");

      await axios.post("http://localhost:5000/api/password/reset-password", {
        email,
        otp: otpCode,
        newPassword,
      });

      alert("Đổi mật khẩu thành công!");

      setStep(1);
      setEmail("");
      setOtp(new Array(6).fill(""));
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      alert("Lỗi reset password!");
    }
  };

  // ===== THÊM (KHÔNG ẢNH HƯỞNG UI) =====
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  const validatePassword = (value) => {
    setNewPassword(value);

    if (value.length < 6) {
      setPasswordError("Mật khẩu phải >= 6 ký tự");
    } else {
      setPasswordError("");
    }

    if (confirmPassword && value !== confirmPassword) {
      setConfirmError("Mật khẩu không khớp");
    } else {
      setConfirmError("");
    }
  };

  const validateConfirmPassword = (value) => {
    setConfirmPassword(value);

    if (value !== newPassword) {
      setConfirmError("Mật khẩu không khớp");
    } else {
      setConfirmError("");
    }
  };

  return (
    <>
      <Header />
      <Carousel />

      <div className="flex min-h-[calc(100vh-120px)] items-center justify-center bg-[url('https://cdn.flyonui.com/fy-assets/blocks/marketing-ui/auth/auth-background-2.png')] bg-cover bg-center bg-no-repeat py-10">

        <div className="relative flex items-center justify-center px-4 w-full">

          <div className="bg-white shadow-xl w-full max-w-md space-y-6 rounded-xl p-8 border border-gray-100">

            <div className="flex items-center gap-3">
              <img
                src="/assets/logop.jpg"
                className="w-8 h-8"
                alt="logo"
              />
              <h2 className="text-xl font-bold text-gray-900">TechWorld</h2>
            </div>

            {/* STEP 1 */}
            {step === 1 && (
              <>
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-1.5">
                    Quên mật khẩu?
                  </h3>
                  <p className="text-gray-500">
                    Nhập email của bạn và chúng tôi sẽ gửi cho bạn hướng dẫn để đặt lại mật khẩu
                  </p>
                </div>

                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendOTP();
                  }}
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email address*
                    </label>

                    <input
                      type="email"
                      placeholder="Nhập địa chỉ email của bạn"
                      className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 text-white font-semibold rounded-lg shadow-md transition
                    ${
                      loading
                        ? "bg-gray-400"
                        : "transition duration-200 bg-[#ffd400] hover:bg-[#ffd400] text-white w-full py-2.5 rounded-lg text-sm shadow-sm hover:shadow-md font-semibold text-center inline-block"
                    }`}
                  >
                    {loading ? "Sending..." : "Tiếp tục"}
                  </button>
                </form>

                <div className="flex justify-center">
                  <button
                    onClick={() => navigate("/login")}
                    className="flex items-center text-indigo-600 hover:underline text-sm mt-2"
                  >
                    <ArrowLeft size={16} className="mr-1" />
                    Quay lại đăng nhập
                  </button>
                </div>
              </>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="space-y-6 text-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Xác thực OTP
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">
                    Nhập mã gồm 6 số đã gửi tới
                  </p>
                  <p className="font-semibold text-gray-800">{email}</p>
                </div>

                <div className="flex justify-between gap-2">
                  {otp.map((data, index) => (
                    <input
                      key={index}
                      type="text"
                      maxLength="1"
                      ref={(el) => (otpRefs.current[index] = el)}
                      value={data}
                      onChange={(e) => handleOtpChange(e.target, index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      className="w-12 h-14 border rounded-lg text-center text-xl font-bold focus:border-indigo-500 outline-none"
                    />
                  ))}
                </div>

                <button
                  onClick={handleVerifyOTP}
                  className="transition duration-200 bg-[#ffd400] hover:bg-[#ffd400] text-white w-full py-2.5 rounded-lg text-sm shadow-sm hover:shadow-md font-semibold text-center inline-block"
                >
                  Xác nhận OTP
                </button>

                <div className="text-sm text-gray-500">
                  {countdown > 0 ? (
                    <p>Gửi lại OTP sau {countdown}s</p>
                  ) : (
                    <button
                      onClick={handleResendOTP}
                      className="text-indigo-600 hover:underline"
                    >
                      Gửi lại OTP
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3  */}
{/* STEP 3 - Đã đưa về giao diện cũ của bạn */}
{step === 3 && (
  <div className="space-y-6">
    <div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1.5">
        Thiết lập mật khẩu mới
      </h3>
      <p className="text-gray-500">
        Vui lòng nhập mật khẩu mới của bạn để hoàn tất quá trình khôi phục.
      </p>
    </div>

    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        handleResetPassword();
      }}
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mật khẩu mới*
        </label>
        <input
          type="password"
          placeholder="••••••••"
          className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          required
          value={newPassword}
          onChange={(e) => validatePassword(e.target.value)}
        />
        {passwordError && <p className="text-red-500 text-xs mt-1">{passwordError}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Xác nhận mật khẩu*
        </label>
        <input
          type="password"
          placeholder="••••••••"
          className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          required
          value={confirmPassword}
          onChange={(e) => validateConfirmPassword(e.target.value)}
        />
        {confirmError && <p className="text-red-500 text-xs mt-1">{confirmError}</p>}
      </div>

      <div className="flex items-start">
        <input type="checkbox" required className="w-4 h-4 border rounded mt-0.5" />
        <label className="ml-2 text-sm text-gray-500">
          Tôi chấp nhận các{" "}
          <span className="text-blue-600 hover:underline cursor-pointer">
            Điều khoản và Điều kiện
          </span>
        </label>
      </div>

      <button
        type="submit"
        className="transition duration-200 bg-[#ffd400] hover:bg-[#ffdf33] text-white w-full py-3 rounded-lg text-sm shadow-sm font-semibold text-center"
      >
        Cập nhật mật khẩu
      </button>
    </form>
  </div>
)}
          </div>
        </div>
      </div>

      <Footers />
    </>
  );
}