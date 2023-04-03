const fs = require('fs');
const log4js = require('./log_utils.js'); // 引入库
const crypto = require('crypto');

var exg = new RegExp('^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$');

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
            let obj=JSON.parse(str);
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

function isBase64Str(str)
{
    return exg.test(str);
}

// 获取当前时间戳
function getCurrentTimeStamp()
{
    return Math.floor(Date.now() / 1000);
}

function str_encode(str)
{
    // 定义密钥 36个字母与数字　顺序可以打乱
    var key = "0123456789ABCDEFGHIJKLMNOPQRS$UVWXY*";

    var key_len = key.length;  //获取密钥的长度
    var a = key.split("");  //把密钥字符串转换为字符数组

    var s = "", b, b1, b2, b3;  //定义临时变量

    for (var i = 0; i <str.length; i ++) {  //遍历字符串
        b = str.charCodeAt(i);  //逐个提取每个字符，并获取Unicode编码值

        b1 = b % key_len;  //求Unicode编码值得余数
        b = (b - b1) / key_len;  //求最大倍数
        b2 = b % key_len;  //求最大倍数的于是
        b = (b - b2) / key_len;  //求最大倍数
        b3 = b % key_len;  //求最大倍数的余数

        s += a[b3] + a[b2] + a[b1];  //根据余数值映射到密钥中对应下标位置的字符
    }

    return s;  //返回这些映射的字符
}

function str_decode(str)
{
    //定义密钥，36个字母和数字
    let key = "0123456789ABCDEFGHIJKLMNOPQRS$UVWXY*";
    let key_len = key.length;  //获取密钥的长度 
    let b1, b2, b3; //定义临时变量
    let d = 0;  
    let str_arr  = new Array(Math.floor(str.length / 3));  //计算加密字符串包含的字符数，并定义数组
    let str_len = str_arr.length;  //获取数组的长度
    for (let i = 0; i < str_len; i ++) {  //以数组的长度循环次数，遍历加密字符串
        b1 = key.indexOf(str.charAt(d));  //截取周期内第一个字符串，计算在密钥中的下标值
        d ++;
        b2 = key.indexOf(str.charAt(d));  //截取周期内第二个字符串，计算在密钥中的下标值
        d ++;
        b3 = key.indexOf(str.charAt(d));  //截取周期内第三个字符串，计算在密钥中的下标值
        d ++;
        str_arr[i] = b1 * key_len * key_len + b2 * key_len + b3  //利用下标值，反推被加密字符的Unicode编码值
    }

    //console.log(str_len);

    let max_num = 10450;
    let decode_str = "";

    if (str_len >= max_num) {
        //str_arr = str_arr.slice(0, 1024 * 10 - 1);

        let the_index = 0;

        let tmp_arr = null;
        let tmp_str = "";

        let start_index = 0;
        let end_index = 0;

        let need_break = false;

        while (the_index < str_len) {

            start_index = the_index;
            end_index = the_index + max_num;

            if (end_index > str_len) {
                end_index = str_len;       
            }

            //console.log("--> %d %d " , start_index,  end_index);
            tmp_arr = str_arr.slice(the_index, end_index);
            tmp_str = eval("String.fromCharCode(" + tmp_arr.join(',') + ")");
            decode_str += tmp_str;

            the_index += max_num;
        }
    }
    else {
        decode_str = eval("String.fromCharCode(" + str_arr.join(',') + ")");//用fromCharCode()算出字符串
    }

    return decode_str ;  //返回被解密的字符串
}


function enCode(str) 
{  
    //return str_encode(str);

    return aes_encode(str);
} 

function deCode(str) 
{
    //return str_decode(str);

    return aes_decode(str);
}

/**
 * aes加密
 * @param data 待加密内容
 * @param key 必须为16位私钥
 * @returns {string}
 */
function aes_encode(data, key = "f6230d560ff6d1b7", iv = null) 
{
    if (typeof(data) != 'string') {
        console.log(" encryption not string data  = " + data);
        return "";
    }

    try {
        iv = iv || "";
        var clearEncoding = 'utf8';
        var cipherEncoding = 'base64';
        var cipherChunks = [];
        var cipher = crypto.createCipheriv('aes-128-ecb', key, iv);
        cipher.setAutoPadding(true);
        cipherChunks.push(cipher.update(data, clearEncoding, cipherEncoding));
        cipherChunks.push(cipher.final(cipherEncoding));
        return cipherChunks.join('');
    }
    catch (e) {
        console.log(" encryption data error e = " + e + " data = " + data);
        return "";
    }
}

/**
 * aes解密
 * @param data 待解密内容
 * @param key 必须为16位私钥
 * @returns {string}
 */
function aes_decode(data, key = "f6230d560ff6d1b7", iv = null) 
{
    if (typeof(data) != 'string') {
        console.log(" decryption not string data  = " + data);
        return "";
    }

    if (!data) {
        return "";
    }

    try {
        iv = iv || "";
        var clearEncoding = 'utf8';
        var cipherEncoding = 'base64';
        var cipherChunks = [];
        var decipher = crypto.createDecipheriv('aes-128-ecb', key, iv);
        decipher.setAutoPadding(true);
        cipherChunks.push(decipher.update(data, cipherEncoding, clearEncoding));
        cipherChunks.push(decipher.final(clearEncoding));
        return cipherChunks.join('');
    }
    catch(e) {
        console.log(" decryption data error e = " + e + " data = " + data);
        return "";
    }
}

module.exports = {
    computation,    
    loadjson,
    converToUrl,
    strToJson,
    isBase64Str,
    getCurrentTimeStamp,
    enCode,
    deCode,
    aes_encode,
    aes_decode
};