import jwt from "jsonwebtoken";
import { ErrorHandler } from "../utils/utility.js";

export const isAuthenticated = async (req, res, next) => {
  try {
    const token = req.cookies["chattu-token"];
    console.log("🍪 Auth token:", token);

    if (!token) return next(new ErrorHandler("Please login to access this route", 401));

    const decodedData = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Decoded:", decodedData);

    req.user = decodedData._id;
    next();
  } catch (error) {
    console.log("❌ Auth Error:", error.message);
    next(new ErrorHandler("Invalid or expired token", 401));
  }
};
