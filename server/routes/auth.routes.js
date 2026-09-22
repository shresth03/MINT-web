import express from "express";
import { rateLimit } from "express-rate-limit";
import {
  login,
  signup,
  forgotPassword,
  updatePassword,
  resendVerification,
} from "../controllers/auth.controller.js";

const router = express.Router();

// Throttle credential-guessing and email-spamming endpoints per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/signup", authLimiter, signup);

router.post("/login", authLimiter, login);

router.post("/logout", (req, res) => {
  res.json({ message: "Logout route working" });
});

router.post("/forgot-password", authLimiter, forgotPassword);

router.patch("/password", updatePassword);

router.post("/resend-verification", authLimiter, resendVerification);

export default router;
