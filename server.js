require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const auth = require("./middleware/Middelware");
const check = require("./middleware/SuperAuth");
const mongoose = require("mongoose");
const Employee = require("./models/Employee");
const Users = require("./models/Users");

const SECRET = process.env.SECRET;
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 5000;
const cookieParser = require("cookie-parser");

const app = express();
app.use(cookieParser());

// ✅ Middleware
app.use(cors({
  origin : "http://localhost:5173",
  credentials :true
  // origin: "https://stalwart-axolotl-862987.netlify.app",
  // methods: ["GET", "POST", "PUT", "DELETE"],
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
     const emailNormalized =email.trim();

    const user = await Users.findOne({ email:emailNormalized });

    if (!user || !user.password) {
      return res.json({ message: "user not found" });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.json({ message: "enter valid username or password" });
    }

    const token = jwt.sign({id:user._id  }, SECRET, { expiresIn: "2d" });
    // console.log(user.role);
    res.cookie("token",token,{
      httpOnly :true,
      secure :false,
      sameSite :"lax",
    });

    res.json({role:user.role ,message:"" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "internal server error" });
  }
});


// CREATE USER
app.post("/create", async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailNormalized = email.trim();

    const exist = await Users.findOne({ email: emailNormalized });

    if (exist) {
    return res.status(409).json({ message: "User already exist" });
}
    const hashedpass = await bcrypt.hash(password, 10);

    const user = new Users({
      email: emailNormalized,
      password: hashedpass,
      role:"user",
    });

    await user.save();

    res.json({ message: "New User Created successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "error creating user" });
  }
});


// USERS (Protected)
app.get("/clints", auth, async (req, res) => {
  const page = parseInt(req.query.page || 1);
  const limit = parseInt(req.query.limit || 5);

  const total = await Employee.countDocuments();
  const totalPages = Math.ceil(total/limit);

  const users = await Employee.find()
    .skip((page - 1) * limit)
    .limit(limit);

  res.json({ totalPages, users });
});
app.get("/users", auth,check("admin" ,"superadmin") ,async (req, res) => {
  const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 5;
// console.log("user route hit");

  const total = await Users.countDocuments();
  const totalPages = Math.ceil(total/limit);

  const users = await Users.find().select("-password")
    .skip((page - 1) * limit)
    .limit(limit);

  res.json({ totalPages, users });
});

// ADD USER
app.post("/", auth, check("superadmin","admin"),async (req, res) => {
 const { name, number, add } = req.body;
const emp = await new Employee({ name, number, add });
  await emp.save();
  res.json({ message: "user add successfully" });
});


// UPDATE
app.put("/clint/:id", auth, async (req, res) => {
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
app.delete("/delete/:id", auth,check("superadmin"),async (req, res) => {
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
    const search = req.body.search ;
    serch =search || "";
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
                 // user search

app.post("/usrsearch", auth, async (req, res) => {
  try {
    let { search } = req.body||"";

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    // ✅ prevent empty search
    // if (!search || search.trim() === "") {
    //   return res.status(400).json({ message: "Search is required" });
    // }

    // escape regex (IMPORTANT)
    const escapeRegex = (text) => {
      return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    const safeSearch = escapeRegex(search.trim());

    //  query (email + name optional)
    const query = {
      $or: [
        { email: { $regex: safeSearch, $options: "i" } },
        // { name: { $regex: safeSearch, $options: "i" } }
      ]
    };

    const total = await Users.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const users = await Users.find(query)
      .select("-password") // 🔥 hide password
      .skip((page - 1) * limit)
      .limit(limit);

    // ✅ consistent response
    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      users,
      totalPages,
      // currentPage: page
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

/*CHANGE ROLE */
app.put("/change-role/:id", auth, check("superadmin"), async (req, res) => {
  try {
    const { id } = req.params;

    if(req.user.id===id){
       return res.json({message :"you can not change our role "})
    }

    const user = await Users.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔥 toggle role
    if (user.role === "user") {
      user.role = "admin";
    } else if (user.role === "admin") {
      user.role = "user";
    }

    await user.save();

    res.json({ message: "Role updated", role: user.role });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/logout" ,(req ,res)=>{
  res.clearCookie("token");
  res.json({message : "logged out successfully"});

});

app.get("/me", auth, (req, res) => {
  res.json({ user: req.user });
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