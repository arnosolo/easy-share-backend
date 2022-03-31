
const strings = {
  en: {
    option: "English",
    title: "Easy Share",
    username: "Username",
    password: "Password",
    signUp: "Sign up",
    login: "Login",
    selectFile: "Please select a file",
    chooseFile: "Choose",
    loading: "Loading",
    listFilesAgain: "List all again",
    listFiles: "List all",
    uploading: "uploading...",
    uploadFailed: "Upload failed",
    uploadAgain: "Upload again",
    uploadSuccess: "Upload success",
    deleting: "Deleting...",
    deleteAgain: "Delete again",
    delete: "Delete",
    copied: "Copied ✔",
    copyFailed: "Copy failed ×",
    copyLink: "Copy link",
    less: "Less^",
    more: "More...",
    download: "Download",
    listed_but_only_has_zero: "Files listed, but there is only zero term",
    was_selected: "was selected.",
    hash_calculation_progress: "Hash calculation progress:",
    file_upload_success: "File upload success",
    upload_progress: "Upload progress",
    server_is_merging_chunks: "Server is merging chunks...",
    comfirm_delete: "Are you sure you want delete this file?",
    abortUpload: "Abort upload",
    slicing: "Slicing file into chunks...",
    slicingFailed: "Slicing failed",
  },
  zh: {
    option: "简体中文",
    title: "轻松分享",
    username: "用户名",
    password: "密码",
    signUp: "注册",
    login: "登录",
    selectFile: "请选择文件",
    chooseFile: "浏览文件",
    loading: "正在加载...",
    listFilesAgain: "再次列出文件",
    listFiles: "列出全部",
    uploading: "正在上传...",
    uploadFailed: "上传失败",
    uploadAgain: "重新上传",
    uploadSuccess: "上传成功",
    deleting: "正在删除...",
    deleteAgain: "再次删除",
    delete: "删除",
    copied: "已复制✔",
    copyFailed: "复制失败×",
    copyLink: "复制链接",
    less: "折叠^",
    more: "更多...",
    download: "下载",
    listed_but_only_has_zero: "文件列表已收到, 但一共只有0项",
    was_selected: "已选择",
    hash_calculation_progress: "哈希计算进度:",
    file_upload_success: "文件上传完成",
    upload_progress: "上传进度",
    server_is_merging_chunks: "服务器正在合并切片...",
    comfirm_delete: "确定要删除这个文件吗?",
    abortUpload: "放弃上传",
    slicing: "正在将文件切块...",
    slicingFailed: "文件切块失败",
  }
}

const app = Vue.createApp({
  data() {
    return {
      reqArgs: {
        // urlBase: "http://localhost:3000",
        urlBase: "https://arno.fun",
        password: "",
        username: "",
      },
      strings: strings,
      langOptions: [],
      lang: "en",
    }
  },
  mounted() {
    for(let langOption in this.strings) {
      this.langOptions.push(langOption)
    }
    const browerLang = navigator.language.substring(0, 2)
    if(new Set(this.langOptions).has(browerLang)) {
      this.lang = browerLang
    }
    
    this.checkAuth()
    document.getElementById("app").removeChild(document.getElementById("loading-page"))
  },
  computed: {
    str() {
      return this.strings[this.lang]
    }
  },
  methods: {
    async checkAuth() {
      try {
        const url = `${this.reqArgs.urlBase}/api/v1/check_auth`
        const res = await fetch(url, {
          method: 'post',
          mode: 'cors',
          headers: {
            'Authorization': ('Bearer ' + localStorage.getItem('token')) ?? ''
          },
        })
        if(res.status == 401) {
          this.$router.push('/login')
          return
        }
      } catch (error) {
        console.error(error);
      }
    }
  },
})

const Home = {
  data() {
    return {
      fileList: [],
      selectedFile: "",
      uploadStatus: "",
      chunkSize: 10 * 1024 * 1024, // 10MB
      loadingFileList: false,
      fileListLoadFail: false,
      slicing: false,
      slicingFailed: false,
      slicingProgress: 0,
      hashing: false,
      hashFailed: false,
      hashProgress: 0,
      uploading: false,
      uploadFail: false,
      uploadProgress: 0,
      reqArgs: this.reqargs,
      abortControllers:[],
    }
  },
  props: ['reqargs', 'str'],
  template: `
  <div class="info">

    <div>
      <label for="file-picker">{{str.selectFile}}</label>
      <button @click="selectFile" class="light-button">{{str.chooseFile}}</button>
      <input ref="filepicker" type="file" @change="uploadFile" class="hide">
      <button v-on:click="listAllFile" :class="{ loading_btn: loadingFileList }" class="light-button">
        <span v-if="loadingFileList">{{str.loading}}</span>
        <span v-else-if="fileListLoadFail">{{str.listFileAgain}}</span>
        <span v-else="loadingFileList">{{str.listFiles}}</span>
      </button>
    </div>

    <div class="status-info">
      <div v-if="slicing">
        <span>{{str.slicing}}</span>
      </div>
      <div v-if="slicingFailed">
        <span>{{str.slicingFailed}}</span>
        <button @click="uploadFile" class="light-button">{{str.uploadAgain}}</button>
      </div>
      <div v-if="uploading" class="status-info-item">
        <div>{{uploadStatus}}</div> <br/>
        <button @click="abortUpload" class="light-button">{{str.abortUpload}}</button>
      </div>
      <div v-if="uploadFail">
        <span>{{str.uploadFailed}}</span>
        <button @click="uploadFile" class="light-button">{{str.uploadAgain}}</button>
      </div>
    </div>

    <div class="sk-plane" v-if="loadingFileList || uploading"></div>
    
    <ul class="file-list">
      <transition-group name="slide">
        <file-item
          v-for="item in fileList" 
          :key="item.md5"
          :file="item"
          :reqargs="reqArgs"
          :str="str"
          v-on:delete-item="deleteFileItem"
          class="file-item"
        ></file-item>
      </transition-group>
    </ul>

  </div>
  `,
  mounted() {
  },
  methods: {
    selectFile() {
      this.$refs.filepicker.click()
      console.log(this.$refs.filepicker);
    },
    async listAllFile() {
      this.loadingFileList = true
      this.fileListLoadFail = false
      const form = new FormData()
      const url = `${this.reqArgs.urlBase}/api/v1/file/list-all`
      try {
        const res = await fetch(url, {
          method: 'post',
          mode: 'cors',
          headers: {
            'Authorization': ('Bearer ' + localStorage.getItem('token')) ?? ''
          },
          body: form
        })
        if(res.status == 401) {
          this.$router.push('/login')
          return
        }
        const { success, fileList, msg } = await res.json()
        this.fileList = fileList.reverse()
        this.loadingFileList = false
        if (!success) {
          this.fileListLoadFail = true
          console.warn(`服务器: ${msg}`);
        } else if (fileList.length === 0) {
          this.fileListLoadFail = false
          const msg = this.str.listed_but_only_has_zero
          console.log(msg);
          this.uploadStatus = msg
        } else {
          this.fileListLoadFail = false
          console.log(fileList);
        }
      } catch (error) {
        this.loadingFileList = false
        this.fileListLoadFail = true
        console.error(error)
      }

    },
    deleteFileItem(md5) {
      const i = this.fileList.findIndex(file => file.md5 === md5)
      this.fileList.splice(i, 1)
    },
    sliceFile(file, size) {
      const chunks = []
      let index = 0
      let cur = 0
      while (cur < file.size) {
        chunks.push({
          id: index,
          data: file.slice(cur, cur + size)
        })
        index++
        cur += size
      }
      return chunks
    },
    async uploadFile(evt) {
      this.slicing = true
      this.slicingFailed = false
      this.uploadFail = false

      const file = this.$refs.filepicker.files[0]
      this.selectedFile = file.name
      this.uploadStatus = `${file.name} ${this.str.was_selected}`
      console.log("file", file);

      // 1.文件切片
      let chunks = this.sliceFile(file, this.chunkSize).sort((a, b) => a.id - b.id)

      const getMD5 = (chunks) => new Promise((resolve, reject) => {
        const spark = new SparkMD5.ArrayBuffer()
        let count = 0
        const loadNext = index => {
          const reader = new FileReader();
          reader.readAsArrayBuffer(chunks[index].data);
          reader.onload = e => {
            count++;
            const msg = `${this.str.hash_calculation_progress} ${Number(count / chunks.length * 100).toFixed(0)}%`
            this.uploadStatus = msg
            console.log(msg);
            spark.append(e.target.result);
            if (count === chunks.length) {
              resolve(spark.end())
              return
            }
            // 递归计算下一个切片
            loadNext(count);
          }
        };
        loadNext(0);
      })

      let md5 = ""
      try {
        md5 = await getMD5(chunks)
        this.slicing = false
      } catch (error) {
        this.slicing = false
        this.slicingFailed = true
        console.error(error)
      }
      const fileExtension = file.name.split('.').slice(-1)[0]
      const md5WithExten = md5 + '.' + fileExtension

      // 2.1重命名切片为 `${index}-${md5WithExten}`
      chunks = chunks.map(chunk => new Object({
        id: `${chunk.id}-${md5WithExten}`,
        data: chunk.data
      }))
      console.log(chunks);

      // 3.先确认合并文件服务器上是不是 已存在且还是完整的
      try {
        this.uploading = true

        const msg = `正在询问服务器${md5WithExten} 是否 已存在且还是完整的`
        console.log(msg);
        // this.uploadStatus = msg
        const form = new FormData();
        form.append('md5', md5);
        form.append('md5WithExten', md5WithExten);
        form.append('filename', file.name);
        const url = `${this.reqArgs.urlBase}/api/v1/file/exist`
        const res = await fetch(url, {
          method: 'post',
          body: form,
          headers: {
            'Authorization': ('Bearer ' + localStorage.getItem('token')) ?? ''
          },
          mode: 'cors',
        })
        if(res.status == 401) {
          this.$router.push('/login')
          return
        }
        const resJson = await res.json()
        // 3.a合并文件已存在且还是完整的,显示文件超链接
        if (resJson.existAndComplete) {
          console.log(`服务器: ${resJson.msg}`);
          this.uploadStatus = this.str.file_upload_success
          this.uploading = false
          const i = this.fileList.findIndex(it => it.md5 == md5)
          if(i != -1) this.fileList.splice(i, 1)
          this.fileList.unshift({md5,filename: file.name,md5WithExten})
          // showUrlAndQRcode()
        } else { // 3.b合并文件不存在或不完整的,开始上传
          console.log(`合并文件${md5WithExten}不存在或不完整的,开始上传`);
          this.uploadStatus = `${this.str.uploading} ${file.name}`
          let successCount = 0
          const uploadStatePromises = chunks.map(async (chunk) => {
            try {
              console.log(`正在上传 ${chunk.id}`);
              const form = new FormData();
              form.append('chunkData', chunk.data);
              form.append('chunkId', chunk.id);
              form.append('filename', file.name);
              form.append('md5', md5);
              form.append('md5WithExten', md5WithExten);
              // form.append('code', SparkMD5.hash(this.reqArgs.password));
              const controller = new AbortController(); // 用于手动终止fetch请求
              this.abortControllers.push(controller)
              const { signal } = controller; // 用于手动终止fetch请求
              const url = `${this.reqArgs.urlBase}/api/v1/file/upload`
              const res = await fetch(url, {
                method: 'post',
                headers: {
                  'Authorization': ('Bearer ' + localStorage.getItem('token')) ?? ''
                },
                body: form,
                mode: 'cors',
                signal,
              })
              const resJson = await res.json()
              if (resJson.success) {
                successCount++
                const msg = `${this.str.upload_progress}: ${Number(successCount / chunks.length * 100).toFixed(0)}%`
                this.uploadStatus = msg
                console.log(`服务器: ${resJson.msg}`);
              } else {
                const msg = this.str.uploadFailed
                this.uploadStatus = msg
                console.error(msg);
                this.uploadFail = true
              }
            } catch (error) {
              this.uploadFail = true
              this.uploading = false
              this.uploadStatus = this.str.uploadFailed
              console.error(error);
            }
          })

          // 4.发送文件合并请求
          // 4.1等待所有的切片上传完成
          await Promise.all(uploadStatePromises)
          const msg = `successReq/All: ${successCount}/${chunks.length}`
          console.log(msg);
          this.uploadStatus = msg

          // 4.2请求合并
          if (successCount === chunks.length) {
            try {
              console.log(`正在发送合并请求 ${file.name}`);
              this.uploadStatus = this.str.server_is_merging_chunks
              const form = new FormData();
              form.append('filename', file.name);
              form.append('chunkSize', this.chunkSize);
              form.append('md5', md5);
              form.append('md5WithExten', md5WithExten);
              // form.append('code', SparkMD5.hash(this.reqArgs.password));
              const url = `${this.reqArgs.urlBase}/api/v1/file/merge`
              const res = await fetch(url, {
                method: 'post',
                headers: {
                  'Authorization': ('Bearer ' + localStorage.getItem('token')) ?? ''
                },
                body: form,
                mode: 'cors',
              })
              const resJson = await res.json()
              this.uploading = false
              if (resJson.success) {
                console.log(`服务器: ${resJson.msg}`);
                this.uploadStatus = this.str.uploadSuccess
                this.fileList.unshift({md5,filename: file.name,md5WithExten})
              } else {
                const msg = `服务器: ${resJson.msg}`
                console.error(msg);
                this.uploadStatus = this.str.uploadFailed
                this.uploadFail = true
              }
            } catch (error) {
              this.uploadStatus = this.str.uploadFailed
              console.error(error);
              this.uploadFail = true
              this.uploading = false
            }
          }
        }
      } catch (error) {
        console.error(error);
        this.uploadFail = true
        this.uploading = false
      }
    },
    abortUpload() {
      this.abortControllers.forEach(c => c.abort()) // 终止所有fetch请求
    },

  }
}

const Login = {
  data() {
    return {
      reqArgs: this.reqargs,
      statusMsg: ""
    }
  },
  props: ['reqargs', 'str'],
  emits: ['change-auth-status'],
  template: `
  <div class="info">
    <div class="form-item">
      <label for="username-input">{{str.username}}</label>
      <input v-model="reqArgs.username" type="text">
    </div>
    <div class="form-item">
      <label for="password-input">{{str.password}}</label>
      <input v-model="reqArgs.password" type="password">
    </div>
    <div>
      <button @click="signUp" type="submit" class="light-button">{{str.signUp}}</button>
      <button @click="login" type="submit" class="light-button">{{str.login}}</button>
    </div>
    <div>{{statusMsg}}</div>
  </div>
  `,
  methods: {
    async signUp() {
      try {
        const url = `${this.reqArgs.urlBase}/api/v1/user/signup`
        const form = new FormData()
        form.append('username', SparkMD5.hash(this.reqArgs.username));
        form.append('password', SparkMD5.hash(this.reqArgs.password));
        const res = await fetch(url, {
          method: 'post',
          mode: 'cors',
          body: form
        })
        const { success, msg, data } = await res.json()
        if(success) {
          console.log(`${data.user.username} 注册成功`, data);
          this.statusMsg = "注册成功, 正在自动登录..."
          this.login()
        } else {
          console.warn("注册失败", msg);
          this.statusMsg = `注册失败 ${msg}`
        }
      } catch (error) {
        this.statusMsg = `注册失败`
        console.error(error);
      }
    },
    async login() {
      console.log(JSON.stringify({
        username: SparkMD5.hash(this.reqArgs.username), 
        password: SparkMD5.hash(this.reqArgs.password)
      }));
      try {
        const url = `${this.reqArgs.urlBase}/api/v1/user/login`
        const form = new FormData()
        form.append('username', SparkMD5.hash(this.reqArgs.username));
        form.append('password', SparkMD5.hash(this.reqArgs.password));
        const res = await fetch(url, {
          method: 'post',
          mode: 'cors',
          body: form
        })
        const { success, data } = await res.json()
        if(success) {
          this.$router.push(`/user/${data.user.id}`)
          console.log(`登录成功`, data);
          localStorage.setItem("token", data.token)
          this.statusMsg = `登录成功`
          this.$router.push('/')
        } else {
          // this.$router.push(`/login`)
          console.warn("登录失败");
          this.statusMsg = `登录失败`
        }
      } catch (error) {
        this.statusMsg = `登录失败`
        console.error(error);
      }
    },
  }
}

app.component("file-item", {
  data() {
    return {
      showDetail: false,
      deleting: false,
      deleteFail: false,
      qrCreated: false,
      linkCopied: false,
      linkCopyFailed: false,
      // 因为html不区分大小写使用驼峰命名法向子组件传参
      // 会传入undefined
      reqArgs: this.reqargs,
      url: `${this.reqargs.urlBase}/api/v1/file/${this.file.md5WithExten}`,
      fileExten: "",
      isImg: false,
      imgLoaded: false,
      unmountSoon: false,
      ready: false,
    }
  },
  mounted() {
    this.ready = true
  },
  beforeUnmount() {
    this.unmountSoon = true
  },
  props: ['reqargs', 'file', 'str'],
  emits: ['delete-item'],
  methods: {
    toggleDetailShow() {
      this.showDetail = !this.showDetail
      if (!this.qrCreated) {
        this.createQR()
        const ls = this.file.md5WithExten.split('.')
        this.fileExten = ls[ls.length - 1];
        new Array("png", "jpg", "jpeg", "PNG", "JPG", "JPEG", "gif").forEach(t => {
          if(this.fileExten == t) this.isImg = true
        });
      }
    },
    async confirmDel() {
      if (confirm(`${this.str.comfirm_delete} ${this.file.filename}`)) {
        this.deleting = true
        this.deleteFail = false
        const form = new FormData()
        form.append('code', SparkMD5.hash(this.reqArgs.password));
        try {
          const res = await fetch(this.url, {
            method: 'delete',
            headers: {
              'Authorization': ('Bearer ' + localStorage.getItem('token')) ?? ''
            },
            mode: 'cors',
            body: form
          })
          const { success, msg } = await res.json()
          if (success) {
            console.log(`服务器: ${msg}`);
            this.$emit('delete-item', this.file.md5)
          } else {
            this.deleteFail = true
            console.error(`服务器: ${msg}`);
          }
          this.deleting = false
        } catch (error) {
          this.deleting = false
          this.deleteFail = true
          console.error(error)
        }

      }
    },
    createQR() {
      QRCode.toCanvas(this.$refs.qrCode, this.url, (error) => {
        if (error) {
          console.error(error)
        } else {
          this.qrCreated = true
        }
      })
    },
    copyLink() {
      this.linkCopyFailed = false
      navigator.clipboard.writeText(this.url).then(() => { 
        this.linkCopied = true
        setTimeout(() => {
          this.linkCopied = false
        }, 2000)
      }).catch(err => {
        this.linkCopyFailed = true
        console.error(err)
      })
    },
    downloadFile() {
      let a = document.createElement('a');
      a.href = this.url;
      a.download = `${this.file.filename}`;
      a.click();
    },
    handleImgLoaded() {
      this.imgLoaded = true
    },
  },
  template:
    `
      <li>
        <div>{{file.filename}}</div>
        <div>
        <button v-on:click="confirmDel" :class="{ inactive: deleting }" class="light-button">
          <span v-if="deleting">{{str.deleting}}</span>
          <span v-else-if="deleteFail">{{str.deleteAgain}}</span>
          <span v-else>{{str.delete}}</span>
        </button>
        <button @click="copyLink" class="light-button">
          <span v-if="linkCopied">{{str.copied}}</span>
          <span v-else-if="linkCopyFailed">{{str.copyFailed}}</span>
          <span v-else>{{str.copyLink}}</span>
        </button>
        <button v-on:click="toggleDetailShow" class="light-button">
          <span v-if="showDetail">{{str.less}}</span>
          <span v-else>{{str.more}}</span>
        </button>
        
        <div v-show="showDetail" class="file-item-detail">
          <canvas ref="qrCode">...</canvas>
          <div v-if="isImg">
            <img v-show="imgLoaded" :src="url" @load="handleImgLoaded" alt="..." loding="lazy" class="file-item-detail-img">
            <div v-if="!imgLoaded" class="sk-plane"></div>
          </div>
          <div>
            <button @click="downloadFile" class="light-button">{{str.download}}</button>
          </div>
        </div>
        </div>
    </li>
    `
})

const NotFound = {
  template: `
    <div class="form-item">
      <span>未找到网页,请</span>
      <button @click="goHome" class="light-button">返回主页</button>
    </div>
  `,
  methods: {
    goHome() {
      this.$router.push('/')
    }
  }
}

const routes = [
  { path: "/", component: Home},
  { path: "/login", component: Login},
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFound },
]

const router = VueRouter.createRouter({
  history: VueRouter.createWebHashHistory(),
  routes,
})

app.use(router)

app.mount('#app')
