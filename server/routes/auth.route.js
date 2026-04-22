import express from "express";
import {
  logIn,
  refresh,
  logOut,
  register,
  verify,
  sendVerification,
  sendOtp,
  verifyOtp
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", register);
router.post("/log-in", logIn);
router.post("/log-out", logOut);
router.post("/refresh", refresh);
router.post("/email-verifications", sendVerification);
router.post("/password-resets", sendOtp);
router.post("/password-resets/verify", verifyOtp);

router.get("/email-verifications/:token", verify);

export default router;
