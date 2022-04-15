import express from 'express'
import path from 'path'
import fs from 'fs'
import fsp from 'fs/promises'
import SparkMD5 from 'spark-md5'
import imageThumbnail from 'image-thumbnail'
import crypto from 'crypto'
import { CHUNK_DIR, FILE_LIST_PATH, MERGED_FILE_DIR, need_thumbnail_threshold } from '../config'

class FileInfo {
  md5: string
  filename: string
  md5WithExten: string
  exten: string
  createTime: number
  lastModified: number
  type: string
  size: number
  hasThumbnail: boolean
  thumbnail: string
  constructor({md5="", filename="", md5WithExten="", type="", size=0, lastModified=0, createTime=Date.now(), hasThumbnail=false, thumbnail=""}) {
    this.md5 = md5
    this.filename = filename
    this.md5WithExten = md5WithExten
    this.size = size
    this.type = type
    this.exten = md5WithExten.split('.').pop() ?? "unknow"
    this.createTime = createTime
    this.lastModified = lastModified
    this.hasThumbnail = hasThumbnail
    this.thumbnail = thumbnail
  }
}

const saveChunk: express.RequestHandler = (req, res, next) => {
  // console.log("saveChunk");
  
  const { filename, chunkId, md5, md5WithExten } = req.fields!

  // 1.检查文件是否已存在且完整(挪到了/api/checkfile)

  // 2.保证切片保存路径存在
  const chunksDir = path.join(CHUNK_DIR, `${md5WithExten}`)
  const chunkPath = path.join(chunksDir, `${chunkId}`)
  const { chunkData } = req.files!
  if (!fs.existsSync(chunksDir)) fs.mkdirSync(chunksDir, { recursive: true })

  // 3.检查文件切片是否已存在且完整(断点续传需要)

  // 4.保存文件
  // @ts-ignore
  fsp.rename(chunkData.path, chunkPath) // @ts-ignore 下一行不检查
    .then(() => {
      const msg = `已保存 ${chunkId}`
      console.log(msg);
      res.json({ success: true, msg })
    })
    .catch(err => {
      const msg = `保存失败${chunkId},请重新上传 `
      console.error(err);
      res.json({ success: false, msg })
    })
}

const renameFile: express.RequestHandler = async (req, res, next) => {
  const { newName, md5 } = req.fields!
  try {
    const fileInfoList:Array<FileInfo> = JSON.parse(await fsp.readFile(FILE_LIST_PATH, { encoding: 'utf-8' }))
    let info = fileInfoList.find(info => info.md5 == md5)
    if(info) info.filename = `${newName}`
    await fsp.writeFile(FILE_LIST_PATH, JSON.stringify(fileInfoList), { encoding: 'utf-8' })
    res.json({ success: true })
  } catch (error) {
    res.json({ success: false})
    throw error
  }
}

const mergeChunks: express.RequestHandler = async (req, res, next) => {
  const { filename, md5, md5WithExten, size, type, lastModified } = req.fields!
  const fileInfo = new FileInfo({
    filename: `${filename}`,
    md5: `${md5}`,
    md5WithExten: `${md5WithExten}`,
    size: Number(size),
    type: `${type}`,
    lastModified: Number(lastModified),
  })
  
  const chunkSize: number = parseInt(`${req.fields!.chunkSize}`)

  // 1.获取切片列表
  const chunksDir = path.join(CHUNK_DIR, `${md5WithExten}`)
  const chunks = fs.readdirSync(chunksDir).map(chunkName => {
    return {
      name: chunkName,
      path: path.join(chunksDir, chunkName),
      index: parseInt(chunkName.split('-')[0])
    }
  })

  // 2.合成文件
  const targetPath = path.join(MERGED_FILE_DIR, `${md5WithExten}`)
  // 2.1保证保存路径存在
  if (!fs.existsSync(MERGED_FILE_DIR)) fs.mkdirSync(MERGED_FILE_DIR, { recursive: true })
  // 2.2创建空的目标文件防止创建写入流时说没有这个文件
  fs.closeSync(fs.openSync(targetPath, 'w'));

  let successCount = 0
  const mergePromises = chunks.map(async (chunk) => {
    try {
      // 2.3创建读写流以复制
      console.log(`开始写入 ${chunk.name} -> ${md5WithExten}`);
      // const writeStream = fs.createWriteStream(targetPath, { start: chunk.index * chunkSize, end: (chunk.index + 1) * chunkSize })
      const writeStream = fs.createWriteStream(targetPath, { start: chunk.index * chunkSize })
      const readStream = fs.createReadStream(chunk.path)
      readStream.pipe(writeStream)
      // const coping = () => new Promise(resolve => writeStream.on("finish", resolve), reject => writeStream.on("error", reject))
      const coping = () => new Promise((resolve, reject) => {
        writeStream.on("finish", resolve)
        writeStream.on("error", reject)
      })
      // 2.4等待写入完成
      await coping()
      successCount++
      console.log(`成功写入 ${chunk.name} -> ${md5WithExten}`);
    } catch (error) {
      console.log(`写入失败 ${chunk.name} -> ${md5WithExten}`);
      throw error
    }

    // 2.5删除切片文件
    try {
      await fsp.unlink(chunk.path)
    } catch (error) {
      throw error
    }
  })

  // 2.6等待全部切片写入完成
  await Promise.all(mergePromises)
  // fs.rmdir(chunksDir) // 用于故障测试

  // 2.7确认所有的写入动作都是成功的
  if (successCount === chunks.length) {
    try {
      // 2.8校验合并文件完整性
      console.log(`正在校验文件完整性 ${md5WithExten}`);
      const buf = await fsp.readFile(targetPath)
      const spark = new SparkMD5.ArrayBuffer()
      spark.append(buf)
      const mergedFileMD5 = spark.end()
      if (mergedFileMD5 !== md5) {
        const msg = `合成完成, 但是发现文件不完整, 需要客户端重新发送 ${md5WithExten}`
        console.log(msg)
        res.json({ success: false, msg })
      } else {
        // 对大尺寸图片生成缩略图
        if(fileInfo.type == "image/jpeg" || fileInfo.type == "image/png") {
          if(buf.length > need_thumbnail_threshold) {
            try {
              let percentage = 90
              let thumbnail = await imageThumbnail(buf, { responseType: 'buffer', percentage });
              while(thumbnail.length > need_thumbnail_threshold) {
                percentage *= 0.5
                thumbnail = await imageThumbnail(buf, { responseType: 'buffer', percentage });
              }
              const hash = crypto.createHash('md5')
              hash.update(thumbnail)
              const thumbnailMd5 = hash.digest('hex')
              await fsp.writeFile(path.join(MERGED_FILE_DIR, `${thumbnailMd5}.${fileInfo.exten}`), thumbnail)
              fileInfo.hasThumbnail = true
              fileInfo.thumbnail = `${thumbnailMd5}.${fileInfo.exten}`
            } catch (error) {
              console.error(error)
            }
          }
        }

        // 2.9记录文件原名-保存用名(md5WithExten)映射关系
        console.log(`合成的文件md5与原文件一致,正在创建映射关系 ${md5WithExten} -- ${filename}`);
        
        if (!fs.existsSync(FILE_LIST_PATH)) { await fsp.writeFile(FILE_LIST_PATH, '[]', { encoding: 'utf-8' }) }
        const fileInfos: Array<FileInfo> = JSON.parse(await fsp.readFile(FILE_LIST_PATH, { encoding: 'utf-8' }))
        fileInfos.push(fileInfo)
        await fsp.writeFile(FILE_LIST_PATH, JSON.stringify(fileInfos), { encoding: 'utf-8' })

        await fsp.rmdir(chunksDir)

        const msg = `切片合并成功 ${md5WithExten}`

        console.log(msg);
        res.json({ success: true, msg })
      }
    } catch (error) {
      throw error
    }
  } else {
    res.json({ success: false, msg: `部分切片合成时出错 ${md5WithExten}` })
  }
}

const deleteFile: express.RequestHandler = async (req, res, next) => {
  try {
    const { md5WithExten } = req.params

    // 删除文件
    const filePath = path.join(MERGED_FILE_DIR, md5WithExten)
    if (fs.existsSync(filePath)) await fsp.unlink(filePath)

    // 删除映射表中的记录
    if (!fs.existsSync(FILE_LIST_PATH)) { await fsp.writeFile(FILE_LIST_PATH, '[]', { encoding: 'utf-8' }) }
    let fileInfos: Array<{ md5: string, filename: string, md5WithExten: string }> = JSON.parse(await fsp.readFile(FILE_LIST_PATH, { encoding: 'utf-8' }))
    fileInfos = fileInfos.filter(it => it.md5WithExten !== md5WithExten)
    await fsp.writeFile(FILE_LIST_PATH, JSON.stringify(fileInfos), { encoding: 'utf-8' })

    const msg = `成功删除 ${md5WithExten}`
    console.log(msg);
    res.json({ success: true, msg })
  } catch (error) {
    // const msg = `删除失败 ${md5WithExten}`
    const msg = `删除失败`
    console.log(msg);
    res.json({ success: false, msg })
    throw error
  }
}

const getFile: express.RequestHandler = (req, res, next) => {
  const { md5WithExten } = req.params
  const filePath = path.join(MERGED_FILE_DIR, md5WithExten)
  if (!fs.existsSync(filePath)) {
    res.status(404).redirect("/index.html#/404")
  } else {
    res.sendFile(filePath)
  }
}

const checkExist: express.RequestHandler = async (req, res, next) => {
  const { md5WithExten, md5, filename, size, type, lastModified } = req.fields!
  const filePath = path.join(MERGED_FILE_DIR, `${md5WithExten}`)
  // 1.检查合并文件是否存在
  console.log(`开始检查${md5WithExten}是否已存在且完整`);
  if (!fs.existsSync(filePath)) {
    const msg = `文件${md5WithExten}不存在, 请开始上传切片`
    console.log(msg);
    res.json({ success: true, msg, existAndComplete: false })
  } else {
    try {
      // 2.检查合并文件的md5,保证其与即将传入的文件是一致的,不然这个文件要是不完整的话都没办法重新上传
      const buf = await fsp.readFile(filePath)
      const spark = new SparkMD5.ArrayBuffer()
      spark.append(buf)
      const mergedFileMD5 = spark.end()
      if (mergedFileMD5 === md5) {
        const msg = `存在文件${md5WithExten},其md5为${mergedFileMD5},与请求文件md5一致, 无需再次上传`
        console.log(msg);

        // Rename filename in file info list
        let fileInfos: Array<FileInfo> = JSON.parse(await fsp.readFile(FILE_LIST_PATH, { encoding: 'utf-8' }))
        const info = fileInfos.find(info => info.md5 == md5)
        if(info) {
          info.filename = `${filename}`
          info.lastModified = Date.now()
        } else {
          const newInfo = new FileInfo({
            filename: `${filename}`,
            md5: `${md5}`,
            md5WithExten: `${md5WithExten}`,
            size: Number(size),
            type: `${type}`,
            lastModified: Number(lastModified),
          })
          console.log(newInfo)
          fileInfos.push(newInfo)
        }
        await fsp.writeFile(FILE_LIST_PATH, JSON.stringify(fileInfos), { encoding: 'utf-8' })

        return res.json({ success: true, msg, existAndComplete: true })
      } else {
        const msg = `存在文件${md5WithExten},但其md5为${mergedFileMD5},与请求文件md5不一致, 本地文档不完整, 请重新上传`
        console.log(msg);
        return res.json({ success: true, msg, existAndComplete: false })
      }
    } catch (error) {
      throw error
    }
  }
}

const getFileList: express.RequestHandler = async (req, res, next) => {
  try {
    if (!fs.existsSync(FILE_LIST_PATH)) {
      res.json({ success: true, fileList: [] })
    } else {
      const fileList = JSON.parse(await fsp.readFile(FILE_LIST_PATH, { encoding: 'utf-8' }))
      res.json({ success: true, fileList })
    }
  } catch (error) {
    res.json({ success: false, fileList: [] })
    throw error
  }
}

export { checkExist, saveChunk, mergeChunks, deleteFile, getFile, getFileList, renameFile }