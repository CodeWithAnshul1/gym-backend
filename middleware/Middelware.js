require("dotenv").config();
const jwt = require("jsonwebtoken");
// const Users = require("../models/Users");
const connectDB = require("../tenant/dbmanager");
const getUserModel = require("../models/Users");

async function auth(req, res, next) {

  // ✅ get token from header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token missing" });
  }
// console.log("AUTH HEADER:", req.headers.authorization);
  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    // console.log(decoded);
    const tenantId =decoded.tenantId;

    if(!tenantId){
      return res.status(400).json({message :"invalid token "});
    }

    const db = await connectDB(tenantId);

    const Users =getUserModel(db);

    // ✅ fetch latest user from DB
    const user = await Users.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    req.db=db;
    req.user = user; // 🔥 full user (with role)
    next();

  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = auth;