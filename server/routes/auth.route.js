import express from "express";
import { logIn, refresh, logOut, register, verify, sendVerification } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", register);
router.post("/log-in", logIn);
router.post("/log-out", logOut);
router.post("/refresh", refresh);
router.post("/email-verifications", sendVerification);

router.get("/email-verifications/:token", verify);

export default router;
