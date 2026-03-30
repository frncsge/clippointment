import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import workHoursRoutes from "./routes/workHours.route.js";
import authRoutes from "./routes/auth.route.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

app.use("/api", authRoutes);
app.use("/api", workHoursRoutes);

app.get("/", (req, res) => {
  res.send("barber-appointment-system server is running");
});

app.listen(port, () => console.log(`Server is listening on port: ${port}`));
