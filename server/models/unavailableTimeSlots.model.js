import pool from "../../config/dbConfig.js";

export const addUnavailableTimeSlotToDB = async (workHoursId, timeSlots) => {
  try {
    const valuesClause = timeSlots.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(", ");

    const values = timeSlots.flatMap((timeSlot) => [workHoursId, timeSlot]);

    const query = `
      INSERT INTO unavailable_time_slots (work_hours_id, time_slot)
      VALUES ${valuesClause}
    `;

    await pool.query(query, values);
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
