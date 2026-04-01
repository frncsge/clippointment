import express from "express";
import { logIn, refresh } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/log-in", logIn);
router.post("/refresh", refresh);

export default router;
