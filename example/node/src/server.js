
const UPLOAD_DIR = path.resolve(__dirname, '..', 'target');
const fse = require('fs-extra');

export const acceptChunk = (fields) => {
    const chunkDir = path.resolve(UPLOAD_DIR, 'chunkDir', filename);

    if (!fse.existsSync(chunkDir)) {
        await fse.mkdirs(chunkDir);
    }
} 