const adminModel = require("../modles/admin");
const jwt=require('jsonwebtoken');
const usermodel = require("../modles/user");
const filemodel = require("../modles/enrichedFile");
const { default: mongoose } = require("mongoose");
const nodemailer=require('nodemailer');
const fs = require("fs");




module.exports.adminLogin = async (req, res) => {
    let { ...data } = req.body;
    
    try {
        if (!data.email || !data.password) {
            return res.status(400).json({ error: "Email and password are required" });
        }
  
        let adminFound = await adminModel.findOne({ email: data.email });
        if (!adminFound) {
            return res.status(400).json({ error: "Admin not found" });
        }
  
        if (adminFound.password !== data.password) {
            return res.status(400).json({ error: "Invalid password" });
        }
  
        adminFound = adminFound.toObject();
        const { password, ...adminWithoutPassword } = adminFound;
  
        let token = await jwt.sign(adminWithoutPassword, process.env.JWT_KEY, { expiresIn: '7d' });
  
        console.log(`Admin login successful for: ${data.email} at ${new Date().toISOString()}`);
  
        return res.status(200).json({ admin: adminWithoutPassword, token });
  
    } catch (e) {
        console.log(e.message);
        return res.status(400).json({ error: "Error occurred while trying to login" });
    }
  };
  
  
  module.exports.adminRegister = async (req, res) => {
    let { ...data } = req.body;
    
    try {
        if (!data.email || !data.password) {
            return res.status(400).json({ error: "Email and password are required" });
        }
  
        let alreadyExists = await adminModel.findOne({ email: data.email });
        if (alreadyExists) {
            return res.status(400).json({ error: "Admin already exists" });
        }
  
        let admin = await adminModel.create(data);
        admin = admin.toObject();
  
        const { password, ...adminWithoutPassword } = admin;
        let token = await jwt.sign(adminWithoutPassword, process.env.JWT_KEY, { expiresIn: '7d' });
  
        return res.status(200).json({ admin: adminWithoutPassword, token });
  
    } catch (e) {
        console.log(e.message);
        return res.status(400).json({ error: "Error occurred while trying to register" });
    }
  };
  
  module.exports.resetPassword = async (req, res) => {
    let { email, password } = req.body;
    
    try {
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }
  
        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters" });
        }
  
        let adminFound = await adminModel.findOne({ email });
        if (!adminFound) {
            return res.status(400).json({ error: "Admin not found" });
        }
  
        await adminModel.updateOne({ email }, { $set: { password } });
  
        return res.status(200).json({ message: "Password reset successfully" });
  
    } catch (e) {
        console.log(e.message);
        return res.status(500).json({ error: "Error occurred while trying to reset password", details: e.message });
    }
  };




  module.exports.getUsers = async (req, res) => {
    try {
        let users = await usermodel.find({})
        return res.status(200).json({ users })
    } catch (e) {
        console.log(e.message)
        return res.status(400).json({ error: "Error occured while trying to fetch users" })
    }
}

module.exports.updateUser = async (req, res) => {
    const { ...data } = req.body;
    const { id } = req.params;

    try {
        const found = await usermodel.findOne({ $expr: { $eq: [{ $toString: "$_id" }, id] } });
        console.log("FOUND:", found);

        let updated = await usermodel.updateOne(
            { $expr: { $eq: [{ $toString: "$_id" }, id] } },
            { $set: data }
        )

        return res.status(200).json({ message: "User updated sucessfully" })
    } catch (e) {
        console.log(e.message)
        return res.status(400).json({ error: "Error occured while trying to update user" })
    }
}

module.exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        await usermodel.findByIdAndDelete(id)
        return res.status(200).json({ message: "User deleted sucessfully" })
    } catch (e) {
        console.log(e.message)
        return res.status(400).json({ error: "Error occured while trying to delete user" })
    }
}



module.exports.getFiles = async (req, res) => {
    try {
      const files = await filemodel.find({}).populate('user');
  
      
  
      return res.status(200).json({ files});
    } catch (e) {
      console.log(e.message);
      return res.status(400).json({ error: "Error occurred while trying to fetch files" });
    }
};




module.exports.updateFile = async (req, res) => {
    let {id}=req.params
    let {...data}=req.body;
    try {
     await filemodel.findByIdAndUpdate(id,{
        $set:data
     })
      
  
      return res.status(200).json({ message:"File updated sucessfully"});
    } catch (e) {
      console.log(e.message);
      return res.status(400).json({ error: "Error occurred while trying to fetch files" });
    }
};


