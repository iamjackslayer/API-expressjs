const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const User = require("../../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");

// @route POST /api/users
// @desc Sign Up
// @access Public
const validators = [
  check("name", "Name is required").not().isEmpty(),
  check("email", "Email is required").not().isEmpty(),
  check(
    "password",
    "Password length must be at least three characters."
  ).isLength({
    min: 3,
  }),
];
router.post("/", [...validators], async (req, res) => {
  const vRes = validationResult(req);
  if (!vRes.isEmpty()) return res.status(400).json({ errors: vRes.array() });
  const { name, email, password } = req.body;
  try {
    // See if user exists
    let user = await User.findOne({ email });
    if (user)
      return res.status(400).json({ errors: [{ msg: "User already exists" }] });

    // Has user password
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    user = new User({
      name,
      email,
      password: hash,
    });
    await user.save();

    // Return jsonwebtoken to client
    const key = config.get("jwtSecret");
    const payload = {
      user: {
        id: user.id,
      },
    };
    jwt.sign(payload, key, { expiresIn: "2 days" }, (err, encoded) => {
      if (err) throw err;
      res.json({ token: encoded });
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
