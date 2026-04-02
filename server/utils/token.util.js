import jwt from "jsonwebtoken";

export const generateAccessToken = (userId) => {
  return jwt.sign({ sub: userId }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  });
};

export const generateRefreshToken = (userId) => {
  return jwt.sign({ sub: userId }, process.env.REFRESH_TOKEN_SECRET);
};
