import express from "express";
import { login } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/signup", (req, res) => {
  res.json({ message: "Signup route working" });
});

router.post("/login", login);

router.post("/logout", (req, res) => {
  res.json({ message: "Logout route working" });
});

router.post("/forgot-password", (req, res) => {
  res.json({ message: "Forgot password route working" });
});

router.patch("/password", (req, res) => {
  res.json({ message: "Update password route working" });
});

router.post("/resend-verification", (req, res) => {
  res.json({ message: "Resend verification route working" });
});

export default router;