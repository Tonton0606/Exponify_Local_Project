const express = require("express");
const router = express.Router();
const { supabase } = require("../config/supabase");

router.get("/", (req, res) => {
  res.json({ message: "API is working!" });
});

module.exports = router;
