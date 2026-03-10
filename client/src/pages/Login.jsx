import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from "react-router-dom";
import Header from '../components/Header';
import Footers from '../components/Footers';
import Carousel from '../components/Carousel';
import { GoogleLogin } from '@react-oauth/google';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogin = async () => {
        try {
            const response = await axios.post("http://localhost:5000/api/auth/login", {
                email,
                password
            });

            const { token, user } = response.data;

            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));
            localStorage.setItem("userEmail", user.email);

            const redirect = new URLSearchParams(location.search).get("redirect");
            const role = (user?.role || "").toLowerCase();
            const fallback = role === "admin" ? "/admin" : "/home";

            navigate(redirect || fallback, { replace: true });
        } catch (error) {
            console.log("Lỗi chi tiết:", error.response?.data || error.message);
            alert(error.response?.data?.error || "Đăng nhập thất bại");
        }
    };
    return (
        <div>
            <Header />
            <Carousel />

            <div className="bg-gray-100 flex flex-col justify-center">
                <div className="p-10 xs:p-0 mx-auto md:w-full md:max-w-md">

                    <h1 className="font-bold text-center text-2xl mb-5">
                        -Login Form-
                    </h1>

                    <div className="bg-white shadow w-full rounded-lg divide-y divide-gray-200">

                        {/* LOGIN FORM */}
                        <div className="px-5 py-7">

                            <label className="font-semibold text-sm text-gray-600 pb-1 block">
                                E-mail
                            </label>

                            <input
                                type="text"
                                className="border rounded-lg px-3 py-2 mt-1 mb-5 text-sm w-full"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />

                            <label className="font-semibold text-sm text-gray-600 pb-1 block">
                                Password
                            </label>

                            <input
                                type="password"
                                className="border rounded-lg px-3 py-2 mt-1 mb-5 text-sm w-full"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />

                            <button
                                type="button"
                                onClick={handleLogin}
                                className="transition duration-200 bg-[#ffd400] hover:bg-[#ffd400] text-white w-full py-2.5 rounded-lg text-sm shadow-sm hover:shadow-md font-semibold text-center inline-block"
                            >
                                <span className="inline-block mr-2">Login</span>

                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    className="w-4 h-4 inline-block"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                                    />
                                </svg>

                            </button>
                        </div>

                      
                     {/* SOCIAL LOGIN */}
                     <div className="p-5">
<div className="flex flex-col gap-3">

    {/* MAIL */}
    <button
      type="button"
      className="border border-gray-200 text-gray-700 w-full py-3 rounded-lg text-sm shadow-sm hover:shadow-md flex items-center justify-center gap-3 font-semibold"
    >
      <img
        src="https://cdn-icons-png.flaticon.com/512/281/281769.png"
        className="w-5 h-5"
      />
      Đăng nhập bằng MailUp
    </button>


    {/* GOOGLE */}
    <div className="border border-gray-200 text-gray-700 w-full py-3 rounded-lg text-sm shadow-sm hover:shadow-md flex items-center justify-center gap-3 font-semibold relative">

      <img
        src="https://cdn-icons-png.flaticon.com/512/2991/2991148.png"
        className="w-5 h-5"
      />

      <span>Đăng nhập bằng Google</span>

      <div className="absolute opacity-0">
        <GoogleLogin
          onSuccess={async (credentialResponse) => {
            try {

              const res = await axios.post(
                "http://localhost:5000/api/auth/google",
                {
                  token: credentialResponse.credential
                }
              );

              const { token, user } = res.data;

              localStorage.setItem("token", token);
              localStorage.setItem("user", JSON.stringify(user));

              if (user.role === "admin") {
                navigate("/admin");
              } else {
                navigate("/home");
              }

            } catch (error) {
              console.log(error);
              alert("Đăng nhập Google thất bại");
            }
          }}

          onError={() => {
            console.log("Login Failed");
          }}
        />
      </div>

    </div>


   {/* GITHUB */}
<button
  type="button"
  onClick={() =>
    window.location.href = "http://localhost:5000/api/auth/github"
  }
  className="border border-gray-200 text-gray-700 w-full py-3 rounded-lg text-sm shadow-sm hover:shadow-md flex items-center justify-center gap-3 font-semibold"
>
  <img
    src="https://cdn-icons-png.flaticon.com/512/25/25231.png"
    className="w-5 h-5"
  />
  Đăng nhập bằng Github
</button>
  </div>
</div>


                        {/* FOOTER */}
                        <div className="py-5">

                            <div className="grid grid-cols-2 gap-1">

                                <div className="text-center sm:text-left whitespace-nowrap">

                                    <button className="transition duration-200 mx-5 px-5 py-4 cursor-pointer font-normal text-sm rounded-lg text-gray-500 hover:bg-gray-100">
                                        Forgot Password
                                    </button>

                                </div>

                                <div className="text-center sm:text-right whitespace-nowrap">

                                    <button className="transition duration-200 mx-5 px-5 py-4 cursor-pointer font-normal text-sm rounded-lg text-gray-500 hover:bg-gray-100">
                                        Help
                                    </button>

                                </div>

                            </div>

                            <div className="text-center mt-6">

                                <p className="text-sm text-slate-600">
                                    Chưa có tài khoản?{" "}

                                    <button
                                        onClick={() => navigate('/signup')}
                                        className="text-blue-600 hover:underline"
                                    >
                                        Đăng Kí Ngay
                                    </button>

                                </p>

                            </div>

                        </div>

                    </div>
                </div>
            </div>

            <Footers />
        </div>
    );
}