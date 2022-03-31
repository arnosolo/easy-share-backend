import express from 'express'
import formidable from "express-formidable"
import cors from "cors"
import fs from 'fs'
import mongoose from "mongoose"
import { fileRouter } from './routes/fileRouter'
import { userRouter } from './routes/userRouter'
import { SECRET, DB_URL, FILE_LIST_PATH, MERGED_FILE_DIR, CHUNK_DIR } from './config'
import path from 'path'
import { auth } from './middlewares/auth'

const app = express()
const port = 3000

// 1.Connect DB
// const mongoUrl = `mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_IP}:${MONGO_PORT}/?authSource=admin`
// const connectWithRetry = () => {
//   mongoose
//     .connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
//     .then(() => console.log("succesfully connected to DB"))
//     .catch(err => {
//       console.log(err);
//       setTimeout(connectWithRetry, 5000);
//     });
// }
// connectWithRetry();

// 2.Route
if (!fs.existsSync(CHUNK_DIR)) { fs.mkdirSync(CHUNK_DIR, { recursive: true }) }
if (!fs.existsSync(MERGED_FILE_DIR)) { fs.mkdirSync(MERGED_FILE_DIR, { recursive: true }) }
if (!fs.existsSync(FILE_LIST_PATH)) { fs.writeFileSync(FILE_LIST_PATH, '[]', { encoding: 'utf-8' }) }

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({ extended: false }))
app.use(formidable())
app.use(express.json())

app.use("/api/v1/user", userRouter)
app.use("/api/v1/file", fileRouter)
app.post("/api/v1/check_auth", auth, (req, res) => {
  res.status(200).json({
    success: true,
    msg: "authorize success"
  })
})
app.get('*', (req, res) => {
  res.redirect('/index.html#/404')
})

// 3.Listen
app.listen(port, () => console.log(`Example app listening on port ${port}!`))