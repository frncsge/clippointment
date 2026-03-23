import { validateWorkHoursInput } from "../validators/workHours.validator.js";

export const addWorkHours = (req, res) => {
  const { date, startTime, endTime, slotInterval } = req.body;

  const error = validateWorkHoursInput({
    date,
    startTime,
    endTime,
    slotInterval,
  });

  if (error) return res.status(400).json({ message: error });
};
