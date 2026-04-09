import { validateDateInput } from "../validators/date.validator.js";
import { generateTimeSlots, validateTime } from "../utils/time.util.js";
import {
  addUnavailableTimeSlotToDB,
  getUnavailableTimeSlotsByIdAndDate,
} from "../models/unavailableTimeSlots.model.js";
import { getWorkHoursByIdAndDate } from "../models/workHours.model.js";

export const addUnavailableTimeSlot = async (req, res) => {
  const { date } = req.params;
  const { timeSlots } = req.body;

  if (date === undefined)
    return res.status(400).json({ message: "Date is required" });

  const error = validateDateInput(date);
  if (error) return res.status(400).json({ message: error });

  if (!timeSlots)
    return res.status(400).json({ message: "Time slot is required" });

  if (!Array.isArray(timeSlots))
    return res.status(400).json({ message: "Time slot must be an array" });

  // validate time slot
  const hasInvalidTime = timeSlots.some((timeSlot) => !validateTime(timeSlot));

  if (hasInvalidTime)
    return res.status(400).json({ message: "Invalid time (HH:MM)" });

  try {
    // get work hours from given date
    const workHours = await getWorkHoursByIdAndDate(req.user.id, date);
    if (workHours.rowCount === 0)
      return res
        .status(200)
        .json({ message: `Work hours have not been set for ${date}` });

    // generate time slots array based on start time, end time, and slot interval of work hours
    const { id, start_time, end_time, slot_interval } = workHours.rows[0];
    const generatedTimeSlots = generateTimeSlots({
      startTime: start_time,
      endTime: end_time,
      slotInterval: slot_interval,
    });

    // get time slots marked as unavailable by the barber based on his work hours in a specific date
    const unavailableTimeSlots = await getUnavailableTimeSlotsByIdAndDate(
      req.user.id,
      date,
    );

    // filter the generated time slots to exclude slots that are already marked as unavailable by the barber
    const availableGeneratedTimeSlots = generatedTimeSlots.filter(
      (generatedTimeSlot) => !unavailableTimeSlots.includes(generatedTimeSlot),
    );

    // check if inputted time slot is in the generated slots
    const invalidTimeSlots = timeSlots.filter(
      (timeSlot) => !availableGeneratedTimeSlots.includes(timeSlot),
    );

    if (invalidTimeSlots.length > 0)
      return res.status(400).json({
        message: `Cannot add time slots to be unavailable that are already unavailable`,
        invalidTimeSlots,
        availableTimeSlots: availableGeneratedTimeSlots,
      });

    await addUnavailableTimeSlotToDB(id, timeSlots);
    res.status(201).json({
      message: `Time slots are successfully added as unavailable`,
      addedUnavailableTimeSlots: timeSlots,
    });
  } catch (error) {
    // error for unavailable time slot in the same date
    if (error.code === "23505") {
      return res.status(400).json({
        message: `${timeSlots.length > 1 ? `${timeSlots.join(", ")} are ` : `${timeSlots} is `}already unavailable for ${date}`,
      });
    }

    if (error.code === "P0001") {
      return res
        .status(400)
        .json({
          message: "Cannot add time slot as unavailable for a past date",
        });
    }

    console.error(
      "An error occured while trying to add unavailable time slot:",
      error,
    );
    res.status(500).json({
      message:
        "Server error. An error occured while trying to add unavailable time slot.",
    });
  }
};
