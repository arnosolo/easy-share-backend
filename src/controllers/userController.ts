import express from 'express'
import bcrypt from "bcryptjs"
import jwt from "jwt-simple"
import { User } from '../models/userModel'
import { SECRET } from '../config'

const signUp: express.RequestHandler = async (req, res, next) => {
  const { username, password } = req.fields!
  try {
    // const hashpassword = await bcrypt.hash(password, 12);
    // const newUser = await User.create({
    //   username,
    //   password: hashpassword,
    // })
    
    const newUser = {
      _id: 123,
      username: "hello"
    }

    if(newUser) {
      console.log(`User ${newUser._id} sign up success`);
      
      res.status(200).json({
        success: true,
        msg: "Sign up success",
        data: {
          user: {
            id:newUser._id,
            username:newUser.username
          },
        },
      });
    }

  } catch (error) {
    res.status(400).json({
      success: false,
      msg: "sign up failed"
    });
  }
}

const login: express.RequestHandler = async (req, res, next) => {
  const { username, password } = req.fields!
  try {
    // const foundUser = await User.findOne({ username });

    // if (!foundUser) {
    //   return res.status(404).json({
    //     success: false,
    //     msg: "user not found"
    //   });
    // }

    // const passwordIsCorrect = await bcrypt.compare(password, foundUser.password);

    // if (!passwordIsCorrect) {
    //   res.status(404).json({
    //     success: false,
    //     msg: "incorrect username or password"
    //   });
    // } else {
    if(username === "3eb3bedd9ff3b2a79296fbcd06d9b8bd" && password === "d90d120c5883d3922cd2f0c117b38478"){
      const foundUser = {
        _id:3344, username
      }
      const token = jwt.encode({
        id:foundUser._id,
        username:foundUser.username,
        exp: Date.now() + 1000 * 10
      }, SECRET)
      res.status(200).json({
        success: true,
        data: {
          user: { id:foundUser._id, username:foundUser.username},
          token
        },
      });
    } else {
      res.status(404).json({
        success: false,
        msg: "incorrect username or password"
      });
    }

  } catch (error) {
    console.log(error);
    res.status(400).json({
      success: false,
      msg: error,
    });
  }
}

export { signUp, login }
