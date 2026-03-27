import { validateWorkHoursInput } from "../validators/workHours.validator.js";
import { validateDateInput } from "../validators/date.validator.js";
import {
  createWorkHours,
  getWorkHoursByDate,
} from "../models/workHours.model.js";
import { generateTimeSlots } from "../utils/time.util.js";

export const addWorkHours = async (req, res) => {
  const { date, startTime, endTime, slotInterval } = req.body;

  const error = validateWorkHoursInput({
    date,
    startTime,
    endTime,
    slotInterval,
  });

  if (error) return res.status(400).json({ message: error });

  try {
    await createWorkHours({ date, startTime, endTime, slotInterval });
    res.status(201).json({ message: "New work hours succesfully added" });
  } catch (error) {
    // error for duplicate dates
    if (error.code === "23505") {
      return res
        .status(400)
        .json({ message: `Work hours for date ${date} already exist` });
    }

    // error for entering date < current date
    if (error.code === "23514") {
      return res
        .status(400)
        .json({ message: "Cannot set work hours for a past date" });
    }

    console.error(
      "An error occured while trying to add new work hours:",
      error,
    );
    res.status(500).json({
      message:
        "Server error. An error occured while trying to add new work hours.",
    });
  }
};

export const getWorkHours = async (req, res) => {
  const { date } = req.params;

  const error = validateDateInput(date);

  if (error) return res.status(400).json({ message: error });

  try {
    const workHours = await getWorkHoursByDate(date);
    res.status(200).json({ workHours });
  } catch (error) {
    console.error("An error occured while trying to get work hours:", error);
    res.status(500).json({
      message: "Server error. An error occured while trying to get work hours.",
    });
  }
};

export const getAvailableTimeSlots = async (req, res) => {
  const { date } = req.params;

  const error = validateDateInput(date);

  if (error) res.status(400).json({ message: error });

  try {
    const workHours = await getWorkHoursByDate(date);

    if (!workHours)
      return res
        .status(200)
        .json({ message: `Work hours have not been set for ${date}` });

    const { start_time, end_time, slot_interval } = workHours;

    // generate time slots based on work hours + slot interval
    const timeSlots = generateTimeSlots({
      startTime: start_time,
      endTime: end_time,
      slotInterval: slot_interval,
    });

    res.status(201).json({ slotInterval: slot_interval, timeSlots });
  } catch (error) {
    console.error(
      "An error occured while trying to get available time slots:",
      error,
    );
    res.status(500).json({
      message:
        "Server error. An error occured while trying to get available time slots.",
    });
  }
};
