import { createClient } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase.js";
import { FRONTEND_URL } from "../config.js";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Login error:", error.message);

      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    return res.status(200).json({
      message: "Login successful",
      data,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

export const signup = async (req, res) => {
  try {
    const { email, password, username, role = "public" } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({
        error: "Email, password, and username are required",
      });
    }

    const validRole = ["public", "reporter"].includes(role)
      ? role
      : "public";

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${FRONTEND_URL}/`,
        data: {
          username,
          role: validRole,
        },
      },
    });

    if (error) {
      // Don't reveal that this email is already registered — return the
      // same shape a genuine signup gets so the response can't be used
      // to enumerate existing accounts.
      if (error.code === "user_already_exists") {
        return res.status(200).json({
          message: "Signup successful",
          needsEmailConfirmation: true,
        });
      }

      return res.status(400).json({
        error: error.message,
      });
    }

    return res.status(201).json({
      message: "Signup successful",
      data,
      needsEmailConfirmation: !data.session,
    });
  } catch (error) {
    console.error("Signup error:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email is required",
      });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${FRONTEND_URL}/reset-password`,
    });

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.status(200).json({
       message:
        "If an account exists with this email address, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const {
      password,
      access_token,
      refresh_token,
    } = req.body;

    if (!password) {
      return res.status(400).json({
        error: "Password is required",
      });
    }

    if (!access_token || !refresh_token) {
      return res.status(401).json({
        error: "Authentication session is required",
      });
    }

    const userSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data: sessionData, error: sessionError } =
      await userSupabase.auth.setSession({
        access_token,
        refresh_token,
      });

    if (sessionError || !sessionData.session) {
      return res.status(401).json({
        error: sessionError?.message || "Invalid authentication session",
      });
    }

    const { data, error } =
      await userSupabase.auth.updateUser({
        password,
      });

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Password updated successfully",
      data,
    });
  } catch (error) {
    console.error("Update password error:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email is required",
      });
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Verification email sent successfully",
    });
  } catch (error) {
    console.error("Resend verification error:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};