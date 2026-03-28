import { validateDateInput } from "../validators/date.validator.js";
import { generateTimeSlots, validateTime } from "../utils/time.util.js";
import { addUnavailableTimeSlotToDB } from "../models/unavailableTimeSlots.model.js";
import { getWorkHoursByDate } from "../models/workHours.model.js";

export const addUnavailableTimeSlot = async (req, res) => {
  const { date } = req.params;
  const { timeSlot } = req.body;

  if (date === undefined)
    return res.status(400).json({ message: "Date is required" });

  const error = validateDateInput(date);
  if (error) return res.status(400).json({ message: error });

  if (timeSlot === undefined)
    return res.status(400).json({ message: "Time slot is required" });

  // validate time
  if (!validateTime(timeSlot))
    return res.status(400).json({ message: "Invalid time (HH:MM)" });

  try {
    // get work hours from given date
    const workHours = await getWorkHoursByDate(date);
    if (!workHours)
      return res
        .status(200)
        .json({ message: `Work hours have not been set for ${date}` });

    // generate time slots array based on start time, end time, and slot interval of work hours
    const timeSlots = generateTimeSlots({
      startTime: workHours.start_time,
      endTime: workHours.end_time,
      slotInterval: workHours.slot_interval,
    });

    // check if inputted time slot is in the generated slots
    if (!timeSlots.includes(timeSlot))
      return res
        .status(400)
        .json({
          message: `${timeSlot} is not an available time slot for ${date}`,
          timeSlots,
        });

    await addUnavailableTimeSlotToDB(date, timeSlot);
    res
      .status(201)
      .json({ message: `Time slot ${timeSlot} added as unavailable` });
  } catch (error) {
    // error for unavailable time slot in the same date
    if (error.code === "23505") {
      return res
        .status(400)
        .json({ message: `${timeSlot} is already unavailable for ${date}` });
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
