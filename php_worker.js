const log4js = require('./lib/log_utils.js'); // 引入库

const util = require('./lib/util');

var PHPFPM = require('node-phpfpm');

var __php_dirname = "/web/www/www/node/";

const config_data = util.loadjson("./config/config.json");

var php_connect_num = config_data.php_connect_num;

var php_connect_manager = {};
php_connect_manager.php_connect_arr = {};
php_connect_manager.use_status = {};

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
            var obj=JSON.parse(str);
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
    var send_php_msg = "test.php" + util.converToUrl(msg_tb);

    log4js.MyDebug("do_php_logic now this process id = " + process.pid  + " in work" + " msg = " + msg + " msg_index = " + msg_index);
    log4js.MyDebug("do_php_logic send_php_msg = " + send_php_msg);

    // 找到空闲的php连接
    var select_index = -1;
    　
    for (let the_index in php_connect_manager.use_status) {
        var the_status = php_connect_manager.use_status[the_index];

        if (the_status == 0) {
            select_index = the_index;
            break;
        }
    }

    log4js.MyDebug("do_php_logic select index = %s", select_index);

    if (select_index >= 0) {
        var phpfpm = php_connect_manager.php_connect_arr[select_index];
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

                tmp_msg_tb = {};
                tmp_msg_tb.error = phpErrors;
                tmp_msg_tb.msg_index = msg_index;
                tmp_msg_tb.msg = msg;

                process.send(JSON.stringify(tmp_msg_tb));

                return;
            }
            else {

                var ret_fail = false;

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

                    tmp_msg_tb = {};
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


