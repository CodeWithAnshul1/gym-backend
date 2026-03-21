const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
    name: String,
    email: String,
    // age: Number,
    // position: String
});

const Employee = mongoose.model("Employee", employeeSchema);

module.exports = Employee;