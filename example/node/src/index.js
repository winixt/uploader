const http = require('http');

const Controller = require('./controller');

const server = http.createServer();
// 大文件存储目录
const controller = new Controller();

server.on('request', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') {
        res.status = 200;
        res.end();
        return;
    }

    if (req.url === '/upload') {
        await controller.handleFormData(req, res);
    }
});

server.listen(3000, () => console.log('listening port 3000'));
