const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const User = require("../../models/User");
const jwt = require("jsonwebtoken");
const config = require("config");
const bcrypt = require("bcryptjs");
const auth = require("../../middleware/auth");

// @route GET /api/auth
// @desc Get user info + Authenticate with existing token
// @access Private
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (e) {
    return res.status(500).json({ errors: [{ msg: "Server error" }] });
  }
});

// @route POST /api/auth
// @desc Authenticate and get token
// @access Public
const validator = [
  check("email", "Please enter a valid email address.").isEmail(),
  check("password", "Password is required").exists(),
];
router.post("/", [...validator], async (req, res) => {
  const vRes = validationResult(req);
  if (!vRes.isEmpty()) return res.status(400).json({ errors: vRes.array() });
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ errors: [{ msg: "Invalid credentials" }] });

    // Check if password matches hash
    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch)
      return res.status(400).json({ errors: [{ msg: "Invalid credentials" }] });

    // Create and return jwt
    const secret = config.get("jwtSecret");
    const payload = {
      user: {
        id: user.id,
      },
    };
    jwt.sign(payload, secret, { expiresIn: "2 days" }, (err, encoded) => {
      if (err) throw err;
      return res.json({ token: encoded });
    });
  } catch (e) {
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
