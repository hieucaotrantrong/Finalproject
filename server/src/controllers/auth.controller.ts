import { Request, Response } from "express";
import transporter from "../config/mail";
import bcrypt from "bcryptjs";
import pool from "../config/database";

let otpStore: { [email: string]: string } = {};

// tạo OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 1️⃣ gửi OTP
export const forgotPassword = async (req: Request, res: Response) => {

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Thiếu email" });
  }

  const otp = generateOTP();

  otpStore[email] = otp;

  try {

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Đặt lại mật khẩu - TdddWebsite",
      text: `Mã OTP của bạn là: ${otp}`
    });

    res.json({ message: "OTP đã gửi về email" });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Không gửi được email"
    });

  }

};


// 2️⃣ verify OTP
export const verifyOTP = (req: Request, res: Response) => {

  const { email, otp } = req.body;

  if (!otpStore[email]) {
    return res.status(400).json({
      message: "Email chưa gửi OTP"
    });
  }

  if (otpStore[email] !== otp) {
    return res.status(400).json({
      message: "OTP sai"
    });
  }

  res.json({
    message: "OTP đúng"
  });

};


// 3️⃣ reset password
export const resetPassword = async (req: Request, res: Response) => {

  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({
      message: "Thiếu email hoặc mật khẩu mới"
    });
  }

  try {

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE users SET password=$1 WHERE email=$2",
      [hashedPassword, email]
    );

    delete otpStore[email];

    res.json({
      message: "Đổi mật khẩu thành công"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Không thể đổi mật khẩu"
    });

  }

};