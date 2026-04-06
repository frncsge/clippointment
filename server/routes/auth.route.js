import express from "express";
import { logIn, refresh, logOut } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/log-in", logIn);
router.post("/log-out", logOut);
router.post("/refresh", refresh);

export default router;
