import express from "express";
import {
  addWorkHours,
  getWorkHours,
  getAvailableTimeSlots,
  updateWorkHours
} from "../controllers/workHours.controller.js";
import { addUnavailableTimeSlot } from "../controllers/unavailableTimeSlots.controller.js";

const router = express.Router();

router.post("/work-hours", addWorkHours);
router.post("/work-hours/:date/unavailable-time-slots", addUnavailableTimeSlot)
router.get("/work-hours/:date", getWorkHours);
router.get("/work-hours/:date/time-slots", getAvailableTimeSlots);
router.patch("/work-hours/:date", updateWorkHours);

export default router;
