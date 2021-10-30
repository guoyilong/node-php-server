/*
文件名：log_utils.js
对log4js的简单封装
实践：不同的模块使用不同的日志文件，配置在configure进行。
使用时，调用getLogger获取不同的appender，写入不同的日志文件。
将日志写入文件，然后使用tail -f xx.txt可实时查看，即使进行备份，也不影响
知识点：
每天备份：pattern为.yyyy-MM-dd.txt
每小时：pattern为.yyyy-MM-dd-mm.txt

*/
const log4js = require('log4js');


log4js.configure(
{
  appenders:
  {
    console:
    {
        type: 'console',
    },
    datelog:
    {
        type: 'dateFile',
        filename: "logs/server",
        pattern: "yyyy_MM_dd.txt",
        absolute: false,
        alwaysIncludePattern: true,
        // maxLogSize: 10, // 无效
        // backups: 5, // 无效
        compress: true,
        daysToKeep: 10,
    },
    datelog2:
    {
        type: 'dateFile',
        filename: "logs/error",
        pattern: "yyyy_MM_dd.txt",
        absolute: false,
        alwaysIncludePattern: true,
        // maxLogSize: 10, // 无效
        // backups: 5, // 无效
        compress: true,
        daysToKeep: 10,
    },
    // more...
  },
  categories:
  {
      default:
      {
          appenders: ['console'],
          level: 'debug',
      },
      datelog:
      {
          // 指定为上面定义的appender，如果不指定，无法写入
          appenders: ['console', 'datelog'],
          level: 'debug', // 指定等级
      },
      datelog2:
      {
          appenders: ['console', 'datelog2'],
          level: 'debug',
      },
      // more...
  },
  
  // for pm2...
  pm2: true,
  disableClustering: true, // not sure...
}
);


function getLogger(type)
{
    return log4js.getLogger(type);
}

var debug_logger = null;
var error_logger = null;

function init()
{
    //console.log("-------->");
    if (debug_logger == null) {
        //console.log("====> init logger");
        debug_logger = log4js.getLogger('datelog');
    }

    if (error_logger == null) {
        //console.log("====> init error logger");
        error_logger = log4js.getLogger('datelog2');
    }
}

init();

// 支持可变参数　比如　log4js.MyDebug("ssss ==> %s ==> %s ==> %s", 1, 2, ttmp, 1, 3, 3, 3);
function MyDebug(str)
{
    if (debug_logger == null) {
        //console.log("====> second init logger");
        debug_logger = log4js.getLogger('datelog');
    }

    var param_len = arguments.length;
    if (param_len > 1) {
        var tmp_len = param_len - 1;
        var tmp_str = str;
        for (var i = 0; i < tmp_len; i++) {
            if (tmp_str.indexOf('%s') > 0) {

                if (typeof(arguments[i + 1]) == 'object') {
                    var json_str = JSON.stringify(arguments[i + 1]);

                    tmp_str = tmp_str.replace('%s', json_str);
                }
                else {
                    tmp_str = tmp_str.replace('%s', arguments[i + 1]);
                }
            }
        }
        str = tmp_str;
    }

    debug_logger.debug("MyDeug " + str);
}

function MyError(str)
{
    if (error_logger == null) {
        console.log("====> second init error logger");
        error_logger = log4js.getLogger('datelog2');
    }

    var param_len = arguments.length;
    if (param_len > 1) {
        var tmp_len = param_len - 1;
        var tmp_str = str;
        for (var i = 0; i < tmp_len; i++) {
            if (tmp_str.indexOf('%s') > 0) {

                if (typeof(arguments[i + 1]) == 'object') {
                    var json_str = JSON.stringify(arguments[i + 1]);

                    tmp_str = tmp_str.replace('%s', json_str);
                }
                else {
                    tmp_str = tmp_str.replace('%s', arguments[i + 1]);
                }
            }
        }
        str = tmp_str;
    }

    error_logger.error("MyError " + str);
}

// 支持可变参数　比如　log4js.MyWarn("ssss ==> %s ==> %s ==> %s", 1, 2, ttmp, 1, 3, 3, 3);
function MyWarn(str)
{
    if (debug_logger == null) {
        //console.log("====> second init logger");
        debug_logger = log4js.getLogger('datelog');
    }

    var param_len = arguments.length;
    if (param_len > 1) {
        var tmp_len = param_len - 1;
        var tmp_str = str;
        for (var i = 0; i < tmp_len; i++) {
            if (tmp_str.indexOf('%s') > 0) {

                if (typeof(arguments[i + 1]) == 'object') {
                    var json_str = JSON.stringify(arguments[i + 1]);

                    tmp_str = tmp_str.replace('%s', json_str);
                }
                else {
                    tmp_str = tmp_str.replace('%s', arguments[i + 1]);
                }
            }
        }
        str = tmp_str;
    }

    debug_logger.warn("MyDeug " + str);
}

module.exports = {
    getLogger,
    MyDebug,
    MyError,
    MyWarn
}

