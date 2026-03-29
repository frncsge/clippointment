import pool from "../../config/dbConfig.js";

export const getUserByUsername = async (username) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    return result;
  } catch (error) {
    console.error(
      "An error occured while trying to get user by username:",
      error,
    );
    throw error;
  }
};
