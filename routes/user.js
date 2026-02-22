const router=require('express').Router();
const {userRegister,userLogin,resetPassword}=require('../controllers/user');
const { middleware } = require('../util/middleware');

router.post('/register',userRegister)
router.post('/login',userLogin)
router.post('/userresetPassword',resetPassword)

module.exports=router;