const log4js = require('./lib/log_utils.js'); // 引入库

console.log("start send worker pid = " + process.pid + " ");

process.on('message', (msg, client) => {	
    console.error("msg = " + msg);

    client.write("hasskwi========>");

    process.send(" ret msg = " + msg, client);
})


