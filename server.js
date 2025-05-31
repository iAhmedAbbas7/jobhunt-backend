// <= DOTENV CONFIGURATION =>
dotenv.config({});

// <= IMPORTS =>
import path from "path";
import cors from "cors";
import http from "http";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import jobRoute from "./routes/job.route.js";
import rootRoute from "./routes/root.route.js";
import userRoute from "./routes/user.route.js";
import chatRoute from "./routes/chat.route.js";
import connectDB from "./config/dbConnection.js";
import startScheduler from "./utils/scheduler.js";
import corsOptions from "./config/corsOptions.js";
import { logEvents } from "./middleware/logger.js";
import { getDirName } from "./utils/getDirName.js";
import companyRoute from "./routes/company.route.js";
import commentRoute from "./routes/comment.route.js";
import articleRoute from "./routes/article.route.js";
import initializeSocket from "./utils/socketHandler.js";
import scheduleRoutes from "./routes/scheduled.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import applicationRoute from "./routes/application.route.js";
import notificationRoute from "./routes/notification.route.js";
import recommendationRoute from "./routes/recommendation.route.js";

// <= DATABASE CONNECTION =>
connectDB();

// <= DIRNAME =>
const __dirname = getDirName(import.meta.url);

// <= APP =>
const app = express();

// <= PORT =>
const PORT = process.env.PORT || 3000;

// <= MIDDLEWARE> =>
// CORS MIDDLEWARE
app.use(cors(corsOptions));
// JSON MIDDLEWARE
app.use(express.json());
// FORM DATA MIDDLEWARE
app.use(express.urlencoded({ extended: true }));
// COOKIE PARSER MIDDLEWARE
app.use(cookieParser());
// STATIC MIDDLEWARE
app.use("/", express.static(path.join(__dirname, "public")));

// <= ROUTES MIDDLEWARE =>
// ROOT ROUTE
app.use("/", rootRoute);
// JOB ROUTE
app.use("/api/v1/job", jobRoute);
// USER ROUTES
app.use("/api/v1/user", userRoute);
// CHAT ROUTE
app.use("/api/v1/chat", chatRoute);
// ARTICLE ROUTE
app.use("/api/v1/article", articleRoute);
// COMPANY ROUTE
app.use("/api/v1/company", companyRoute);
// COMMENT ROUTE
app.use("/api/v1/comment", commentRoute);
// SCHEDULE ROUTE
app.use("/api/v1/schedule", scheduleRoutes);
// APPLICATION ROUTE
app.use("/api/v1/application", applicationRoute);
// NOTIFICATION ROUTE
app.use("/api/v1/notification", notificationRoute);
// RECOMMENDATION ROUTE
app.use("/api/v1/recommendation", recommendationRoute);

// <= MIDDLEWARE 404 RESPONSE =>
app.all("*", (req, res) => {
  // SETTING STATUS
  res.status(404);
  // RESPONSE HANDLING
  if (req.accepts("html")) {
    // HTML RESPONSE
    res.sendFile(path.join(__dirname, "views", "404.html"));
  } else if (req.accepts("json")) {
    // JSON RESPONSE
    res.json({ message: "404 : Page Not Found" });
  } else {
    // TEXT RESPONSE
    req.type("txt").send("404 : Page Not Found");
  }
});

// <= ERROR HANDLER =>
app.use(errorHandler);

// <= SETTING UP HTTP SERVER & SOCKET.IO =>
const server = http.createServer(app);

// <= INITIALIZING SOCKET.IO WITH HTTP SERVER & CORS OPTIONS =>
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true,
  },
});

// <= INITIALIZING SOCKET CONNECTION =>
initializeSocket(io);

// <= MAKING THE SOCKET.IO INSTANCE AVAILABLE IN ALL ROUTES & CONTROLLERS =>
app.set("socketio", io);

// <= STARTING THE SCHEDULER =>
startScheduler(io);

// <= DATABASE & SERVER CONNECTION LISTENER =>
mongoose.connection.once("open", () => {
  console.log("Database Connection Established Successfully");
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

// <= DATABASE CONNECTION ERROR LISTENER =>
mongoose.connection.on("error", (err) => {
  console.log(err);
  logEvents(
    `${err.no}: ${err.code}\t${err.syscall}\t${err.hostname}`,
    "mongoErrLog.log"
  );
});
