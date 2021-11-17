const fs = require('fs');
const log4js = require('./log_utils.js'); // 引入库

function loadjson(file_path)
{
    let rawdata = fs.readFileSync(file_path);
    let data = JSON.parse(rawdata);
    
    return data;
}

function computation()  
{	
    let sum = 0;	
    console.info('计算开始');	
    console.time('计算耗时');	
    for (let i = 0; i < 1e10; i++) {	
        sum += i	
    };	
    console.info('计算结束');	
    console.timeEnd('计算耗时');	
    return sum;	
}

const converToUrl = requestParams => {
    let params = [];
    Object.entries(requestParams).forEach(([key, value]) => {
        let param = key + '=' + value;
        params.push(param);
    });
    return '?' + params.join('&');
}

function strToJson(str) {
    log4js.MyDebug(" strToJson type = %s", typeof(str));
    if (typeof str == 'string') {
        try {
            var obj=JSON.parse(str);
            if(typeof obj == 'object' && obj ){
                return obj;
            }else{
                return false;
            }

        } catch(e) {
            log4js.MyError(' strToJson  error：' + str + ' error = ' + e);
            return false;
        }
    }
    log4js.MyError("strToJson It is not a string! type = %s ", typeof(str));
    return false;
}

module.exports = {
    computation,    
    loadjson,
    converToUrl,
    strToJson
};