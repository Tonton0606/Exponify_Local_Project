/**
 * Auth Routes
 * - Change Password
 * - Forgot Password / Reset Password
 * - Login OTP Verification
 */

const crypto = require("crypto");
const express = require("express");
const { Resend } = require("resend");

const { supabase } = require("../config/supabase");
const { requireAuthOnly } = require("../middleware/auth");
const { validatePasswordStrength } = require("../middleware/security");
const logger = require("../config/logger");
const { getPasswordResetEmail } = require("../templates/emailTemplate");

const router = express.Router();
const loginOtpRoutes = require("./auth/loginOtpRoutes");

router.use("/login-otp", loginOtpRoutes);

function getFrontendUrl(req) {
  const origin = req.get("origin");

  return (
    process.env.FRONTEND_URL ||
    process.env.PUBLIC_BASE_URL ||
    origin ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY.");
  }

  return new Resend(process.env.RESEND_API_KEY);
}

function getUserFirstName(profile, email) {
  const fullName = profile?.full_name || profile?.name || "";
  const firstName = fullName.trim().split(/\s+/)[0];

  if (firstName) return firstName;

  return String(email || "").split("@")[0] || "there";
}

function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}


router.post("/change-password", requireAuthOnly, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Current password and new password are required.",
      });
    }

    const passwordCheck = validatePasswordStrength(newPassword);
    if (!passwordCheck.valid) {
      return res.status(400).json({
        success: false,
        error: passwordCheck.reason,
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        error: "New password must be different from your current password.",
      });
    }

    const userEmail = req.user.email;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      logger.error("Supabase URL or anon key missing for password verification");
      return res.status(500).json({
        success: false,
        error: "Server configuration error. Please contact support.",
      });
    }

    const verifyRes = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({ email: userEmail, password: currentPassword }),
      }
    );

    if (!verifyRes.ok) {
      logger.warn(
        { userId: req.user.id, email: userEmail },
        "Change password failed: incorrect current password"
      );

      return res.status(400).json({
        success: false,
        error: "Current password is incorrect.",
      });
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      req.user.id,
      { password: newPassword }
    );

    if (updateError) {
      logger.error(
        { userId: req.user.id, error: updateError.message },
        "Failed to update password"
      );

      return res.status(500).json({
        success: false,
        error: "Failed to update password. Please try again.",
      });
    }

    supabase
      .from("security_logs")
      .insert({
        action: "password_changed",
        user_id: req.user.id,
        details: {
          method: "change_password",
          timestamp: new Date().toISOString(),
        },
        ip_address: req.ip || req.connection?.remoteAddress || null,
        user_agent: req.headers["user-agent"] || null,
      })
      .then(() => {})
      .catch((e) => {
        logger.warn(
          { error: e?.message },
          "security_logs insert failed (non-critical)"
        );
      });

    return res.json({
      success: true,
      message: "Password changed successfully. Please sign in again.",
      forceReauth: true,
    });
  } catch (error) {
    logger.error({ error: error.message }, "Change password error");

    return res.status(500).json({
      success: false,
      error: "An unexpected error occurred. Please try again.",
    });
  }
});


router.post("/password-reset", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      error: "A valid email address is required.",
    });
  }

  try {
    const frontendUrl = getFrontendUrl(req);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("email", email)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile) {
      return res.json({
        success: true,
        message:
          "If an account exists for this email, a password reset link will be sent.",
      });
    }

    const rawToken = generateResetToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from("password_reset_tokens")
      .insert({
        user_id: profile.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });

    if (insertError) throw insertError;

    const resetUrl = `${frontendUrl}/auth?type=reset&token=${rawToken}`;

    const html = getPasswordResetEmail({
      firstName: getUserFirstName(profile, email),
      resetPasswordLink: resetUrl,
      unsubscribeLink: `${frontendUrl}/unsubscribe`,
      psLink: `${frontendUrl}/help`,
      logoUrl: `${frontendUrl}/exponify-logo.jpg`,
      companyAddress:
        process.env.COMPANY_ADDRESS || "Exponify PH, Philippines",
    });

    const fromEmail = process.env.MAIL_FROM || "info@exponify.ph";
    const fromName = process.env.MAIL_FROM_NAME || "Exponify";
    const resend = getResendClient();

    const resendResponse = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: email,
      subject: "Reset Your Password",
      html,
      text: [
        `Hi ${getUserFirstName(profile, email)},`,
        "",
        "We received a request to reset the password for your Exponify account.",
        "If you made this request, open the link below to create a new password. This reset link will expire in 60 minutes.",
        "",
        resetUrl,
        "",
        "If you did not request a password reset, you can safely ignore this email.",
        "",
        "The Exponify Team",
      ].join("\n"),
    });

    if (resendResponse?.error) {
      throw new Error(
        resendResponse.error.message || "Failed to send password reset email."
      );
    }

    if (!resendResponse?.data?.id && !resendResponse?.id) {
      throw new Error("Resend did not return an email id.");
    }

    return res.json({
      success: true,
      message:
        "If an account exists for this email, a password reset link will be sent.",
    });
  } catch (error) {
    logger.error(
      { error: error.message, stack: error.stack },
      "Password reset email error"
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "Unable to send password reset email. Please try again later.",
    });
  }
});

router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body || {};

  if (!token || typeof token !== "string") {
    return res.status(400).json({
      success: false,
      error: "Reset token is required.",
    });
  }

  if (!password || password.length < 8) {
    return res.status(400).json({
      success: false,
      error: "Password must be at least 8 characters.",
    });
  }

  try {
    const tokenHash = hashToken(token);

    const { data: tokenRow, error: findError } = await supabase
      .from("password_reset_tokens")
      .select("id, user_id, expires_at, used_at")
      .eq("token_hash", tokenHash)
      .single();

    if (findError || !tokenRow) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired reset token.",
      });
    }

    if (tokenRow.used_at) {
      return res.status(400).json({
        success: false,
        error: "This reset link has already been used.",
      });
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        error: "This reset link has expired.",
      });
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      tokenRow.user_id,
      { password }
    );

    if (updateError) throw updateError;

    await supabase
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenRow.id);

    return res.json({
      success: true,
      message:
        "Password updated successfully. Please sign in with your new password.",
    });
  } catch (error) {
    logger.error(
      { error: error.message, stack: error.stack },
      "Reset password error"
    );

    return res.status(500).json({
      success: false,
      error:
        error.message || "Unable to reset password. Please try again later.",
    });
  }
});

module.exports = router;
