import pool from "../../config/dbConfig.js";

export const insertWorkHours = async ({
  date,
  startTime,
  endTime,
  slotInterval,
}) => {
  try {
    await pool.query(
      `
                INSERT INTO work_hours (date, start_time, end_time, slot_interval)
                VALUES ($1, $2, $3, $4)
            `,
      [date, startTime, endTime, slotInterval],
    );
  } catch (error) {
    console.error(
      "An error occured while trying to insert new work hours:",
      error,
    );
    throw error;
  }
};
