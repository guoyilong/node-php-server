const log4js = require('./lib/log_utils.js'); // 引入库

var PHPFPM = require('node-phpfpm');

var __php_dirname = "/web/www/www/node/";

var phpfpm = new PHPFPM(
{
        host: '10.0.2.15',
        port: 9000,
        documentRoot: __php_dirname
});

console.log("start php worker pid = " + process.pid + " ");

function do_php_logic(msg)
{
    var send_php_msg = "test.php?msg=" + msg;

    log4js.MyDebug("now this process id = " + process.pid  + " in work" + " msg = " + msg);
    log4js.MyDebug("send_php_msg = " + send_php_msg);

    phpfpm.run(send_php_msg, function(err, output, phpErrors)
    {
        if (err == 99) 
        {
            console.error('PHPFPM server error');
        }

        log4js.MyDebug("php ret msg = " + output);
        if (phpErrors) 
        {
            console.error(phpErrors);
        }

        process.send(output);
    });
}

const test = function(msg) {

    if (msg === "gyl" || msg === "guo") {
        log4js.MyError(" now this process id = " + process.pid  + " in work" + " msg = " + msg);
      
        log4js.MyError(" now this process id = " + process.pid  + " in work and get result msg " + msg);
    }

    return 1000 + process.pid + msg;
}

process.on('message', msg => {	
    log4js.MyDebug("========> recv from master msg " + msg + '   process.pid ' + process.pid); // 子进程id	
    //const sum = test(msg);
    // 如果Node.js进程是通过进程间通信产生的，那么，process.send()方法可以用来给父进程发送消息	
   	do_php_logic(msg);
})


