const express=require('express');
const router=express.Router();
require('../db/conn');
const {SignupUser,RegisterUser,LoginUser}= require("../models/userSchema");
const cron =require('node-cron');
const Token=require("../models/token");
const sendEmail=require("../utils/sendEmail");
const crypto=require("crypto");
// Promises...
// router.post('/register',(req,res)=>{
//     const {email,password,rpassword,phone,fname,lname }=req.body;
//     if(!email||!password|| !rpassword|| !phone|| !fname|| !lname){
//         return res.status(422).json({error:"please add all fields"});
//     }
//     User.findOne({email:email}).then((userExist)=>{
//             if(userExist){
//                 return res.status(422).json({error:"Email already exist"});
//             }
//             const user =new User({email,password,rpassword,phone,fname,lname });
//             user.save().then(()=>{
//                 res.status(201).json({message:"user registered sucsessfully"});
//             }).catch((err)=>res.status(500).json({error:"Failed register"}));
//             }).catch(err=>{console.log(err)});
   
// });
// //Asynchronus....& Await
const isValidPhoneNumber = (phoneNumber) => {
  return phoneNumber.length === 10;
};
// labour registration
router.post('/register',async(req,res)=>{
    const {email,password,cpassword,phone,fname,lname,service,gender,country,state,city}=req.body;
    if(!email ){
        return res.status(422).json({error:"please add all fields"});
    }
    if(password!=cpassword){
      return res.status(422).json({error:"password does not matches confirm password"});
      window.alert('password does not matches confirm password');
    }
    if (!isValidPhoneNumber(phone)) {
      return res.status(422).json({error:"Invalid phone number. It should be 10 digits"});
      window.alert("Invalid phone number. It should be 10 digits.");
    }
    try{
        let userExist=await RegisterUser.findOne({email:email});
        if(userExist){
            return res.status(422).send({error:"Email already exist"});
        }
         userExist =new RegisterUser({email,password,cpassword,phone,fname,lname,service,gender,country,state,city });
        await userExist.save();
        const token=await new Token({
          userId:userExist._id,
          token:crypto.randomBytes(32).toString("hex")
        }).save();
        const url=`${process.env.BASE_URL}users/${userExist._id}/verify/${token.token}`;
        await sendEmail(userExist.email,"verification mail",url);
        res.status(201).send({message:"user registered sucsessfully email sent to your account plaese verify"});
    } catch(err){
        res.status(422).send({message:"Unsuccesful registration"});
    } 
    
});
// search labour 
router.get('/getdata',async(req,res)=>{
    try{
 const myData= await RegisterUser.find({});
 res.send({status:"ok",data:myData});
    } catch(error){
        console.log(error);
    }
 
});
// upadte isbooked to true
router.put('/api/update/:id',async(req,res)=>{
    try{
        const {id}=req.params;
        const {isbooked}=req.body;
        const updatedData=await RegisterUser.findByIdAndUpdate(id,{isbooked},{new:true});
        if (!updatedData) {
            return res.status(404).json({ error: 'Data not found' });
          }
          res.json(updatedData);
          //  res.json({ message: 'Booking Successful' });
        } catch (error) {
          console.error(error);
          res.status(500).send('Internal Server Error');
    }
});
// verification link from gmail 
router.get('/users/:id/verify/:token',async(req,res)=>{
  try{
    const user=await RegisterUser.findOne({_id:req.params.id});
    if(!user)return res.status(400).send({
      message:"invalid link"
    });
    const token=await Token.findOne({
      userId:user._id,
      token:req.params.token,
    });
    if(!token)return res.status(400).send({message:"invalid link"});
    await RegisterUser.updateOne({_id: user._id}, { $set: { verified: true } });
    await token.deleteOne();
    console.log("verified");
    res.status(200).send({message:"Email verified Successfully"})
  }catch(err){
    console.log(err);
    res.status(500).send({message:"Internal server eror"});
  }
});
//user signup
router.post('/signup', async (req, res) => {
  const { name, email,password } = req.body; 
  if (!name || !email ||  !password)  {
      return res.status(422).json({ error: "please filled the field properly" });
  }
  try {
      const userExist = await SignupUser.findOne({ email: email });
      if (userExist) {
          return res.status(422).json({ error: "Email already Exist" });

      }
      const user = new SignupUser({ name, email, password});  
      const userRegister = await user.save();
      if (userRegister) {
          res.status(201).json({ message: "user register successfully" });
      }
      else {
          res.status(500).json({ error: "Failed to register" });
      }
  }
  catch (err) {
      console.log(err);
  }

  
});
// user login
router.post('/signin', async(req, res) => {
  try {
      const { email, password } = req.body;
      if (!email || !password) {
          return res.status(400).json({ error: "plz fill the data" });
      }

      const userLogin = await SignupUser.findOne({ email: email });
      // console.log(userLogin);
      // console.log(userLogin.name);
      if (!userLogin) {
          res.status(402).json({ error: "plz fill the data" });
          
      }
      else {
      const { _id, name, email } = userLogin;
      res.json({
        message: "User Signin Successfully",
        user: { _id, name, email }
      });
      }
  }
  catch (err) {  
      console.log(err);
  }
});
// task scheduler
// 0 0 * * *
cron.schedule('0 0 * * *', () => {
    console.log('Updating isbooked field...');
    updateIsBookedField();
  });
  async function updateIsBookedField() {
    try {
      const filter = { isbooked: true }; 
      const updateOperation = {
        $set: {
          isbooked: false,
        },
      };
      const result = await RegisterUser.updateMany(filter, updateOperation);
    } catch(err){
        console.log(err);
    }
  };
module.exports=router;
