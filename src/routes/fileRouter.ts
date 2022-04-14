import express from "express"
import { auth } from "../middlewares/auth";
import { checkExist, saveChunk, getFileList, mergeChunks, getFile, deleteFile, renameFile } from "../controllers/fileController";

const fileRouter = express.Router();
fileRouter.route("/:md5WithExten")
  .get(getFile)
  .delete(auth, deleteFile)

fileRouter.route("/upload")
  .post(auth, saveChunk)

fileRouter.route("/merge")
  .post(auth, mergeChunks)

fileRouter.route("/list-all")
  .post(auth, getFileList)

fileRouter.route("/exist")
  .post(auth, checkExist)

fileRouter.route("/rename")
  .post(auth, renameFile)

export { fileRouter }