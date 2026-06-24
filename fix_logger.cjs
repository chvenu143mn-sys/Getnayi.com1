const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf-8');

server = server.replace(/logger\.error\(\{ err: (.*?), msg: (.*?) \}\);/g, 'logger.error({ err: $1 }, $2);');
server = server.replace(/logger\.error\(\{ err: (.*?), reqId: (.*?), msg: (.*?) \}\);/g, 'logger.error({ err: $1, reqId: $2 }, $3);');
server = server.replace(/logger\.error\(\{ err, reqId: (.*?), msg: (.*?) \}\);/g, 'logger.error({ err, reqId: $1 }, $2);');
server = server.replace(/logger\.error\(\{ err, msg: (.*?) \}\);/g, 'logger.error({ err }, $1);');
server = server.replace(/logger\.info\(\{ msg: (.*?), videoId: (.*?) \}\)/g, 'logger.info({ videoId: $2 }, $1)');
server = server.replace(/logger\.error\((.*?)\);/g, (match, p1) => {
    if (p1.includes('{') || p1.includes(',')) return match;
    return `logger.error({}, ${p1});`;
});
server = server.replace(/logger\.warn\((.*?)\);/g, (match, p1) => {
    if (p1.includes('{') || p1.includes(',')) return match;
    return `logger.warn({}, ${p1});`;
});
server = server.replace(/logger\.info\((.*?)\);/g, (match, p1) => {
    if (p1.includes('{') || p1.includes(',')) return match;
    return `logger.info({}, ${p1});`;
});

fs.writeFileSync('server.ts', server);
console.log("Logger format fixed");
