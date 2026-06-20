import {
  resendSignupVerification,
  signInWithEmailPassword,
  startLoginOtp,
  signUpWithProfile,
  verifyEmailOtp,
  verifyLoginOtp,
  waitForSignupProfile,
} from "../../services/auth/authActions";

import {
  calculatePasswordStrength,
  getFriendlyAuthError,
  getProgressiveDelay,
} from "../../services/auth/authSecurity";

import { normalizeEmail, waitForCurrentSession } from "./authPageHelpers";

export default function useAuthFormHandlers({
  isLogin,
  setIsLogin,
  isInviteSignup,
  invitePreview,
  inviteToken,
  inviteLoading,
  formData,
  setFormData,
  setError,
  setSuccess,
  passwordStrength,
  setPasswordStrength,
  setFormStartTime,
  failedAttempts,
  setFailedAttempts,
  progressiveDelay,
  setProgressiveDelay,
  requiresCaptcha,
  setRequiresCaptcha,
  captchaVerified,
  setCaptchaVerified,
  setSecurityWarnings,
  setLoading,
  setVerificationEmail,
  setAuthStep,
  otpCode,
  setOtpCode,
  verificationEmail,
  loginOtpChallengeId,
  setLoginOtpChallengeId,
  setLoginOtpEmail,
  resendTimer,
  setResendTimer,
  setTempUserId,
  finishInviteOrRouteUser,
}) {
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (isInviteSignup && name === "email") {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
    setSuccess("");

    if (name === "password" && !isLogin) {
      setPasswordStrength(calculatePasswordStrength(value));
    }

    setFormStartTime(Date.now());
  };

  const resendVerificationEmail = async () => {
    if (resendTimer > 0) return;

    try {
      setLoading(true);
      await resendSignupVerification(verificationEmail);

      setSuccess("Verification email resent! Please check your inbox.");
      setResendTimer(60);
    } catch (err) {
      setError(err.message || "Failed to resend email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const startLoginOtpChallenge = async (email) => {
    const otpData = await startLoginOtp();

    setLoginOtpChallengeId(otpData.challengeId);
    setLoginOtpEmail(email);
    setOtpCode("");
    setAuthStep("loginOtp");
    setResendTimer(60);
    setSuccess("Login code sent. Please check your email.");
  };

  const resendLoginOtp = async () => {
    if (resendTimer > 0) return;

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      await startLoginOtpChallenge(loginOtpEmail || formData.email);
    } catch (err) {
      setError(err.message || "Failed to resend login code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyLoginOTP = async (e) => {
    e.preventDefault();

    if (!loginOtpChallengeId) {
      setError("Login OTP session is missing. Please sign in again.");
      return;
    }

    if (!otpCode || otpCode.length < 6) {
      setError("Please enter the 6-digit login code.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await verifyLoginOtp({
        challengeId: loginOtpChallengeId,
        otp: otpCode,
      });

      setSuccess("Login verified. Redirecting...");

      const session = await waitForCurrentSession();

      if (!session?.user?.id) {
        throw new Error("Login session expired. Please sign in again.");
      }

      await finishInviteOrRouteUser(session.user.id);
    } catch (err) {
      console.error("Login OTP verification error:", err);
      setError(err.message || "Invalid login code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailOTP = async (e) => {
    e.preventDefault();

    if (!otpCode || otpCode.length < 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await verifyEmailOtp({
        email: verificationEmail,
        token: otpCode,
      });

      setSuccess("Email verified successfully. Preparing your workspace...");

      const session = await waitForCurrentSession();

      if (!session?.user?.id) {
        throw new Error(
          "Email verified, but your login session was not created. Please sign in to continue."
        );
      }

      await finishInviteOrRouteUser(session.user.id);
    } catch (err) {
      console.error("OTP verification error:", err);
      setError(err.message || "Invalid verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError("Email and password are required");
      return false;
    }

    if (isInviteSignup) {
      if (!invitePreview?.email) {
        setError("Invitation must be validated before continuing.");
        return false;
      }

      if (normalizeEmail(formData.email) !== normalizeEmail(invitePreview.email)) {
        setError(
          `This invitation is only valid for ${invitePreview.email}. Use the invited email address.`
        );
        return false;
      }
    }

    if (!isLogin) {
      if (!formData.firstName || !formData.lastName) {
        setError("First name and surname are required");
        return false;
      }

      if (!passwordStrength.valid) {
        setError(
          "Password must be at least 12 characters with uppercase, lowercase, number, and special character"
        );
        return false;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    if (formData.website || formData.phone_confirm) {
      setError("Security check failed. Please refresh and try again.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (inviteLoading) {
      setError("Please wait while the invitation is being validated.");
      return;
    }

    if (!validateForm()) return;

    if (progressiveDelay > 0) {
      setError(
        `Please wait ${progressiveDelay / 1000} seconds before trying again...`
      );
      await new Promise((resolve) => setTimeout(resolve, progressiveDelay));
    }

    if (requiresCaptcha && !captchaVerified) {
      setError("Please complete the security verification.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (isLogin) {
        const data = await signInWithEmailPassword({
          email: formData.email,
          password: formData.password,
        });

        if (!data.user.email_confirmed_at) {
          setVerificationEmail(formData.email);
          setAuthStep("verifyEmail");
          setSuccess("Please verify your email before logging in.");
          return;
        }

        await startLoginOtpChallenge(formData.email);
        return;
      }

      const data = await signUpWithProfile({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        companyName: formData.companyName,
        inviteToken,
      });

      await waitForSignupProfile(data.user.id);

      setVerificationEmail(formData.email);
      setAuthStep("verifyEmail");
      setSuccess("Account created! Please verify your email to continue.");
      setResendTimer(60);
      setTempUserId(data.user.id);
    } catch (err) {
      console.error("Auth error:", err);

      setError(getFriendlyAuthError(err));

      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);
      setProgressiveDelay(getProgressiveDelay(newFailedAttempts));

      if (newFailedAttempts >= 3) {
        setRequiresCaptcha(true);
      }

      console.warn(
        `[SECURITY] Failed auth attempt #${newFailedAttempts} for ${formData.email}`
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    if (!isInviteSignup) {
      setIsLogin(!isLogin);
      setError("");
      setSuccess("");
      setFormData({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        companyName: "",
        website: "",
        phone_confirm: "",
      });

      setPasswordStrength({ score: 0, label: "", valid: false });
      setFormStartTime(Date.now());
      setFailedAttempts(0);
      setRequiresCaptcha(false);
      setCaptchaVerified(false);
      setProgressiveDelay(0);
      setSecurityWarnings([]);
      return;
    }

    setIsLogin((prev) => !prev);
    setError("");
    setSuccess("");
    setFormData((prev) => ({
      ...prev,
      email: invitePreview?.email || prev.email,
      password: "",
      firstName: "",
      lastName: "",
      companyName: "",
      website: "",
      phone_confirm: "",
    }));

    setPasswordStrength({ score: 0, label: "", valid: false });
    setFormStartTime(Date.now());
    setFailedAttempts(0);
    setRequiresCaptcha(false);
    setCaptchaVerified(false);
    setProgressiveDelay(0);
    setSecurityWarnings([]);
  };

  return {
    handleInputChange,
    resendVerificationEmail,
    verifyEmailOTP,
    verifyLoginOTP,
    resendLoginOtp,
    handleSubmit,
    toggleMode,
  };
}
