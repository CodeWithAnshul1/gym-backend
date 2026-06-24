require("dotenv").config();
const express = require("express");

const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const auth = require("./middleware/Middelware");
const check = require("./middleware/SuperAuth");
const mongoose = require("mongoose");
const crypto = require("crypto");
const cookiesParser = require("cookie-parser");

const connectDB = require("./tenant/dbmanager");
const getUserModel = require("./models/Users");
const getEmployeeModel = require("./models/Employee");
const getPaymentModel = require("./models/Payment");
const razorpay =require("./tenant/razorpay");

const sendmail =require("./api/sendotp");
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 5000;


const app = express();
app.use(cookiesParser());

// ✅ Middleware
app.use(cors({
  // origin :  "http://localhost:5173",
  origin: "https://anshulgymhub.netlify.app",
  credentials :true,
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
    const { email, password, tenantId} = req.body;

    if (!email || !password || !tenantId) {
      return res.status(400).json({ message: "All fields required" });
    }
    // console.log(tenantId);

    // 🔥 connect correct DB
    const db = await connectDB(tenantId);

    // 🔥 dynamic model
    const Users = getUserModel(db);

    const user = await Users.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if(!user.verified){
      return res.status(404).json({message :"verify account first "});
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 🔥 store tenantId in token
    const token = jwt.sign(
      {
        id: user._id,
        tenantId:tenantId,
      
      },
      process.env.SECRET,
      { expiresIn: "2d" }


    );

    res.cookie("token",token,{
      httpOnly:true,
      secure:true,
      sameSite:"lax",
      maxAge:2 * 24 * 60 * 60 * 1000,
    });
    // console.log(res.getHeaders());

    res.json({
      message: "Login successful",
      // token,
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});


// CREATE USER
app.post("/send-singup-otp", async (req, res) => {
  try {
    const { email, password, tenantId, type } = req.body;
        // console.log({type} );


    const db = await connectDB(tenantId);
    const Users = getUserModel(db);

    let user = await Users.findOne({ email });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // ================= SIGNUP =================
    if (type === "signup") {

      if (user && user.verified) {
        return res.status(409).json({ message: "User already exists" });
      }

      const hashedpass = await bcrypt.hash(password, 10);
      if(!user.verified){
        user.password=hashedpass,
        user.otp= otp,
        user.otpExpiry= Date.now() + 5 * 60 * 1000,
        user.otptype="signup",

        await sendmail( otp , email,type);
        await user.save();
      

      }
      else{

        user = new Users({
          email,
          password: hashedpass,
          role: "user",
          tenantId,
          otp,
          otpExpiry: Date.now() + 5 * 60 * 1000,
          otptype: "signup",
        });
      }

      // await transporter.sendMail({
      //   from: "anshulmogha50@gmail.com",
      //   to: email,
      //   subject: "Your 6 digit OTP",
      //   text: otp
      // });

      await user.save();
      await sendmail(otp , email ,type);
    }

    // ================= FORGOT =================
    else if (type === "forgot") {

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }


      user.otp = otp;
      user.otpExpiry = Date.now() + 5 * 60 * 1000;
      user.otptype = "forgot";

      // await transporter.sendMail({
      //   from: "anshulmogha50@gmail.com",
      //   to: email,
      //   subject: "Reset Password OTP",
      //   text: otp
      // });

      await user.save(); // ✅ VERY IMPORTANT
      await sendmail(otp , email , type);
    }

    res.json({ message: "OTP sent successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error sending OTP" });
  }
});



app.post("/verify-otp", async (req,res)=>{

 try{

   const {tenantId,email,otp,type} = req.body;
  //  const type=(req.query.type);

   const db = await connectDB(tenantId);

   const Users = getUserModel(db);

   const user = await Users.findOne({email});

   if(!user){
      return res.status(404).json({
         message:"User not found"
      });
   }

   if(!user.otp || Date.now() > user.otpExpiry){
      return res.status(400).json({
         message:"OTP expired"
      });
   }

   if(otp !== user.otp){
      return res.status(400).json({
         message:"Invalid OTP"
      });
   }
   if(type==="signup"){

     user.verified = true;
    }

    if(type === "forgot"){
      user.forgot=true;
    }
    
    
    
    user.otp = null;
    user.otpExpiry = null;
    user.otptype =null;
    await user.save();
    

   res.json({
      message:"Account verified successfully"
   });


 }catch(err){
   console.log(err);

   res.status(500).json({
      message:"Server error"
   });
 }

});

app.post("/new-pass", async (req, res) => {
  try {
    const { email, tenantId, password } = req.body;

    if (!email || !tenantId || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const db = await connectDB(tenantId);
    const Users = getUserModel(db);

    const user = await Users.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.forgot) {
      return res.status(400).json({ message: "Unauthorized request" });
    }

    const hashpass = await bcrypt.hash(password, 10);

    user.password = hashpass;

    // ✅ FIX
    user.forgot = false;

    await user.save();

    res.json({ message: "Password updated successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});


// USERS (Protected)
app.get("/clints", auth, async (req, res) => {
  const page = parseInt(req.query.page || 1);
  const limit = parseInt(req.query.limit || 5);

  const Employee =  getEmployeeModel(req.db);

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
  const Users = getUserModel(req.db);


  const total = await Users.countDocuments();
  const totalPages = Math.ceil(total/limit);

  const users = await Users.find().select("-password")
    .skip((page - 1) * limit)
    .limit(limit);

  res.json({ totalPages, users });
});

// ADD USER
app.post("/", auth, check("superadmin", "admin"), async (req, res) => {
  try {
    const { name, number, add, month } = req.body;

    // ✅ validation
    if (!name || !number || !add || !month) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (!/^[0-9]{10}$/.test(number)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    if (month < 1) {
      return res.status(400).json({ message: "Invalid month" });
    }

    const startdate = new Date();
    const endate = new Date(startdate);
    endate.setMonth(endate.getMonth() + Number(month));

    const Employee = getEmployeeModel(req.db);

    const emp = new Employee({
      name,
      number,
      add,
      entrydate: startdate,
      expiredate: endate,
    });

    await emp.save();

    const Payment = getPaymentModel(req.db);
     const payment = new Payment({
      amount: (month*700),
      entrydate :startdate,
      userId : emp._id,
     });
     console.log(payment);
     try{
       await payment.save();
      console.log("payment save ");

     }
     catch(ee){
      console.log("payment fail", ee);
     }


    res.json({ message: "User added successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

//add fee by user 
app.post("/create-order", auth ,async (req , res)=>{
  try{

    const {month , id}=req.body;
      if ( !month || month < 1){
        return res.status(400).json({message:"invalid months"});
       }
  
    const amount = Number(month) * 700;
  
    const option ={
      amount: amount * 100,
      currency :"INR",
      receipt : `recipt ${Date.now()}`
    };
  
    const order = await razorpay.orders.create(option);
    res.status(200).json({
      success:true ,
      order });
  }catch(err){
    console.log(err);
    res.status(500).json({ message:"order creation failed" ,
      success:false
    });
  }
});

app.post("/order-verify", auth, async (req,res)=>{
  
  try{

        const  {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            month,
            id
        } = req.body;
        
        const body = 
             razorpay_order_id +"|"+razorpay_payment_id;
        
        const expectsign = crypto.
              createHmac(
                "sha256",
                process.env.RAZORPAY_KEY_SECRET
              )
              .update(body.toString())
              .digest("hex");
        
        if(expectsign!==razorpay_signature){
            return res.status(400).json({message:"payment faild !"});
        }

        
        const employee = getEmployeeModel(req.db);
        const Payment = getPaymentModel(req.db);
        
        const clint =  await employee.findById(id);
        
        if(!clint){
          return res.status(400).json({message:"clint not found"});
        }
        console.log(clint.expiredate);
        const currentdate = new Date(clint.expiredate);

        currentdate.setMonth(
          currentdate.getMonth()+ Number(month)
        );

        clint.expiredate=currentdate;

        // clint.expiredate.setMonth(clint.expiredate.getMonth()+ Number(month));
        // console.log(clint.expiredate);
        await clint.save();
         const payment= new Payment({
          amount:(month*700),
          entrydate:new Date(),
          userId:id,

        })
        await payment.save();

         return   res.json({message:"payment successfull"});

    } catch(err){
      console.log(err);
      return res.json({message :"something went wrong"});
  }
      
});


// UPDATE
// app.put("/clint/:id", auth, async (req, res) => {
//   try {
//     const updateusr = await Employee.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       { new: true }
//     );

//     if (!updateusr) {
//       return res.status(404).json({ message: "user not found" });
//     }

//     res.json(updateusr);

//   } catch (err) {
//     res.status(500).json({ message: "error in update" });
//   }
// });


// DELETE
app.delete("/delete/:id", auth, check("superadmin","admin"), async (req, res) => {
  try {
    const Employee = getEmployeeModel(req.db);
    const Payment = getPaymentModel(req.db);

    const userId = req.params.id;

    // 🔥 mark all payments of this user as deleted
    await Payment.updateMany(
      { userId: userId },
      { $set: { isDeleted: true } }
    );

    // 🔥 delete user
    const deletedUser = await Employee.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

// SEARCH
app.post("/search", auth, async (req, res) => {
  try {
    let { search = "" } = req.body;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const query = {
      name: { $regex: search, $options: "i" }
    };

    const Employee =getEmployeeModel(req.db);

    const total = await Employee.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const users = await Employee.find(query)
      .sort({createdAt:- 1})  
      .skip((page - 1) * limit)
      .limit(limit);

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ users, totalPages });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
                 // user search

app.post("/usrsearch", auth, async (req, res) => {
  try {
    let { search = "" } = req.body;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const escapeRegex = (text) => {
      return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    const safeSearch = escapeRegex(search.trim());

    const query = search.trim()
      ? {
          $or: [
            { email: { $regex: safeSearch, $options: "i" } }
          ]
        }
      : {};

    const Users = getUserModel(req.db);

    const total = await Users.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const users = await Users.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      users,
      totalPages,
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

   if (req.user._id.toString() === id) {
  return res.status(400).json({ message: "You cannot change your own role" });
}
  const Users = getUserModel(req.db);
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



app.get("/me", auth, (req, res) => {
  // console.log("USER:", req.user);
  res.json({ user: req.user });
});

app.put("/extendfee/:id", auth,check("admin","superadmin"), async (req, res) => {
  try {
    const { month } = req.body;
    const id = req.params.id;

    if (!month || month < 1) {
      return res.status(400).json({ message: "Invalid month" });
    }

    const Employee = getEmployeeModel(req.db);
    const clint = await Employee.findById(id);

    if (!clint) {
      return res.status(404).json({ message: "Client not found" });
    }

    
    let baseDate = new Date(clint.expiredate);

    // fallback (agar kabhi null ho)
    if (!clint.expiredate) {
      baseDate = new Date();
    }

    
    baseDate.setMonth(baseDate.getMonth() + Number(month));

    clint.expiredate = baseDate;

    await clint.save();
    const Payment = getPaymentModel(req.db);
    const payment = new Payment({
      amount:(month*700),
      entrydate: new Date(),
      userId: new mongoose.Types.ObjectId(id),
    });
    

        const data = await payment.save();
       
      //  console.log(data);
      //  console.log("payment succes");
    



    return res.json({
      message: "Membership extended successfully",
      expiredate: clint.expiredate
    });

  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server error" });
  }
});

//Revenue

app.get("/revenue", auth, check("superadmin"), async (req, res) => {
  try {
    const now = new Date();

    const start = new Date();
    start.setDate(1);
    start.setHours(0,0,0,0);
    console.log("START:", start);

    const Payment = getPaymentModel(req.db);

    const data = await Payment.aggregate([
      {
        $match: {
          entrydate: { $gte: start, $lte: now },
          $or: [
            { isDeleted: false },
            { isDeleted: { $exists: false } }
          ]
        }
      },
      {
        $lookup: {
          from: "employees", 
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $unwind: "$user"
      },
      {
        $project: {
          name: "$user.name",
          entrydate: 1,
          amount: 1
        }
      }
    ]);


    const total = data.reduce((sum, item) => sum + item.amount, 0);
 res.json({data ,total});
   

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "error" });
  }
});


// ================= DB + SERVER START =================

const startServer = async () => {
  try {
    app.listen(PORT, () => {
      console.log("server is start");
    });
  } catch (err) {
    console.log("Server error:", err);
  }
};

startServer();