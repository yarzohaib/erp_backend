const express = require('express');
const cors = require('cors');
const helmet =require('helmet');
const cookieParser = require('cookie-parser');
const authRoutes = require("./routes/auth.routes");

const app=express();

app.use(helmet());
app.use(cors({
    origin:true,
    credentials:true
}));

app.use(express.json({limit:"10kb"}));
app.use(express.urlencoded({extended:true, limit:"10kb"}));
app.use(cookieParser());

app.use("/api/v1/auth", authRoutes);

app.get("/health",(req,res)=>{
        res.status(200).json({
            success:true,
            message:"ERP Backend is running",
        });
    });

    module.exports=app;


