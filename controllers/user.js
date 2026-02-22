
const userModel=require('../modles/user')
const jwt=require('jsonwebtoken')


module.exports.userLogin = async (req, res) => {
    let { ...data } = req.body;
    
    try {
    
        if (!data.email || !data.password) {
            return res.status(400).json({
                error: "Email and password are required"
            });
        }

       
        let userFound = await userModel.findOne({ email: data.email });
        if (!userFound) {
            return res.status(400).json({
                error: "User not found"
            });
        }

        if (userFound.password !== data.password) {
            return res.status(400).json({
                error: "Invalid password"
            });
        }

        userFound = userFound.toObject();
        const { password, ...userWithoutPassword } = userFound;

       
        let token = await jwt.sign(userWithoutPassword, process.env.JWT_KEY, {
            expiresIn: '7d'
        });

        return res.status(200).json({
            user: userWithoutPassword,
            token
        });

    } catch (e) {
        console.log(e.message);
        return res.status(400).json({
            error: "Error occurred while trying to login"
        });
    }
};

module.exports.userRegister = async (req, res) => {
    let { ...data } = req.body;
    
    try {
       
        if (!data.email || !data.password) {
            return res.status(400).json({
                error: "Email and password are required"
            });
        }
console.log(userModel)
        let alreadyExists = await userModel.findOne({ email: data.email });
        if (alreadyExists) {
            return res.status(400).json({
                error: "User already exists"
            });
        }

      
        let user = await userModel.create(data);
        user = user.toObject();

        
        const { password, ...userWithoutPassword } = user;
        let token = await jwt.sign(userWithoutPassword, process.env.JWT_KEY, {
            expiresIn: '7d'
        });

       
        return res.status(200).json({
            user: userWithoutPassword,
            token
        });

    } catch (e) {
        console.log(e.message);
        return res.status(400).json({
            error: "Error occurred while trying to register"
        });
    }
};



module.exports.resetPassword = async (req, res) => {
    let { email, password } = req.body;
    
    try {
      
        if (!email || !password) {
            return res.status(400).json({
                error: "Email and password are required"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: "Password must be at least 6 characters"
            });
        }

        
        let userFound = await userModel.findOne({ email });
        if (!userFound) {
            return res.status(400).json({
                error: "User not found"
            });
        }

       
        await userModel.updateOne(
            { email }, 
            {
                $set: {
                    password: password 
                }
            }
        );

        return res.status(200).json({
            message: "Password reset successfully"
        });

    } catch (e) {
        console.log(e.message);
        return res.status(500).json({
            error: "Error occurred while trying to reset password",
            details: e.message
        });
    }
};


