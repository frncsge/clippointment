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

export const getUnavailableTimeSlotsByIdAndDate = async (userId, date) => {
  try {
    const result = await pool.query(
      `
        SELECT 
	        u.account_name AS "barber",
	        wh.date,
	        uts.time_slot,
	        uts.reason
        FROM work_hours wh
        JOIN users u ON u.id = wh.user_id
        JOIN unavailable_time_slots uts ON uts.work_hours_id = wh.id
        WHERE wh.date = $1 AND wh.user_id = $2;
      `,
      [date, userId],
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
