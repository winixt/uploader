const path = require('path');
const multiparty = require('multiparty');
const fse = require('fs-extra');

// 大文件存储目录
const UPLOAD_DIR = path.resolve(__dirname, '..', 'tmp');

const extractExt = (filename) =>
    filename.slice(filename.lastIndexOf('.'), filename.length);

// 创建临时文件夹用于临时存储 chunk
const createChunkDir = (fileHash) =>
    path.resolve(UPLOAD_DIR, `chunk_dir_${fileHash}`);

// 写入文件流
const pipeStream = (path, writeStream) =>
    new Promise((resolve) => {
        const readStream = fse.createReadStream(path);
        readStream.on('end', () => {
            resolve();
        });
        readStream.pipe(writeStream);
    });

// 合并切片
const mergeFileChunk = async (filePath, fileHash, chunkSize) => {
    const chunkDir = createChunkDir(fileHash);
    const chunkPaths = await fse.readdir(chunkDir);
    // 根据切片下标进行排序
    // 否则直接读取目录的获得的顺序会错乱
    chunkPaths.sort((a, b) => a - b);
    // 并发写入文件
    await Promise.all(
        chunkPaths.map((chunkPath, index) =>
            pipeStream(
                path.resolve(chunkDir, chunkPath),
                // 根据 size 在指定位置创建可写流
                fse.createWriteStream(filePath, {
                    start: index * chunkSize,
                }),
            ),
        ),
    );

    // 合并后删除保存切片的目录
    fse.removeSync(chunkDir);
};

class Controller {
    getFilePath(fields) {
        const [filename] = fields.filename;
        const [hash] = fields.hash;
        const ext = extractExt(filename);
        return path.resolve(UPLOAD_DIR, `${hash}${ext}`);
    }
    async handleMerge(fields) {
        const [chunkSize] = fields.chunkSize;
        const [hash] = fields.hash;
        const filePath = this.getFilePath(fields);

        await mergeFileChunk(filePath, hash, Number(chunkSize));
    }
    async uploadChunkResult(res, fields, msg) {
        const [totalChunk] = fields.totalChunk;
        const [hash] = fields.hash;
        const chunkDir = createChunkDir(hash);

        // 切片数量等于分片数量，合并文件
        if (fse.readdirSync(chunkDir).length === Number(totalChunk)) {
            await this.handleMerge(fields);
            res.end(
                JSON.stringify({
                    code: 0,
                    merge: {
                        fileHash: hash,
                    },
                    msg,
                }),
            );
        } else {
            res.end(
                JSON.stringify({
                    code: 0,
                    msg,
                }),
            );
        }
    }
    async handleFormData(req, res) {
        const multipart = new multiparty.Form();

        multipart.parse(req, async (err, fields, files) => {
            if (err) {
                console.error(err);
                res.status = 500;
                res.end('process file chunk failed');
                return;
            }
            const [chunk] = files.chunk;
            const [chunkIndex] = fields.chunkIndex;
            const [filename] = fields.filename;
            const [hash] = fields.hash;

            const filePath = this.getFilePath(fields);
            const chunkDir = createChunkDir(hash);
            const chunkPath = path.resolve(chunkDir, `${chunkIndex}`);

            // 文件存在直接返回
            // return if file is exists
            if (fse.existsSync(filePath)) {
                res.end(
                    JSON.stringify({
                        code: 0,
                        merge: {
                            fileHash: hash,
                        },
                        msg: 'OK',
                    }),
                );
                return;
            }

            // 切片存在直接返回
            // return if chunk is exists
            if (fse.existsSync(chunkPath)) {
                this.uploadChunkResult(
                    res,
                    fields,
                    `${filename} chunk ${chunkIndex} exists`,
                );
                return;
            }

            // 切片目录不存在，创建切片目录
            // if chunk directory is not exist, create it
            if (!fse.existsSync(chunkDir)) {
                await fse.mkdirs(chunkDir);
            }

            // fs-extra 的 rename 方法 windows 平台会有权限问题
            // use fs.move instead of fs.rename
            // https://github.com/meteor/meteor/issues/7852#issuecomment-255767835
            await fse.move(chunk.path, path.resolve(chunkDir, `${chunkIndex}`));

            this.uploadChunkResult(
                res,
                fields,
                `${filename} chunk ${chunkIndex} upload successed`,
            );
        });
    }
}

module.exports = Controller;
