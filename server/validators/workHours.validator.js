import {
  validateTime,
  validateWorkHour,
  validateSlotInterval,
  validateSlotIntervalLength,
} from "../utils/time.util.js";

export const validateWorkHoursInput = ({
  date,
  startTime,
  endTime,
  slotInterval,
}) => {
  if (!date || !startTime || !endTime || !slotInterval) {
    return "All inputs are required";
  }

  // check if date is valid
  if (isNaN(new Date(date).getTime())) {
    return "Invalid date";
  }

  if (!validateTime(startTime)) {
    return "Start time is invalid";
  }
  if (!validateTime(endTime)) {
    return "End time is invalid";
  }

  // make sure that start time is earlier than end time
  if (!validateWorkHour(startTime, endTime)) {
    return "Start time must be before end time";
  }

  // slot interval must be time in minutes
  if (!validateSlotInterval(slotInterval)) {
    return "Slot interval must be a positive number";
  }

  // check if slot interval fits within the given work hours
  if (!validateSlotIntervalLength({ startTime, endTime, slotInterval })) {
    return "Time range for work hours is too short for the slot interval";
  }

  // return nothing if there is no error or problem
  return null;
};
