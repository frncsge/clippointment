import pool from "../../config/dbConfig.js";

export const createWorkHours = async ({
  userId,
  date,
  startTime,
  endTime,
  slotInterval,
}) => {
  try {
    await pool.query(
      `
                INSERT INTO work_hours (user_id, date, start_time, end_time, slot_interval)
                VALUES ($1, $2, $3, $4, $5)
            `,
      [userId, date, startTime, endTime, slotInterval],
    );
  } catch (error) {
    console.error(
      "An error occured while trying to create new work hours:",
      error,
    );
    throw error;
  }
};

export const getWorkHoursByDate = async (date) => {
  try {
    const result = await pool.query(
      "SELECT * FROM work_hours WHERE date = $1",
      [date],
    );
    return result;
  } catch (error) {
    console.error(
      "An error occured while trying to get work hours by date:",
      error,
    );
    throw error;
  }
};

export const updateWorkHoursByDate = async ({ date, keys, values }) => {
  const setClaus = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");

  const query = `
    UPDATE work_hours
    SET ${setClaus}
    WHERE date = $${keys.length + 1}
    RETURNING *
  `;

  values.push(date);
  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error(
      "An error occured while trying to update work hours by date:",
      error,
    );
    throw error;
  }
};

export const deleteWorkHoursByDate = async (date) => {
  try {
    const result = await pool.query("DELETE FROM work_hours WHERE date = $1", [date]);

    return result;
  } catch (error) {
    console.error(
      "An error occured while trying to delete work hours by date:",
      error,
    );
    throw error;
  }
};
