const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const chalk = require("chalk");
const axios = require("axios");
const images = require("images");
const Tesseract = require("tesseract.js");
const fsState = promisify(fs.stat);
const fsUnlink = promisify(fs.unlink);

class Recognize {
  constructor(url, lan = "chi_sim") {
    this.imageUrl = url;
    this.lan = lan;
    this.downloadDir = `${__dirname}/download`;
    this.downloadFile = `${__dirname}/download/temp.png`;

    try {
      this.start(url);
    } catch (error) {
      console.log(chalk.red(error));
    }
  }

  async start(url) {
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
      console.log(`${chalk.cyanBright(result)}`);
    }
  }

  async beforeStart() {
    const [fileStateError, fileStateData] = await fsState(this.downloadFile)
      .then((data) => [null, data])
      .catch((error) => [error, null]);

    // if (fileStateError)
    //   return console.log(chalk.red("异常错误，请重新打开:", fileStateError));

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
    images(this.downloadFile).size(400).save(this.downloadFile);
    console.log(chalk.green("图片缩放成功"));
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
