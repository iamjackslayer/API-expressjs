const express = require("express");
const app = express();
const path = require("path");
const connectDB = require("./config/db");

// connect to DB
connectDB();

const PORT = process.env.PORT || 5000;

app.use(express.json({ extended: false }));

// define routes
app.use("/api/users", require("./routes/api/users"));
app.use("/api/posts", require("./routes/api/posts"));
app.use("/api/profiles", require("./routes/api/profiles"));
app.use("/api/auth", require("./routes/api/auth"));

app.listen(PORT, () => {
  console.log(`Server started on PORT ${PORT}.`);
});
