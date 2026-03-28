import express from "express";
import {
  addWorkHours,
  getWorkHours,
  getAvailableTimeSlots,
  updateWorkHours
} from "../controllers/workHours.controller.js";

const router = express.Router();

router.post("/work-hours", addWorkHours);
router.get("/work-hours/:date", getWorkHours);
router.get("/work-hours/:date/time-slots", getAvailableTimeSlots);
router.patch("/work-hours/:date", updateWorkHours);

export default router;
