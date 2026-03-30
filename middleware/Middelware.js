require("dotenv").config();
const jwt = require("jsonwebtoken");
const Users = require("../models/Users");

async function auth(req, res, next) {
  const token = req.cookies.token;
  //  console.log(req.cookies.token);

  if (!token) {
    return res.status(401).json({ message: "token missing" });
  }

  try {
    const decode = jwt.verify(token, process.env.SECRET);

    // 🔥 fetch user from DB
    const user = await Users.findById(decode.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "user not found" });
    }

    req.user = user; // ✅ FULL USER OBJECT
    next();

  } catch (err) {
    res.status(403).json({ message: "invalid token" });
  }
}

module.exports = auth;