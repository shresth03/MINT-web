import { createClient } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase.js";

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
      return res.status(401).json({
        error: error.message,
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
        emailRedirectTo: `${process.env.FRONTEND_URL}/`,
        data: {
          username,
          role: validRole,
        },
      },
    });

    if (error) {
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
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    });

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Password reset email sent",
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
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: "Password is required",
      });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Authorization token is required",
      });
    }

    const accessToken = authHeader.split(" ")[1];

    const { data: userData, error: userError } =
      await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return res.status(401).json({
        error: "Invalid or expired authentication token",
      });
    }

    const userSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    const { data, error } = await userSupabase.auth.updateUser({
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