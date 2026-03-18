import React, { useState, useRef } from "react";
import axios from "axios";
import { ArrowLeft } from "lucide-react";
import Header from "./Header";
import Footers from "./Footers";
import { useNavigate } from "react-router-dom";
export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
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

  const handleSendOTP = async () => {
    setLoading(true);
    try {
      await axios.post("http://localhost:5000/api/password/forgot-password", {
        email,
      });
      alert("Mã xác thực đã được gửi!");
      setStep(2);
    } catch (error) {
      alert("Lỗi gửi OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setStep(3);
  };

  const handleResetPassword = async () => {
    setStep(1);
  };

  return (
    <>
      <Header />

      {/* Background */}
      <div className="flex min-h-[calc(100vh-120px)] items-center justify-center bg-[url('https://cdn.flyonui.com/fy-assets/blocks/marketing-ui/auth/auth-background-2.png')] bg-cover bg-center bg-no-repeat py-10">

        <div className="relative flex items-center justify-center px-4 w-full">

          {/* CARD */}
          <div className="bg-white shadow-xl w-full max-w-md space-y-6 rounded-xl p-8 border border-gray-100">

            {/* LOGO */}
            <div className="flex items-center gap-3">
              <img
                src="https://cdn.haitrieu.com/wp-content/uploads/2021/11/Logo-The-Gioi-Di-Dong-MWG.png"
                className="w-8 h-8"
                alt="logo"
              />
              <h2 className="text-xl font-bold text-gray-900"></h2>
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
              </>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="space-y-6 text-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                   Mã OTP đã được gửi!
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Mã 6 số đã gửi tới {email}
                  </p>
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
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg"
                >
                  Verify OTP
                </button>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="space-y-4 text-center">
                <h3 className="text-2xl font-bold text-gray-900">
                  New Password
                </h3>

                <input
                  type="password"
                  placeholder="Nhập mật khẩu mới"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />

                <button
                  onClick={handleResetPassword}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg"
                >
                  Reset Password
                </button>
              </div>
            )}

            {/* BACK LOGIN */}
            <div className="flex justify-center">
  <button
    onClick={() => navigate("/login")}
    className="flex items-center text-indigo-600 hover:underline text-sm"
  >
    <ArrowLeft size={16} className="mr-1" />
    Quay lại đăng nhập
  </button>
</div>

          </div>
        </div>
      </div>

      <Footers />
    </>
  );
}