import express from 'express'
import jwt from "jwt-simple"
import { SECRET } from '../config'

const auth: express.RequestHandler = (req, res, next) => {
  const authorization = req.headers["authorization"]
  if(!authorization) {
    console.log(`${req.url} Auth fail ${req.ip}`);
    res.status(401).json({
      success: false,
      msg: "unauthorized",
      unauthorized: true,
    })
  } else {
    const token = authorization.split(' ')[1]
    try {
      jwt.decode(token, SECRET)
      console.log(`${req.url} Auth success ${req.ip}`);
      next()
    } catch (error) {
      res.status(401).json({
        success: false,
        msg: "unauthorized",
        unauthorized: true,
      })
    }
  }
}

export { auth }