var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const cors = require("cors");
const mongoose = require("mongoose");
const expressValidator = require("express-validator");
const compression = require("compression");
// to clear the console after modifications
process.stdout.write("\u001b[2J\u001b[0;0H");
/* Loads all variables from .env file to "process.env" */
require("dotenv").config();
/* Require our models here so we can use the mongoose.model() singleton to reference our models across our app */
require("./models/User");
const {
  User,
  Post,
  Conversation,
  Notification,
  Comment,
  Reaction,
  Replay,
  Message,
} = require("./models/User");

const routes = require("./routes");

var app = express();
// env variables
const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 3000;
const ROOT_URL = dev ? `http://localhost:${port}` : process.env.PRODUCTION_URL;
// mongoose options - connection
const mongooseOptions = {
  useNewUrlParser: true,
};
mongoose.set("strictQuery", true);
mongoose
  .connect(process.env.MONGO_URI, mongooseOptions)
  .then(() => console.log("DB connected"));

mongoose.connection.on("error", (err) => {
  console.log(`DB connection error: ${err.message}`);
});

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(
  cors({
    credentials: true,
    origin: ["http://localhost:4200"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, 'static')))
/* Express Validator will validate form data sent to the backend */
app.use(expressValidator());

if (!dev) {
  sessionConfig.cookie.secure = true; // serve secure cookies in production environment
  app.set("trust proxy", 1); // trust first proxy
}

app.use((req, res, next) => {
  /* custom middleware to put our user data (from passport) on the req.user so we can access it as such anywhere in our app */
  res.locals.user = req.user || null;
  next();
});

/* apply routes from the "routes" folder */
app.use("/", routes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

/* Error handling from async / await functions */
/* app.use((err, req, res, next) => {
  const { status = 500, message } = err;
  res.status(status).json(message);
});
 */


module.exports = app;
