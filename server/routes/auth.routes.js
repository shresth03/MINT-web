import express from "express";
import {
  login,
  signup,
  forgotPassword,
  updatePassword,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/signup", signup);

router.post("/login", login);

router.post("/logout", (req, res) => {
  res.json({ message: "Logout route working" });
});

router.post("/forgot-password", forgotPassword);

router.patch("/password", updatePassword);

router.post("/resend-verification", (req, res) => {
  res.json({ message: "Resend verification route working" });
});

export default router;