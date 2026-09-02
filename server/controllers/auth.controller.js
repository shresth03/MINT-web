import { supabase } from "../lib/supabase.js";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      return res.status(401).json({
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Login successful",
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};