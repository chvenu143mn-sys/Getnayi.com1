const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf-8');

// Replace logger.{level}("msg", arg) -> logger.{level}({ payload: arg }, "msg")
// to be safe for any type
['error', 'warn', 'info'].forEach(level => {
    // Regex matches: logger.info("Some message:", some_variable); 
    // or logger.error(`Some message`, some_var)
    const regex = new RegExp(`logger\\.${level}\\(([\`'"])(.*?)([\`'"])\\s*,\\s*(.*?)\\);`, 'g');
    server = server.replace(regex, (match, q1, msg, q2, arg) => {
        // if arg is already an object or literal we just wrap it
        return `logger.${level}({ payload: ${arg} }, ${q1}${msg}${q2});`;
    });
});

fs.writeFileSync('server.ts', server);
console.log("Logger format fixed for remaining typings");
