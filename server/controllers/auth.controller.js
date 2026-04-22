import bcrypt from "bcrypt";
import {
  getUserByEmail,
  storeNewUser,
  verifyUser,
  updatePasswordByEmail,
} from "../models/users.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
  generateToken,
} from "../utils/token.util.js";
import {
  isValidEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../utils/email.util.js";
import { isValidOtp } from "../utils/otp.util.js";
import { isValidPassword, passwordsMatch } from "../utils/password.util.js";
import redisClient from "../../config/redisConfig.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { REDIS_FLUSH_MODES } from "redis";

const saltRound = 12;

export const logIn = async (req, res) => {
  const email = req.body.email?.trim();
  const password = req.body.password?.trim();

  if (!email || !password)
    return res.status(400).json({ message: "Email and password are required" });

  try {
    const user = await getUserByEmail(email);

    if (user.rowCount === 0)
      return res.status(401).json({ message: "Incorrect email or password" });

    // if account is not verified yet
    if (user.rows[0].is_verified === false)
      return res
        .status(400)
        .json({ message: "Please verify your email before logging in" });

    // check password
    const hashedPassword = user.rows[0].hashed_password;
    const match = await bcrypt.compare(password, hashedPassword);

    if (!match)
      return res.status(401).json({ message: "Incorrect email or password" });

    // if match, create session
    const userId = user.rows[0].id;
    const accessToken = generateAccessToken(userId);
    const refreshToken = generateRefreshToken(userId);

    // store refresh token in redis
    const sevenDaysInSecs = 7 * 24 * 60 * 60;
    await redisClient.setEx(
      `refreshToken:${userId}`,
      sevenDaysInSecs,
      refreshToken,
    );

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ message: "Log-in successful" });
  } catch (error) {
    console.error("An error occured while trying to log in user:", error);
    res.status(500).json({
      message: "Server error. An error occured while trying to log in user.",
    });
  }
};

export const register = async (req, res) => {
  const email = req.body.email?.trim();
  const password = req.body.password?.trim();
  const confirmPassword = req.body.confirmPassword?.trim();
  const accountName = req.body.accountName?.trim();

  // empty values not allowed
  if (!email || !password || !confirmPassword || !accountName)
    return res.status(400).json({
      message: "All inputs are required",
      requiredInputs: ["email", "password", "confirmPassword", "accountName"],
    });

  // example of invalid: user email@domain.com (space inside)
  if (!isValidEmail(email))
    return res.status(400).json({ message: "Invalid email format" });

  // validate password
  if (!isValidPassword(password))
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters long" });

  if (!passwordsMatch(password, confirmPassword))
    return res.status(400).json({ message: "Passwords do not match" });

  try {
    // check if user already exists
    const user = await getUserByEmail(email);

    if (user.rowCount > 0)
      return res.status(400).json({ message: "Email already registered" });

    // hash password
    const hashedPassword = await bcrypt.hash(password, saltRound);

    // store new user in db with is_verified col equal to false (need email verification)
    const result = await storeNewUser({ email, hashedPassword, accountName });
    const { id: userId } = result.rows[0];

    // generate token for verification
    const verificationToken = generateToken();

    // store token in redis with 10 mins TTL
    await redisClient.setEx(
      `verify:${verificationToken}`,
      10 * 60,
      String(userId),
    );

    // send email verification link
    const link = `http://localhost:3000/api/auth/email-verifications/${verificationToken}`;
    await sendVerificationEmail(email, link);

    res
      .status(200)
      .json({ message: "Verifiaction email sent. Check your inbox" });
  } catch (error) {
    // duplicate email (for idempotency)
    if (error.code === "23505")
      return res.status(400).json({ message: "Email already resgistered" });

    console.error("An error occured while trying to register new user:", error);
    res.status(500).json({
      message:
        "Server error. An error occured while trying to register new user.",
    });
  }
};

export const verify = async (req, res) => {
  const { token } = req.params;

  if (!token)
    return res
      .status(400)
      .json({ message: "Expired or invalid email verification token" });

  try {
    // retrieve verification token from redis
    const stored = await redisClient.get(`verify:${token}`);

    if (!stored)
      return res
        .status(400)
        .json({ message: "Invalid or expired verification token" });

    // if token is valid, mark user as verified
    const userId = Number(stored);
    await verifyUser(userId);

    // delete the saved token from redis
    await redisClient.del(`verify:${token}`);

    res.status(200).send("Your account has been verified successfully!");
  } catch (error) {
    console.error(
      "An error occured while trying to verify user account:",
      error,
    );
    res.status(500).json({
      message:
        "Server error. An error occured while trying to verify user account.",
    });
  }
};

export const refresh = async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken)
    return res.status(401).json({ message: "No refresh token provided" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // revoke used refresh token
    res.clearCookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 15 * 60 * 1000,
    });
    await redisClient.del(`refreshToken:${refreshToken}`);

    // generate new access token
    const newAccessToken = generateAccessToken(decoded.sub);

    // generate new refresh token and store it in redis with 7-day expiration
    const newRefreshToken = generateRefreshToken(decoded.sub);
    const sevenDaysInSecs = 7 * 24 * 60 * 60;
    await redisClient.setEx(
      `refreshToken:${decoded.sub}`,
      sevenDaysInSecs,
      newRefreshToken,
    );

    // send new access and refresh tokens
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ message: "Access token refreshed" });
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};

export const logOut = async (req, res) => {
  try {
    // clear refresh token in redis if user is logged in
    if (req.user?.id) {
      await redisClient.del(`refreshToken:${req.user.id}`);
    }

    // clear access and refresh token cookies
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    res.status(200).json({ message: "Log-out successful" });
  } catch (error) {
    console.error("An error occured while trying to log user out:", error);
    res.status(500).json({
      message: "Server error. An error occured while trying to log user out.",
    });
  }
};

export const sendVerification = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  if (!isValidEmail(email))
    return res.status(400).json({ message: "Invalid email format" });

  try {
    const user = await getUserByEmail(email);

    if (user.rows[0] && user.rows[0].is_verified === false) {
      const { id: userId } = user.rows[0];

      // generate token for verification
      const verificationToken = generateToken();

      // store token in redis with 10 mins TTL
      await redisClient.setEx(
        `verify:${verificationToken}`,
        10 * 60,
        String(userId),
      );

      // send email verification link
      const link = `http://localhost:3000/api/auth/email-verifications/${verificationToken}`;
      await sendVerificationEmail(email, link);
    }

    res.status(200).json({
      message:
        "If an account exists for this email, a verification link has been sent.",
    });
  } catch (error) {
    console.error(
      "An error occured while trying to send email verification:",
      error,
    );
    res.status(500).json({
      message:
        "Server error. An error occured while trying to send email verification.",
    });
  }
};

export const sendOtp = async (req, res) => {
  const email = req.body.email?.trim();

  if (!email)
    return res.status(400).json({
      message: "Email is required",
    });

  if (!isValidEmail(email))
    return res.status(400).json({ message: "Invalid email format" });

  try {
    const user = await getUserByEmail(email);

    if (user.rows[0] && user.rowCount > 0) {
      const code = crypto.randomInt(100000, 1000000);

      // store code in redis
      await redisClient.setEx(`password-reset:${email}`, 3 * 60, String(code));
      await sendPasswordResetEmail(email, code);
    }

    res.status(200).json({
      message:
        "If an account exists for this email, a 6-digit OTP has been sent.",
    });
  } catch (error) {
    console.error("An error occured while trying to send OTP:", error);
    res.status(500).json({
      message: "Server error. An error occured while trying to send OTP.",
    });
  }
};

export const verifyOtp = async (req, res) => {
  const email = req.body.email?.trim();
  const otp = req.body.otp?.trim();

  if (!email)
    return res.status(400).json({
      message: "Email is required",
    });

  if (!isValidEmail(email))
    return res.status(400).json({ message: "Invalid email format" });

  if (!otp) return res.status(400).json({ message: "6-digit OTP is required" });

  if (!isValidOtp(otp))
    return res.status(400).json({ message: "Invalid or expired OTP" });

  try {
    // retrieve stored otp in redis
    const storedOtp = await redisClient.get(`password-reset:${email}`);

    if (!storedOtp)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    if (otp !== storedOtp)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    // if otp valid, delete the used OTP and create reset password session using redis
    await redisClient.del(`password-reset:${email}`);
    await redisClient.setEx(
      `password-reset-session:${email}`,
      5 * 60,
      "OTP verified",
    );

    res
      .status(201)
      .json({ message: "OTP verified. You can now reset your password" });
  } catch (error) {
    console.error("An error occured while trying to verify OTP:", error);
    res.status(500).json({
      message: "Server error. An error occured while trying to verify OTP.",
    });
  }
};

export const resetPassword = async (req, res) => {
  const email = req.body.email?.trim();
  const newPassword = req.body.newPassword?.trim();
  const confirmNewPassword = req.body.confirmNewPassword?.trim();

  if (!email || !newPassword || !confirmNewPassword)
    return res.status(400).json({
      message: "All inputs are requried",
      required: ["email", "newPassword", "confirmNewPassword"],
    });

  if (!isValidEmail(email))
    return res.status(400).json({ message: "Invalid email format" });

  try {
    // check if email has valid password-reset session
    const session = await redisClient.get(`password-reset-session:${email}`);

    if (!session)
      return res.status(403).json({
        message:
          "Password reset session is expired or invalid. Please request a new 6-digit OTP",
      });

    // validate the new password
    if (!isValidPassword(newPassword))
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters long" });

    if (!passwordsMatch(newPassword, confirmNewPassword))
      return res.status(400).json({ message: "Passwords do not match" });

    // hash the new password
    const newHashedPassword = await bcrypt.hash(newPassword, saltRound);

    await updatePasswordByEmail(email, newHashedPassword);

    // delete the password reset session
    await redisClient.del(`password-reset-session:${email}`);

    res.status(200).json({message: "Password has been reset successfully!"})
  } catch (error) {
    console.error("An error occured while trying to reset password:", error);
    res.status(500).json({
      message: "Server error. An error occured while trying to reset password.",
    });
  }
};

// create session after password reset
