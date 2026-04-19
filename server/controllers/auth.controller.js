import bcrypt from "bcrypt";
import {
  getUserByEmail,
  storeNewUser,
  verifyUser,
} from "../models/users.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
  generateToken,
} from "../utils/token.util.js";
import { isValidEmail } from "../utils/email.util.js";
import { isValidPassword, passwordsMatch } from "../utils/password.util.js";
import { sendVerificationEmail } from "../utils/email.util.js";
import redisClient from "../../config/redisConfig.js";
import jwt from "jsonwebtoken";

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
    const link = `http://localhost:3000/api/verify?token=${verificationToken}`;
    sendVerificationEmail(email, link).catch(console.error);

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
  const { token } = req.query;

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
