const express=require('express')
const app=express();
const cors=require('cors')
const userRoutes=require('./routes/user')
const connect=require('./connection')
const uploadRoutes=require('./routes/upload')
require('dotenv').config();

app.use(cors())
app.use(express.json())


connect

app.use(userRoutes)
app.use(uploadRoutes)

app.listen(process.env.PORT)

