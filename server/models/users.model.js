import pool from "../../config/dbConfig.js";

export const getUserByEmail = async (email) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    return result;
  } catch (error) {
    console.error("An error occured while trying to get user by email:", error);
    throw error;
  }
};

export const storeNewUser = async ({ email, hashedPassword, accountName }) => {
  try {
    const result = await pool.query(
      "INSERT INTO users (email, hashed_password, account_name) VALUES ($1, $2, $3) RETURNING id",
      [email, hashedPassword, accountName],
    );

    return result;
  } catch (error) {
    console.error("An error occured while trying to store new user:", error);
    throw error;
  }
};
