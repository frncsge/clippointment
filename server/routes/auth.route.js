import express from "express";
import { logIn } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/log-in", logIn);

export default router;
