const log4js = require('./lib/log_utils.js'); // 引入库

const util = require('./lib/util');

var PHPFPM = require('node-phpfpm');

var __php_dirname = "/web/www/www/node/";

const config_data = util.loadjson("./config/config.json");

var php_connect_num = config_data.php_connect_num;

var php_connect_manager = {};
php_connect_manager.php_connect_arr = {};
php_connect_manager.use_status = {};

global.last_gc_time_msec = 0;

for (var i = 0; i < php_connect_num; i++) {
    var phpfpm = new PHPFPM(
    {
            host: config_data.php_fpm_ip,
            port: config_data.php_fpm_port,
            documentRoot: __php_dirname
    });

    phpfpm.record_id = i;

    php_connect_manager.php_connect_arr[i] = phpfpm;
    php_connect_manager.use_status[i] = 0;
}

function isJSON(str) {
    if (typeof str == 'string') {
        try {
            let obj=JSON.parse(str);
            if(typeof obj == 'object' && obj ){
                return true;
            }else{
                return false;
            }

        } catch(e) {
            log4js.MyError('error：'+str+'!!!'+e);
            return false;
        }
    }
    log4js.MyError('It is not a string!')
    return false;
}

console.log("start php worker pid = " + process.pid + " connect num =  " + php_connect_num);

function do_php_logic(json_msg)
{
    msg_tb = JSON.parse(json_msg);

    msg = msg_tb.msg;
    msg_index = msg_tb.msg_index
    let send_php_msg = "test.php" + util.converToUrl(msg_tb);

    log4js.MyDebug("do_php_logic now this process id = " + process.pid  + " in work" + " msg = " + msg + " msg_index = " + msg_index);
    log4js.MyDebug("do_php_logic send_php_msg = " + send_php_msg);

    // 找到空闲的php连接
    let select_index = -1;
    　
    for (let the_index in php_connect_manager.use_status) {
        let the_status = php_connect_manager.use_status[the_index];

        if (the_status == 0) {
            select_index = the_index;
            break;
        }
    }

    log4js.MyDebug("do_php_logic select index = %s", select_index);

    if (select_index >= 0) {
        let phpfpm = php_connect_manager.php_connect_arr[select_index];
        log4js.MyDebug("do_php_logic select index = %s now this php_connect in work record id = %s", select_index, phpfpm.record_id);
        php_connect_manager.use_status[select_index] = 1;
        phpfpm.run(send_php_msg, function(err, output, phpErrors)
        {
            if (err == 99) 
            {
                console.error('PHPFPM server error');
            }

            log4js.MyDebug("do_php_logic php ret msg = " + output);
            if (phpErrors) 
            {
                log4js.MyError("do_php_logic "+　phpErrors);

                php_connect_manager.use_status[select_index] = 0;

                let tmp_msg_tb = {};
                tmp_msg_tb.error = phpErrors;
                tmp_msg_tb.msg_index = msg_index;
                tmp_msg_tb.msg = msg;

                process.send(JSON.stringify(tmp_msg_tb));

                return;
            }
            else {

                let ret_fail = false;

                if (output.trim() == "") {
                    ret_fail = true;
                }
                else {
                   if (isJSON(output) == false) {
                       ret_fail = true;
                   }

                }

                if (ret_fail == true) {
                    php_connect_manager.use_status[select_index] = 0;

                    let tmp_msg_tb = {};
                    tmp_msg_tb.error = "php script error";
                    tmp_msg_tb.msg_index = msg_index;
                    tmp_msg_tb.msg = msg;

                    process.send(JSON.stringify(tmp_msg_tb));

                    return;
                }
            }

            php_connect_manager.use_status[select_index] = 0;
            process.send(output);
        });
    }
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

/**
 * 单位为字节格式为 MB 输出
 */
 const format = function (bytes) {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
};

/**
 * 封装 print 方法输出内存占用信息 
 */
const mem_print = function() {
    let memoryUsage = process.memoryUsage();

    log4js.MyError(" memory info = %s ", JSON.stringify({
        rss: format(memoryUsage.rss),
        heapTotal: format(memoryUsage.heapTotal),
        heapUsed: format(memoryUsage.heapUsed),
        external: format(memoryUsage.external),
        arrayBuffers: format(memoryUsage.arrayBuffers),
    }));

    memoryUsage = null;
}

// 检查每个连接的心跳是否超时，如果超时　则断开连接
function checkConnectHeartBeat()
{
    //log4js.MyDebug("checkConnectHeartBeat not to check connect heart beat");

    //lib_util.computation();
    //lib_util.computation();

    let cur_sec = util.getCurrentTimeStamp();

    if (global.last_gc_time_msec == 0) {
        global.last_gc_time_msec = cur_sec;
    }

    let gap_sec = cur_sec - global.last_gc_time_msec;
    if (gap_sec >= 300) {
        let mem = process.memoryUsage();
        let the_start_msec = Date.now();

        //heapdump.writeSnapshot(Date.now() + '.heapsnapshot');

        mem_print();

        global.gc();

        mem_print();

        let the_cost_msec = Date.now() - the_start_msec;
        log4js.MyError('phpWorker pid = %s memery,heapUsed %s M cost time = %s ms', process.pid, ((process.memoryUsage().heapUsed - mem.heapUsed)/1024/1024).toFixed(5), the_cost_msec);
        global.last_gc_time_msec = cur_sec;

        mem = null;
    }
}

process.on("exit", function() {
    console.log("phpWorker exit");
});

// 每10s 检查一次　连接心跳
setInterval(checkConnectHeartBeat, 100 * 1000);


