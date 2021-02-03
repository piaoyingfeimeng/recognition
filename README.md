## 图片文字识别

### 1. 直接使用
> **注意**：请提前在根目录新建好download文件夹，并把图片放置文件夹内
1. 识别网络图片
```shell
node cli.js --url="http//xxxxxx.jpg" 
```
2. 识别本地图片
```shell
node cli.js --url="xxxxxx.jpg" --isLocalUrl=true
```
### 2. 打包成pkg使用
1. 识别网络图片
```shell
recognition.exe --url="http//xxxxxx.jpg" --isPkg=true
```
2. 识别本地图片
```shell
recognition.exe --url="xxxxxx.jpg" --isLocalUrl=true --isPkg=true
```

### 3. 遗留的问题
> 打包成exe可执行文件，运行命令后，会出现[报错](https://github.com/vercel/pkg/issues/903)，还未解决。
```
internal/modules/cjs/loader.js:636
    throw err;
    ^

Error: Cannot find module 'E:\my\resource\recognition\dist\--debug-port=9230'
    at Function.Module._resolveFilename (internal/modules/cjs/loader.js:634:15)
    at Function.Module._resolveFilename (pkg/prelude/bootstrap.js:1346:46)
    at Function.Module._load (internal/modules/cjs/loader.js:560:25)
    at Function.Module.runMain (pkg/prelude/bootstrap.js:1375:12)
    at startup (internal/bootstrap/node.js:320:19)
    at bootstrapNodeJSCore (internal/bootstrap/node.js:660:3)
```
