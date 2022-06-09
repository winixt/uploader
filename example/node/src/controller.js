const path = require('path');
const multiparty = require('multiparty');

// 大文件存储目录
// demo directory
const UPLOAD_DIR = path.resolve(__dirname, '..', 'tmp');

const extractExt = (filename) =>
    filename.slice(filename.lastIndexOf('.'), filename.length);

// 创建临时文件夹用于临时存储 chunk
// 添加 chunkDir 前缀与文件名做区分
// create a directory for temporary storage of chunks
// add the 'chunkDir' prefix to distinguish it from the chunk name
const createChunkDir = (fileHash) =>
    path.resolve(UPLOAD_DIR, `chunkDir_${fileHash}`);

class Controller {
    // 处理切片
    // process chunk
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
            const [totalChunk] = fields.totalChunk;
            const [chunkIndex] = fields.chunkIndex;
            const [filename] = fields.filename;
            const [hash] = fields.hash;

            const filePath = path.resolve(
                UPLOAD_DIR,
                `${hash}${extractExt(filename)}`,
            );
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
                res.end(
                    JSON.stringify({
                        code: 0,
                        msg: 'chunk exits',
                    }),
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

            const msg = `${filename} chunk ${chunkIndex} upload successed`;
            // 切片数量等于分片数量，合并文件
            if (fse.readdirSync(chunkDir).length === totalChunk) {
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
        });
    }
}

module.exports = Controller;
