require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const auth = require("./Middelware");
const mongoose = require("mongoose");
const Employee = require("./models/Employee");
const Users = require("./models/Users");

const SECRET = process.env.SECRET;
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 5000;

const app = express();

// ✅ Middleware
app.use(cors({
  origin: "https://stalwart-axolotl-862987.netlify.app",
  methods: ["GET", "POST", "PUT", "DELETE"],
}));
app.use(express.json());


// ✅ Test route (optional but useful)
app.get("/", (req, res) => {
  res.send("Server is running");
});


// ================= ROUTES =================

// LOGIN
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await Users.findOne({ email });

    if (!user || !user.password) {
      return res.json({ message: "user not found" });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.json({ message: "enter valid username or password" });
    }

    const token = jwt.sign({ email }, SECRET, { expiresIn: "2d" });

    res.json({ token });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "internal server error" });
  }
});


// CREATE USER
app.post("/create", async (req, res) => {
  try {
    const { email, password } = req.body;

    const check = await Users.findOne({ email });

    if (check) {
      return res.json({ message: "User already exist" });
    }

    const hashedpass = await bcrypt.hash(password, 10);

    const user = new Users({
      email,
      password: hashedpass,
    });

    await user.save();

    res.json({ message: "New User Created successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "error creating user" });
  }
});


// USERS (Protected)
app.get("/users", auth, async (req, res) => {
  const page = parseInt(req.query.page || 1);
  const limit = parseInt(req.query.limit || 5);

  const total = await Employee.countDocuments();
  const totalPages = Math.ceil(total / limit);

  const users = await Employee.find()
    .skip((page - 1) * limit)
    .limit(limit);

  res.json({ totalPages, users });
});


// ADD USER
app.post("/", auth, async (req, res) => {
  const emp = new Employee(req.body);
  await emp.save();
  res.json({ message: "user add successfully" });
});


// UPDATE
app.put("/user/:id", auth, async (req, res) => {
  try {
    const updateusr = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updateusr) {
      return res.status(404).json({ message: "user not found" });
    }

    res.json(updateusr);

  } catch (err) {
    res.status(500).json({ message: "error in update" });
  }
});


// DELETE
app.delete("/delete/:id", auth, async (req, res) => {
  try {
    const Deleteusr = await Employee.findByIdAndDelete(req.params.id);

    if (!Deleteusr) {
      return res.json({ message: "user not found" });
    }

    res.json({ message: "user delete successfully" });

  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});


// SEARCH
app.post("/search", auth, async (req, res) => {
  try {
    const search = req.body.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const query = {
      name: { $regex: search, $options: "i" }
    };

    const total = await Employee.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const users = await Employee.find(query)
      .skip((page - 1) * limit)
      .limit(limit);

    if (users.length === 0) {
      return res.json({ message: "User not found" });
    }

    res.json({ users, totalPages });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


// ================= DB + SERVER START =================

const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("connect mongodb");

    app.listen(PORT, () => {
      console.log("server is start");
    });

  } catch (err) {
    console.log("MongoDB connection error:", err);
  }
};

startServer();