import express from "express";
import {
  logIn,
  refresh,
  logOut,
  register,
  verify,
  sendVerification,
  sendOtp,
  verifyOtp,
  resetPassword,
} from "../controllers/auth.controller.js";
import { loginRateLimit } from "../middlewares/rateLimit.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/log-in", loginRateLimit, logIn);
router.post("/log-out", logOut);
router.post("/refresh", refresh);
router.post("/email-verifications", sendVerification);
router.post("/password-resets", sendOtp);
router.post("/password-resets/verify", verifyOtp);
router.post("/password-resets/confirm", resetPassword);

router.get("/email-verifications/:token", verify);

export default router;
