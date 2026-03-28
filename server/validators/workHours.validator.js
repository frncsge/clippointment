import {
  validateTime,
  validateWorkHour,
  validateSlotInterval,
  validateSlotIntervalLength,
} from "../utils/time.util.js";
import { validateDateInput } from "./date.validator.js";

export const validateWorkHoursInput = ({
  date,
  startTime,
  endTime,
  slotInterval,
}) => {
  if (date !== undefined) {
    const dateError = validateDateInput(date);
    if (dateError) return dateError;
  }

  if (startTime !== undefined && !validateTime(startTime)) {
    return "Start time is invalid (HH:MM)";
  }

  if (endTime !== undefined && !validateTime(endTime)) {
    return "End time is invalid (HH:MM)";
  }

  // make sure that start time is earlier than end time
  if (
    startTime !== undefined &&
    endTime !== undefined &&
    !validateWorkHour(startTime, endTime)
  ) {
    return "Start time must be before end time";
  }

  // slot interval must be time in minutes
  if (slotInterval !== undefined && !validateSlotInterval(slotInterval)) {
    return "Slot interval must be a positive number";
  }

  // check if slot interval fits within the given work hours
  if (
    startTime !== undefined &&
    endTime !== undefined &&
    slotInterval !== undefined &&
    !validateSlotIntervalLength({ startTime, endTime, slotInterval })
  ) {
    return "Time range for work hours is too short for the slot interval";
  }

  // return nothing if there is no error or problem
  return null;
};
