require("dotenv").config();
const express = require("express");
const cors= require("cors");
const jwt = require("jsonwebtoken");
const bcrypt =require("bcrypt");
const auth =require("./Middelware");
const mongoose = require("mongoose");
const Employee = require("./models/Employee");
const Users = require("./models/Users");
const SECRET = process.env.SECRET;
const MONGO_URI =process.env.MONGO_URI
const PORT = process.env.PORT || 5000;
const app = express();

mongoose.connect(MONGO_URI)
.then(() => console.log("connect mongodb"))
.catch( er => console.log(er));

app.use(cors({
  origin : "http://stalwart-axolotl-862987.netlify.app",
  methods :["GET" , "POST" , "PUT", "DELETE"],
}));
app.use(express.json());



app.post("/login", async (req, res) => {

  try {
    const {email , password} = req.body;

    const user = await Users.findOne({ email });

    if (!user) {
        console.log("user not found ");
      return res.json({ message: "user not found" });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
        console.log("enter a valid password");
      return res.json({ message: "enter valid username or password" });
    }

    const token = jwt.sign({ email }, SECRET, { expiresIn: "2d" });

    res.json({ token });

  } catch (err) {

    res.status(500).json({ message: "internal server error" });

  }

});

app.post("/create",async(req ,res) =>{
    // console.log(req.body);
    const { email , pass} =req.body;

    const check = await  Users.findOne({email});

    if(check) {
        console.log("user already exist");
       return  res.json({message : "User Allready exist"});
    }

    const hashedpass = await bcrypt.hash(pass ,10);

    const user = new Users({
        email ,
        password: hashedpass,
    })
 
    
        
    await user.save();

    res.json({message : "  New User Create successfully"});

})

// app.use("/login",(req,res,next) =>{
//     const email = req.body.email;
//     const pass = req.body.pass;
//     const token = jwt.sign({email}, SECRET , {expressIn : "1h"});
//     res.json(token);
//     next();
// } )

app.get("/users" ,auth ,async(req ,res) => {
    // res.send("server is working fine ");
    const page = parseInt(req.query.page ||1);
    const limit = parseInt(req.query.limit ||5) ;
    const total = await Employee.countDocuments();
    const totalPages = Math.ceil(total / limit);

    const users = await Employee.find()
    .skip((page-1)*limit)
    .limit(limit);

    res.json({
        totalPages,
        users,
    });



    // const  data =await Employee.find({});
    // res.json(data);

});


app.post("/" , auth , async(req , res) => {
    // console.log(req.body);
    // res.send(req.body);
    // users.push(req.body);
    const emp = new Employee (req.body);
    await emp.save();
    res.json({message : "user add successfully"});
    // res.send("User add succesfully");
});

app.put("/user/:id", auth ,async(req ,res) => {
  
    try{
        const updateusr = await Employee.findByIdAndUpdate(
            req.params.id,
            req.body,
             {new :true}
        );
        if(!updateusr){
            return res.status(404).json({message : "useer not found"});
        
        }
        res.json(updateusr);

    }catch(err){
        res.status(500).json({message :"error in user updare"});
    }


});

app.delete("/delete/:id" , auth ,async(req ,res) => {
    try{
        const id= req.params.id;
        

        const Deleteusr = await Employee.findByIdAndDelete(id);
        if(!Deleteusr){
            return res.json({message : "user not found"})
        }
        res.json({message :"user  delete successfully "})

    }
    catch(err){
        res.status(501).json("server error");

    }

});

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

    res.json({
      users,
      totalPages
    });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.listen(PORT , () => {
    console.log("server is start");
})