#!/usr/bin/env node

const argv = require("yargs").argv;
const chalk = require("chalk");
const Recognize = require("./recognize");

if (!argv.url) {
  console.log(`
    ${chalk.red("缺少url参数")}

    ${chalk.bold("用法：")} ${chalk.green(
    "reg --url=https://qiniu.chenng.cn/2018-12-09-15-21-29.png"
  )}
  `);

  return;
}

new Recognize(
  argv.url ||
    "https://ss0.bdstatic.com/70cFvHSh_Q1YnxGkpoWK1HF6hhy/it/u=3008973576,3625995400&fm=26&gp=0.jpg",
  argv.lan
);
