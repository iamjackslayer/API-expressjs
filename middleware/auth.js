const jwt = require("jsonwebtoken");
const config = require("config");
const User = require("../models/User");

module.exports = async function (req, res, next) {
  // Get token from req headers
  const token = req.header("x-auth-token");

  // Check if no token
  if (!token)
    return res
      .status(500)
      .json({ errors: [{ msg: "No token, authorization denied" }] });

  try {
    const secret = config.get("jwtSecret");
    // Get the hidden data in token (we created in POST /api/users)
    // Recall: the data is { user: { id: ...}}
    const decoded = jwt.verify(token, secret);

    // Check if the token owner still exists in the db.
    const user = await User.findById(decoded.user.id);
    if (!user)
      return res.status(401).json({ errors: [{ msg: "Token is invalid" }] });
    req.user = { id: user.id }; // Any private route can use this property of req
    next();
  } catch (e) {
    return res.status(401).json({ errors: [{ msg: "Token is invalid" }] });
  }
};
