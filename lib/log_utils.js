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
const { count } = require('console');
const log4js = require('log4js');
const util = require('util');

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
        pattern: "yyyy_MM_dd.log",

        // 自定义日志格式 2022-02-24 13:51:04 [DEBUG] [5338]
        layout: {
            type: "pattern",
            pattern: '%d{yyyy-MM-dd hh:mm:ss} [%p] [%z] %m'
        },

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
        pattern: "yyyy_MM_dd.log",

        // 自定义日志格式 2022-02-24 13:51:04 [DEBUG] [5338]
        layout: {
            type: "pattern",
            pattern: '%d{yyyy-MM-dd hh:mm:ss} [%p] [%z] %m'
        },

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
          // 指定为上面定义的appender，如果不指定，无法写入 console 代表是否输出到控制台　不填　则不用输出到控制台
          appenders: ['datelog'],
          level: 'debug', // 指定等级
      },
      datelog2:
      {
          appenders: ['datelog2'],
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
    //return;
    if (debug_logger == null) {
        console.log("====> second init logger");
        debug_logger = log4js.getLogger('datelog');
    }

    let param_len = arguments.length;
    if (param_len > 1) {
        let tmp_len = param_len - 1;
        let tmp_str = str;
        for (let i = 0; i < tmp_len; i++) {
            if (tmp_str.indexOf('%s') > 0) {

                if (typeof(arguments[i + 1]) == 'object') {
                    let json_str = JSON.stringify(arguments[i + 1]);

                    tmp_str = tmp_str.replace('%s', json_str);
                }
                else {
                    tmp_str = tmp_str.replace('%s', arguments[i + 1]);
                }
            }
        }
        str = tmp_str;
    }

    //console.trace("Here I am!");
    //var stack = new Error().stack
    //console.log(__filename);

    //let startMsec = Date.now();
    let func_str = getFuncAndLineNumStr();
    debug_logger.debug(func_str + " " + str);
    //let gapMsec = Date.now() - startMsec;
    //console.error(" cost time msec = " + gapMsec);

    //debug_logger.debug(e.stack);
}

function getFuncAndLineNumStr()
{
    let e = {};
    Error.captureStackTrace(e);
    //Object.defineProperty(e, 'stack', { enumerable: true });
    //console.log(JSON.stringify(e));

    let str_tb = e.stack.split('\n');

    let func_str = str_tb[3];

    let tmp_tb = func_str.split('/');
    let the_count = tmp_tb.length;

    let real_str = tmp_tb[the_count - 1];
    //console.log(real_str);
    //console.dir(tmp_tb);

    let str_len = real_str.length;
    let ret_str = real_str.substr(0, str_len - 1);

    e = null;

    return ret_str;
}

function MyError(str)
{
    if (error_logger == null) {
        console.log("====> second init error logger");
        error_logger = log4js.getLogger('datelog2');
    }

    let param_len = arguments.length;
    if (param_len > 1) {
        let tmp_len = param_len - 1;
        let tmp_str = str;
        for (let i = 0; i < tmp_len; i++) {
            if (tmp_str.indexOf('%s') > 0) {

                if (typeof(arguments[i + 1]) == 'object') {
                    let json_str = JSON.stringify(arguments[i + 1]);

                    tmp_str = tmp_str.replace('%s', json_str);
                }
                else {
                    tmp_str = tmp_str.replace('%s', arguments[i + 1]);
                }
            }
        }
        str = tmp_str;
    }

    //let startMsec = Date.now();
    let func_str = getFuncAndLineNumStr();
    error_logger.error(func_str + " " + str);
    //let gapMsec = Date.now() - startMsec;
    //console.error(" cost time msec = " + gapMsec);
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

    //let startMsec = Date.now();
    let func_str = getFuncAndLineNumStr();
    debug_logger.warn(func_str + " " + str);
    //let gapMsec = Date.now() - startMsec;
    //console.error(" cost time msec = " + gapMsec);
}

module.exports = {
    getLogger,
    MyDebug,
    MyError,
    MyWarn
}

