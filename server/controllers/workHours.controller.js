import { validateWorkHoursInput } from "../validators/workHours.validator.js";
import { validateDateInput } from "../validators/date.validator.js";
import {
  createWorkHours,
  getWorkHoursByIdAndDate,
  updateWorkHoursByIdAndDate,
  deleteWorkHoursByIdAndDate,
} from "../models/workHours.model.js";
import { generateTimeSlots } from "../utils/time.util.js";
import { getUnavailableTimeSlotsByIdAndDate } from "../models/unavailableTimeSlots.model.js";
import { isPastDate } from "../utils/date.util.js";

export const addWorkHours = async (req, res) => {
  const { date, startTime, endTime, slotInterval } = req.body;

  if (!date || !startTime || !endTime || !slotInterval) {
    return res.status(400).json({ message: "All inputs are required" });
  }

  const error = validateWorkHoursInput({
    date,
    startTime,
    endTime,
    slotInterval,
  });
  if (error) return res.status(400).json({ message: error });

  try {
    await createWorkHours({
      userId: req.user.id,
      date,
      startTime,
      endTime,
      slotInterval,
    });
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
  const { id, date } = req.params;

  if (isNaN(id))
    return res.status(400).json({ message: "ID must be a positive number" });

  const error = validateDateInput(date);
  if (error) return res.status(400).json({ message: error });

  try {
    const workHours = await getWorkHoursByIdAndDate(id, date);

    if (workHours.rowCount === 0)
      return res.status(404).json({ message: `No work hours set for ${date}` });

    res.status(200).json({ workHours: workHours.rows[0] });
  } catch (error) {
    console.error("An error occured while trying to get work hours:", error);
    res.status(500).json({
      message: "Server error. An error occured while trying to get work hours.",
    });
  }
};

export const getAvailableTimeSlots = async (req, res) => {
  const { id, date } = req.params;

  if (isNaN(id))
    return res.status(400).json({ message: "ID must be a positive number" });

  const error = validateDateInput(date);
  if (error) res.status(400).json({ message: error });

  try {
    const workHours = await getWorkHoursByIdAndDate(id, date);

    if (workHours.rowCount === 0)
      return res
        .status(200)
        .json({ message: `Work hours have not been set for ${date}` });

    const { barber, start_time, end_time, slot_interval } = workHours.rows[0];

    // generate time slots based on work hours + slot interval
    const timeSlots = generateTimeSlots({
      startTime: start_time,
      endTime: end_time,
      slotInterval: slot_interval,
    });

    // get unavailable time slots
    const result = (await getUnavailableTimeSlotsByIdAndDate(id, date)) || [];
    const unavailableTimeSlots = result.map((res) => res.time_slot.slice(0, 5)); // slice to make it 00:00 instead of 00:00:00

    const availableTimeSlots = timeSlots.filter(
      (slot) => !unavailableTimeSlots.includes(slot),
    );

    res
      .status(201)
      .json({ barber, date, slotInterval: slot_interval, availableTimeSlots });
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

export const updateWorkHours = async (req, res) => {
  const setDate = req.params.date;
  const updates = req.body;
  const allowedFields = ["date", "start_time", "end_time", "slot_interval"];

  if (!setDate) return res.status(400).json({ message: "Date is required" });

  const dateError = validateDateInput(setDate);
  if (dateError)
    return res
      .status(400)
      .json({ message: "Date must be in YYYY-MM-DD format" });

  // user cannot edit set work hours for a past date
  if (isPastDate(setDate)) {
    return res
      .status(400)
      .json({ message: "Cannot edit work hours for a past date" });
  }

  // take the keys of req.body object
  const keys = Object.keys(updates);
  if (keys.length === 0)
    return res.status(400).json({ message: "Nothing to update" });

  // filter the keys that are not part of the allowedFields array
  const invalidFields = keys.filter((key) => !allowedFields.includes(key));
  if (invalidFields.length > 0)
    return res.status(400).json({
      message: "Can only update allowed fields",
      allowedFields: allowedFields,
      invalidFields: invalidFields,
    });

  // validate
  const error = validateWorkHoursInput({
    date: updates.date,
    startTime: updates.start_time,
    endTime: updates.end_time,
    slotInterval: updates.slot_interval,
  });
  if (error) return res.status(400).json({ message: error });

  try {
    const workHours = await getWorkHoursByIdAndDate(req.user.id, setDate);
    if (workHours.rowCount === 0)
      return res
        .status(400)
        .json({ message: `Work hours have not been set for ${setDate}` });

    const values = Object.values(updates);
    const updatedWorkHours = await updateWorkHoursByIdAndDate({
      userId: req.user.id,
      date: setDate,
      keys,
      values,
    });

    res.status(200).json({ message: "Update successful", updatedWorkHours });
  } catch (error) {
    // error for duplicate dates
    if (error.code === "23505") {
      return res
        .status(400)
        .json({ message: `Work hours for date ${updates.date} already exist` });
    }

    // error for entering end time < start time
    if (error.constraint === "work_hours_check") {
      return res
        .status(400)
        .json({ message: "Start time must be before end time" });
    }

    // error for entering date < current date
    if (error.constraint === "no_past_date") {
      return res
        .status(400)
        .json({ message: "Cannot set work hours for a past date" });
    }

    console.error("An error occured while trying to update work hours:", error);
    res.status(500).json({
      message:
        "Server error. An error occured while trying to update work hours.",
    });
  }
};

export const deleteWorkHours = async (req, res) => {
  const { date } = req.params;

  if (date === undefined)
    return res.status(400).json({ message: "Date is required" });

  const error = validateDateInput(date);
  if (error) res.status(400).json({ message: error });

  try {
    const result = await deleteWorkHoursByIdAndDate(req.user.id, date);
    if (result.rowCount === 0)
      return res
        .status(404)
        .json({ message: `No work hours found for ${date}` });

    res
      .status(200)
      .json({ message: `Work hours on ${date} is deleted successfully` });
  } catch (error) {
    console.error("An error occured while trying to delete work hours:", error);
    res.status(500).json({
      message:
        "Server error. An error occured while trying to delete work hours.",
    });
  }
};
