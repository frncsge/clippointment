import express from "express";
import {
  addWorkHours,
  getWorkHours,
  getAvailableTimeSlots,
  updateWorkHours,
  deleteWorkHours,
} from "../controllers/workHours.controller.js";
import { addUnavailableTimeSlot } from "../controllers/unavailableTimeSlots.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/work-hours", authenticateUser, addWorkHours);
router.post("/work-hours/:date/unavailable-time-slots", addUnavailableTimeSlot);
router.get("/barbers/:id/work-hours/:date", getWorkHours);
router.get("/barbers/:id/work-hours/:date/time-slots", getAvailableTimeSlots);
router.patch("/work-hours/:date", authenticateUser, updateWorkHours);
router.delete("/work-hours/:date", deleteWorkHours);

export default router;
