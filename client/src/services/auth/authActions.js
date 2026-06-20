import { supabase } from "../../config/supabaseClient";
import { buildInviteSignupMetadata } from "./workspaceInviteAuth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

export async function getCurrentSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  return session;
}

export async function getProfileRole(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error) throw error;

  return data?.role || null;
}

export function getDashboardRouteForRole(role) {
  return role === "Admin" || role === "SuperAdmin"
    ? "/Admin/Dashboard"
    : "/ClientDashboard";
}

export async function signInWithEmailPassword({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data;
}

export async function startLoginOtp() {
  const session = await getCurrentSession();

  if (!session?.access_token) {
    throw new Error("Login session is required to send OTP.");
  }

  const response = await fetch(`${API_BASE_URL}/auth/login-otp/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.error || "Failed to send login OTP.");
  }

  return data;
}

export async function verifyLoginOtp({ challengeId, otp }) {
  const response = await fetch(`${API_BASE_URL}/auth/login-otp/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ challengeId, otp }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.error || "Failed to verify login OTP.");
  }

  return data;
}

export async function signUpWithProfile({
  email,
  password,
  firstName,
  middleName,
  lastName,
  companyName,
  inviteToken = "",
}) {
  const inviteMetadata = await buildInviteSignupMetadata(inviteToken);

  const fullName = `${firstName} ${
    middleName ? `${middleName} ` : ""
  }${lastName}`.trim();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        company_name: companyName || null,
        ...inviteMetadata,
      },
    },
  });

  if (error) throw error;

  return data;
}

export async function resendSignupVerification(email) {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });

  if (error) throw error;

  return true;
}

export async function verifyEmailOtp({ email, token }) {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) throw error;

  return true;
}

/**
 * Send a password-reset email. Supabase emails a magic link; on click the user
 * lands on /reset-password with a `type=recovery` hash token so they can set
 * a new password on the dedicated reset page.
 */
export async function requestPasswordReset(email) {
  const redirectTo = `${window.location.origin}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  });
  if (error) throw error;
  return true;
}

/**
 * Update the current authenticated user's password.
 * Must be called while a valid session exists (either regular or recovery session).
 */
export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data;
}

export async function waitForSignupProfile(userId) {
  if (!userId) return null;

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;

  return data;
}
