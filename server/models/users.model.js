import pool from "../../config/dbConfig.js";

export const getUserByEmail = async (email) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    return result;
  } catch (error) {
    console.error(
      "An error occured while trying to get user by email:",
      error,
    );
    throw error;
  }
};
