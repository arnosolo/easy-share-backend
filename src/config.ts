import os from "os"
import path from "path"

const PORT = process.env.PORT ?? 3000
const URL_BASE = process.env.URL_BASE ?? `http://localhost:${PORT}`
const MY_AUTH_HASH = process.env.MY_AUTH_HASH ?? "6387e8d25167423eb5f3da7c084d9a4c"
const CHUNK_DIR = path.join(os.homedir(), 'upload_chunks')
const MERGED_FILE_DIR = path.join(os.homedir(), 'merged_files')
const FILE_LIST_PATH = path.join(os.homedir(), 'merged_files', `file_list.json`)

const DB_URL = "mongodb://localhost:27017/jwt"
const SECRET = "YJBaYsNv2HWQuJBaYsNv2HWQuuQ9qYlauQ9qYlaY"

export { DB_URL, SECRET, PORT, URL_BASE, MY_AUTH_HASH, CHUNK_DIR, MERGED_FILE_DIR, FILE_LIST_PATH }
