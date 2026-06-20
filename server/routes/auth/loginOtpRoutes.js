const crypto = require("crypto");
const express = require("express");

const { supabase } = require("../../config/supabase");
const { requireAuthOnly } = require("../../middleware/auth");
const logger = require("../../config/logger");
const { sendEmail } = require("../../services/emailService");

const router = express.Router();

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashOtp(otp) {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

function getUserFirstName(profile, email) {
  const fullName = profile?.full_name || profile?.name || "";
  const firstName = fullName.trim().split(/\s+/)[0];
  return firstName || String(email || "").split("@")[0] || "there";
}

function getLoginOtpEmail({ firstName, otp }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;">
      <h2 style="margin:0 0 12px;color:#111827;">Your Exponify login code</h2>
      <p style="color:#374151;">Hi ${firstName || "there"},</p>
      <p style="color:#374151;">Use this 6-digit code to complete your login:</p>
      <div style="font-size:32px;font-weight:800;letter-spacing:8px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:18px;text-align:center;color:#111827;">
        ${otp}
      </div>
      <p style="color:#6b7280;font-size:13px;margin-top:20px;">This code expires in 10 minutes. If you did not try to log in, ignore this email.</p>
    </div>
  `;
}

router.post("/start", requireAuthOnly, async (req, res) => {
  try {
    const user = req.user;
    const email = String(user.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "User email is required.",
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { data: challenge, error: insertError } = await supabase
      .from("login_otp_challenges")
      .insert({
        user_id: user.id,
        email,
        otp_hash: hashOtp(otp),
        expires_at: expiresAt,
      })
      .select("id, expires_at")
      .single();

    if (insertError) throw insertError;

    const firstName = getUserFirstName(profile, email);

    const emailResult = await sendEmail({
      to: email,
      subject: "Your Exponify login code",
      html: getLoginOtpEmail({ firstName, otp }),
      text: [
        `Hi ${firstName},`,
        "",
        `Your Exponify login code is: ${otp}`,
        "",
        "This code expires in 10 minutes.",
        "If you did not try to log in, ignore this email.",
      ].join("\n"),
    });

    if (!emailResult?.success) {
      throw new Error(emailResult?.error || "Failed to send login OTP email.");
    }

    return res.json({
      success: true,
      challengeId: challenge.id,
      expiresAt: challenge.expires_at,
      message: "Login OTP sent.",
    });
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, "Login OTP start error");

    return res.status(500).json({
      success: false,
      error: "Unable to send login OTP. Please try again.",
    });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const challengeId = String(req.body?.challengeId || "").trim();
    const otp = String(req.body?.otp || "").replace(/\D/g, "");

    if (!challengeId || otp.length !== 6) {
      return res.status(400).json({
        success: false,
        error: "Challenge ID and 6-digit OTP are required.",
      });
    }

    const { data: challenge, error: fetchError } = await supabase
      .from("login_otp_challenges")
      .select("*")
      .eq("id", challengeId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!challenge) {
      return res.status(400).json({ success: false, error: "Invalid login code." });
    }

    if (challenge.consumed_at || challenge.verified_at) {
      return res.status(400).json({
        success: false,
        error: "This login code has already been used.",
      });
    }

    if (new Date(challenge.expires_at).getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        error: "This login code has expired.",
      });
    }

    if (Number(challenge.attempts || 0) >= 5) {
      return res.status(429).json({
        success: false,
        error: "Too many attempts. Please log in again.",
      });
    }

    if (challenge.otp_hash !== hashOtp(otp)) {
      await supabase
        .from("login_otp_challenges")
        .update({ attempts: Number(challenge.attempts || 0) + 1 })
        .eq("id", challenge.id);

      return res.status(400).json({ success: false, error: "Invalid login code." });
    }

    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("login_otp_challenges")
      .update({
        verified_at: now,
        consumed_at: now,
        attempts: Number(challenge.attempts || 0) + 1,
      })
      .eq("id", challenge.id);

    if (updateError) throw updateError;

    return res.json({
      success: true,
      userId: challenge.user_id,
      email: challenge.email,
      message: "Login OTP verified.",
    });
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, "Login OTP verify error");

    return res.status(500).json({
      success: false,
      error: "Unable to verify login OTP. Please try again.",
    });
  }
});

module.exports = router;
