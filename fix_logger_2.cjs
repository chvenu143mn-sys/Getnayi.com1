const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf-8');

// The issue is pino logger.error(msg, err) doesn't work if err is not a format arg, and TS complains.
// We need to change logger.error("msg", err) to logger.error({ err }, "msg")
// If there's an error like logger.error(err), it's fine. 

server = server.replace(/logger\.error\("(.*?)",\s*([a-zA-Z0-9_]+)\)/g, 'logger.error({ err: $2 }, "$1")');
server = server.replace(/logger\.warn\("(.*?)",\s*([a-zA-Z0-9_]+)\)/g, 'logger.warn({ err: $2 }, "$1")');
server = server.replace(/logger\.info\("(.*?)",\s*([a-zA-Z0-9_]+)\)/g, 'logger.info({ info: $2 }, "$1")');

fs.writeFileSync('server.ts', server);
console.log("Logger format fixed for pino typings");
