import pool from "../../config/dbConfig.js";

export const addUnavailableTimeSlotToDB = async (date, timeSlot) => {
  try {
    await pool.query(
      "INSERT INTO unavailable_time_slots (date, time_slot) VALUES ($1, $2)",
      [date, timeSlot],
    );
  } catch (error) {
    console.error(
      "An error occured while trying to add an unavailable time slot:",
      error,
    );
    throw error;
  }
};

export const getUnavailableTimeSlotsByDate = async (date) => {
  try {
    const result = await pool.query(
      "SELECT time_slot FROM unavailable_time_slots WHERE date = $1",
      [date],
    );

    return result.rows;
  } catch (error) {
    console.error(
      "An error occured while trying to get an unavailable time slot:",
      error,
    );
    throw error;
  }
};

