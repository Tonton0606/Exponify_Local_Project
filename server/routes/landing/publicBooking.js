const logger = require('../../config/logger');
const express = require("express");
const {
  createExternalLandingBooking,
} = require("../../services/landing/publicLandingBookingService");

const router = express.Router();

function getOriginDomain(req) {
  const origin = req.headers.origin || req.headers.referer || "";

  return String(origin)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

router.post("/book", async (req, res) => {
  try {
    const payload = {
      ...req.body,
      source_domain: req.body?.source_domain || getOriginDomain(req),
    };

    const result = await createExternalLandingBooking(payload);

    return res.status(201).json({
      success: true,
      message: "Booking created successfully.",
      booking_id: result.booking?.id || null,
      contact_id: result.contact?.id || null,
      lead_id: result.lead?.id || null,
      landing_page_id: result.landingPage?.id || null,
    });
  } catch (error) {
    logger.error("EXTERNAL LANDING BOOKING ERROR:", error);

    return res.status(400).json({
      success: false,
      error: error.message || "Failed to create landing booking.",
    });
  }
});

router.get("/book/test", (_req, res) => {
  return res.json({
    success: true,
    route: "landing-public-booking",
  });
});

module.exports = router;
