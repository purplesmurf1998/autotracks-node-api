/*===============================================================

MAIN ENTRY POINT TO EXPRESS SERVER

This file is where we create the server, set up the routes,
set up the middleware and all other configs our server will
have. The file should finish by running the server and listening
on a certain PORT number.

=================================================================*/

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

const authRoutes = require("./routes/authentication");
const userRoutes = require("./routes/users");
const dealershipRoutes = require("./routes/dealerships");
const rolesRoutes = require("./routes/roles");

if (process.env.NODE_ENV === "development") {
  console.log("Running in development mode.");
  dotenv.config({ path: "./.env" });
}

// create the server app
const app = express();

// disable x-powered-by header
app.disable("x-powered-by");

// connect to MongoDB
mongoose.connect(process.env.MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// apply CORS to routes
app.use(
  cors({
    origin: "*",
  })
);

// needed to be able to parse request body
app.use(express.json());

// mount controller routes
app.use("/auth", authRoutes);
app.use("/accounts/:accountId/users", userRoutes);
app.use("/accounts/:accountId/dealerships", dealershipRoutes);
app.use("/accounts/:accountId/dealerships/:dealershipId/roles", rolesRoutes);

// mount error handler function
app.use((err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  res
    .status(error.status || 500)
    .json({ error: error.message || "Internal server error." });
});

// start the server
app.listen(process.env.PORT, () => {
  console.log(`Autotracks API listening on port ${process.env.PORT}`);
  mongoose.connection.once("open", function () {
    console.log("Connected successfully to MongoDB");
  });
});
