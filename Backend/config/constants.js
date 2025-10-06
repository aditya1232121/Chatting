// Backend/config/constants.js
import dotenv from "dotenv";
dotenv.config();

export const envMode = process.env.NODE_ENV || "DEVELOPMENT";
export const clientURL = process.env.CLIENT_URL || "http://localhost:5173";
export const adminSecretKey = process.env.ADMIN_SECRET_KEY || "supersecret123";
