import express from "express"
import { login, signUp } from "../controllers/userController";

const userRouter = express.Router();

userRouter.route("/signup")
  .post(signUp)

userRouter.route("/login")
  .post(login)

export { userRouter }