const log4js = require('./lib/log_utils.js'); // 引入库

const computation = () => {	
    
    let sum = 0;	
    for (let i = 0; i < 1e10; i++) {	
        sum += i	
    };	
    
    return sum;	
};	

const test = function(msg) {

    if (msg === "gyl" || msg === "guo") {
        log4js.MyError(" now this process id = " + process.pid  + " in work" + " msg = " + msg);
        computation();
        computation();
        log4js.MyError(" now this process id = " + process.pid  + " in work and get result msg " + msg);
    }

    return 1000 + process.pid + msg;
}

process.on('message', msg => {	
    log4js.MyError("========> msg " + msg + '   process.pid ' + process.pid); // 子进程id	
    const sum = test(msg);
    // 如果Node.js进程是通过进程间通信产生的，那么，process.send()方法可以用来给父进程发送消息	
    process.send(sum);	
})


