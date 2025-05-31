// <= IMPORTS =>
import jwt from "jsonwebtoken";

// <= AUTHENTICATION =>
const socketAuth = (socket, next) => {
  // GETTING THE COOKIE FROM AUTHORIZATION HEADERS
  const cookieHeader = socket.handshake.headers.cookie || "";
  const tokenCookie = cookieHeader
    .split("; ")
    .find((c) => c.startsWith("token="));
  // IF COOKIE FOUND
  if (tokenCookie) {
    // GETTING TOKEN SECRET FROM COOKIE BY SPLITTING THE COOKIE
    const token = tokenCookie.split("=")[1];
    try {
      // VERIFYING THE TOKEN WITH TOKEN SECRET KEY
      const payload = jwt.verify(token, process.env.TOKEN_SECRET_KEY);
      // SETTING SOCKET USER ID
      socket.userId = payload.userId;
    } catch (error) {
      // IF INVALID TOKEN FOUND
      console.log("Invalid Token Found!", error);
    }
  }
  next();
};

export default socketAuth;
