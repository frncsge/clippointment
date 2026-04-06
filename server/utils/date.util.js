// returns true if pattern is matched, otherwise false
export const validateDateFormat = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date);

// function returns true if date is a number
export const validateDateValues = (date) => {
  const parsedDate = new Date(date);

  // date is not a number
  if (isNaN(parsedDate)) return false;

  // double check date has not been changed
  const [year, month, day] = date.split("-").map((str) => Number(str));
  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() + 1 !== month ||
    parsedDate.getDate() !== day
  )
    return false;

  return true;
};

export const isPastDate = (date) => {
  const inputDate = new Date(date);
  const today = new Date();

  inputDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return inputDate < today; // true if input date is before today
};
