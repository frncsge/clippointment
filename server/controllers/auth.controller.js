import bcrypt from "bcrypt";
import { getUserByUsername } from "../models/users.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/token.util.js";
import redisClient from "../../config/redisConfig.js";
import jwt from "jsonwebtoken";

export const logIn = async (req, res) => {
  const username = req.body.username?.trim();
  const password = req.body.password?.trim();

  if (!username || !password)
    return res
      .status(400)
      .json({ message: "Username and password are required" });

  try {
    const user = await getUserByUsername(username);

    if (user.rowCount === 0)
      return res
        .status(401)
        .json({ message: "Incorrect username or password" });

    // check password
    const hashedPassword = user.rows[0].hashed_password;
    const match = await bcrypt.compare(password, hashedPassword);

    if (!match)
      return res
        .status(401)
        .json({ message: "Incorrect username or password" });

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
