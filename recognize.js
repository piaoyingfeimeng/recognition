// https://www.chenng.cn/post/Node-command-line-tool-production.html

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const chalk = require("chalk");
const axios = require("axios");
const images = require("images");
const Tesseract = require("tesseract.js");
const mimeType = require("mime-types");
const fsState = promisify(fs.stat);
const fsUnlink = promisify(fs.unlink);

/**
 * 文字识别
 * @param {String} url 图片路径
 * @param {Boolean} isLocalUrl 是否是本地路径
 * @param {String} lan 识别字体选择
 * @param {Boolean} isPkg 是否为打包后的客户端操作
 */
class Recognize {
  constructor(url, isLocalUrl = false, lan = "chi_sim+eng", isPkg = false) {
    this.imageUrl = url;
    this.isLocalUrl = isLocalUrl;
    this.lan = lan;
    this.isPkg = isPkg;
    this.downloadDir = isPkg
      ? path.resolve(process.cwd(), "./download")
      : `${__dirname}/download`;
    this.downloadFile = isPkg
      ? path.resolve(process.cwd(), "./download/temp.png")
      : `${__dirname}/download/temp.png`;

    // this.downloadDir = path.resolve(process.cwd(), "./download");
    // this.downloadFile = path.resolve(process.cwd(), "./download/temp.png");

    // this.downloadDir = require(process.cwd() + "\\download");
    // this.downloadFile = require(process.cwd() + "\\download\\temp.png");

    // this.downloadDir = `./download`;
    // this.downloadFile = `./download/temp.png`;

    try {
      this.start(url);
    } catch (error) {
      console.log(chalk.red(error));
    }
  }

  async start(url) {
    // 如果是本地图片路径，则直接进行识别
    if (this.isLocalUrl) {
      this.downloadFile = this.isPkg
        ? path.resolve(process.cwd(), this.imageUrl)
        : `${__dirname}/download/${this.imageUrl}`;

      const result = await this.handleTesseractImg();
      console.log(`${chalk.cyanBright(result)}`);

      return;
    }

    const [beforeError, beforeData] = await this.beforeStart()
      .then((a) => [null, a])
      .catch((e) => [e, null]);

    if (beforeError) return;

    const [error, data] = await this.downloadImg(url)
      .then((a) => [null, a])
      .catch((e) => [e, null]);

    if (data) {
      await this.recognizeImage();
      const result = await this.handleTesseractImg();

      fs.writeFile(
        `${this.downloadDir}/result.txt`,
        result,
        { encoding: 'utf8'},
        (error) => {
          if (error)
            return console.log(
              chalk.redBright("写入文件失败：" + error.message)
            );

          console.log(chalk.greenBright("文件写入成功"));
        }
      );

      console.log(`${chalk.cyanBright(result)}`);
    }
  }

  async beforeStart() {
    // 查看文件是否存在
    const [fileStateError, fileStateData] = await fsState(this.downloadFile)
      .then((data) => [null, data])
      .catch((error) => [error, null]);

    // if (fileStateError)
    //   return console.log(chalk.red("异常错误，请重新打开:", fileStateError));

    // 如果文件存在则进行删除
    if (fileStateData) {
      const [fileUnlinkError, fileUnlinkData] = await fsUnlink(
        this.downloadFile
      )
        .then((data) => [null, data])
        .catch((error) => [error, null]);

      if (fileUnlinkError) {
        console.log(chalk.red("删除旧文件错误"));
        return Promise.reject();
      }

      console.log(chalk.green("删除旧文件成功"));
    }

    // 如果文件夹不存在，则穿件文件夹
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir);

      console.log(chalk.greenBright(`成功创建${this.downloadDir}文件夹`));
      return Promise.resolve();
    }

    return Promise.resolve();
  }

  // 下载图片
  async downloadImg(url) {
    // 创建文件 写入流
    const writerStream = fs.createWriteStream(this.downloadFile);

    return axios
      .get(url, {
        responseType: "stream",
        timeout: 10 * 60 * 1000, // 10分钟超时
        onDownloadProgress: (progressEvent) => {
          const { loaded, total } = progressEvent;
          let percent = Math.ceil((loaded / total) * 100);
          percent = percent > 100 ? 100 : percent;

          console.log(chalk.green(`已下载${percent}%，请耐心等待...`));
          if (percent >= 100) console.log(chalk.green(`下载成功`));
        },
      })
      .then((imageStream) => {
        return new Promise((resolve, reject) => {
          imageStream.data.pipe(writerStream);

          writerStream.on("finish", () => {
            console.log(chalk.greenBright("图片写入成功"));
            resolve(true);
          });

          writerStream.on("error", (err) => {
            writerStream.close();
            console.log(chalk.red(`图片写入失败: ${err}`));
            reject(err);
          });
        });
      })
      .catch((error) => {
        // https://ss0.bdstatic.com/70cFvHSh_Q1YnxGkpoWK1HF6hhy/it/u=3008973576,3625995400&fm=26&gp=0.jpg
        console.log(chalk.red(`图片下载失败,请检测图片链接:${error}`));
      });
  }

  // 放大图片，并覆盖源文件
  async recognizeImage() {
    const { width, height } = images(this.downloadFile).size();
    if (width < 500 && height < 500) {
      images(this.downloadFile).size(450).save(this.downloadFile);
      console.log(chalk.green("图片缩放成功"));
    }
  }

  // 识别图片中的文字
  async handleTesseractImg() {
    const createWorker = Tesseract.createWorker;
    let [startTime, endTime] = [new Date().getTime(), null];
    console.log(
      chalk.bgCyan(
        "文字识别开始，请耐心等待(首次使用会加载语言信息,时间稍长)..."
      )
    );

    // const fileMimeType = mimeType.lookup(this.downloadFile);
    // const imageData = fs.readFileSync(this.downloadFile); // 例：fileUrl="D:\\test\\test.bmp"
    // const imageBase64 = imageData.toString("base64");
    // let base64 = "data:" + fileMimeType + ";base64," + imageBase64;

    // console.log("base64==>", base64);

    const worker = createWorker({
      logger: (m) => {
        // console.log(m);
        m.status === "recognizing text" &&
          console.log(
            `识别进度：${(m.progress * 100 > 100
              ? 100
              : m.progress * 100
            ).toFixed(2)}%`
          );
      },
    });

    await worker.load();
    await worker.loadLanguage(this.lan);
    await worker.initialize(this.lan);
    const {
      data: { text },
    } = await worker.recognize(this.downloadFile);

    endTime = new Date().getTime();
    console.log(
      chalk.bgCyan(`文字识别结束, 耗时：${(endTime - startTime) / 1000}s`)
    );

    await worker.terminate();

    return await Promise.resolve(text);
  }
}

module.exports = Recognize;
