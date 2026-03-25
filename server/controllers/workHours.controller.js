import { validateWorkHoursInput } from "../validators/workHours.validator.js";
import { validateDateInput } from "../validators/date.validator.js";
import {
  createWorkHours,
  getWorkHoursByDate,
} from "../models/workHours.model.js";

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
    // error for duplicate values
    if (error.code === "23505") {
      return res
        .status(400)
        .json({ message: `Work hours for date ${date} already exist` });
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
    const result = await getWorkHoursByDate(date);
    res.status(200).json({ result });
  } catch (error) {
    console.error(
      "An error occured while trying to get work hours:",
      error,
    );
    res.status(500).json({
      message:
        "Server error. An error occured while trying to get work hours.",
    });
  }
};
