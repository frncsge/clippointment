import jwt from "jsonwebtoken";

export const authenticateUser = (req, res, next) => {
  const { accessToken } = req.cookies;

  if (!accessToken) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

    req.user = { id: decoded.sub };
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};
