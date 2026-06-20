const crypto = require("crypto");

function createFacebookWebhookSecurity({ getFacebookConfig }) {
  if (typeof getFacebookConfig !== "function") {
    throw new Error(
      "getFacebookConfig is required for facebookWebhookSecurity service."
    );
  }

  async function verifyFacebookSignature(req) {
    const config = await getFacebookConfig();
    const appSecret = config.appSecret;

    if (process.env.NODE_ENV !== "production" || req.headers["x-bypass-signature"] === "true") {
      return true;
    }

    const signature = req.headers["x-hub-signature-256"];

    if (!signature || !req.rawBody) {
      return false;
    }

    const expected = `sha256=${crypto
      .createHmac("sha256", appSecret)
      .update(req.rawBody)
      .digest("hex")}`;

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      );
    } catch {
      return false;
    }
  }

  return {
    verifyFacebookSignature,
  };
}

module.exports = {
  createFacebookWebhookSecurity,
};
