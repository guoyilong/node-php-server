/*
//引入组件
var crypto = require('crypto');

const key = Buffer.from("e43ee68382dc550fbd1d329486febdd4", "hex");
const iv = Buffer.from("ddffc44a93503156abb36e9bbca876f8", "hex");

//加密
var aesEncrypt = function (data, secretKey, bufIv) 
{
  var cipher = crypto.createCipheriv('aes-128-cbc', secretKey, bufIv);
  cipher.setAutoPadding(false);
  let cText = cipher.update(data, "utf-8", "hex");
  cText += cipher.final("hex");
  return cText;
}

//解密
var aesDecrypt = function (data, secretKey, bufIv) 
{
    const decipher = crypto.createDecipheriv('aes-128-cbc', secretKey, bufIv);
    decipher.setAutoPadding(false);
    let dText = decipher.update(data, "hex", "utf-8");
    dText += decipher.final("utf8");
    return dText;
}

let password = "guoyilongedueee";

//var bufIn = Buffer.from("140000000A0B10C408280430F29295F40A12050802189C010000000000000000",'hex');

var data = Buffer.alloc(1024);
data.fill(0);

var str = "guoyilongtest";

data.write("guoyilongtest", 0, str.length);

function stringToHex(str) {

    //converting string into buffer
     let bufStr = Buffer.from(str, 'utf8');
  
    //with buffer, you can convert it into hex with following code
     return bufStr.toString('hex');
  
     }
  
 var tt =  stringToHex('guoyilongtest'); 

 console.log("tt " + tt);

 var bufIn = Buffer.from(tt, 'hex');


//var bufIn = data.slice(0, str.length);

//bufIn = stringToHex("guoyilongtest");

//var bufIn = Buffer.from( Buffer.from(password).toString('hex'), 'hex');

console.log("====> bufIn = " + bufIn)

    //解密（传入已加密的密码和自定义的解密key）
var db_password = aesEncrypt(bufIn, key, iv);

console.log("====> " + db_password);

    //加密（传入需要加密的密码和自定义的加密key）
var new_password = aesDecrypt(db_password, key, iv);

console.log("====> " + new_password);
*/

var crypto = require('crypto');

var aesutil = module.exports = {};

/**
 * aes加密
 * @param data 待加密内容
 * @param key 必须为32位私钥
 * @returns {string}
 */
var encryption = function (data, key = "f6230d560ff6d1b7", iv = null) 
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
 * @param key 必须为32位私钥
 * @returns {string}
 */
var decryption = function (data, key = "f6230d560ff6d1b7", iv = null) {

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

var toBin = (n) => {
    if(n == 0) return '0';
    var res = '';
    while(n != 0) {
        res = n % 2 + res
        n = parseInt(n / 2)
     }
     return res;
  }

const key = Buffer.from("e43ee68382dc550fbd1d329486febdd4", "hex");
const iv = Buffer.from("16", "hex");

console.log("iv = " + toBin(16));

var bufIv = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);


//var tmp = encryption("中国人O-(///￣皿￣)☞ ─═≡☆゜★█▇▆▅▄▃▂_guosyilwieieiie∩▂∩　∩0∩　∩^∩　∩ω∩　∩﹏∩　∩△∩　∩▽∩ˊˋ ˇ▂ˇ　ˇ0ˇ　ˇ^ˇ　ˇωˇ　ˇ﹏ˇ　ˇ△ˇ");

var the_key = Buffer.from('guoyilon', 'utf8').toString('hex');

console.log("墅🖐");

var tmp = encryption("墅🖐", the_key);

console.log(tmp);

//tmp = "ssssssseeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

var tt = decryption(tmp, the_key);

console.log(tt);

var dd =  Buffer.from('guoyilon11111', 'utf8').toString('hex');

console.log(" dd = " + dd);

const myUtil = require('../lib/util');

var tt1 = myUtil.enCode("ddddddddddddd&&&&&&&&&&&&");

console.log("===> " + tt1);

var tt2 = myUtil.deCode(tt1);

console.log("===> " + tt2);

var tb = {};
    tb.user_id = 1000;
    tb.cmd = 101;
    tb.msg = encodeURIComponent("ddddddddddddd&&&&&&&&&&&&中国人weeeeeeeeeeeeee");

    tb_str = JSON.stringify(tb);
    tb_str = myUtil.enCode(tb_str);

console.log(" tb_str = " + tb_str);

var dd2 = myUtil.deCode(tb_str);

console.log(" dd2 = " + dd2);

let send_php_msg = "test.php" + myUtil.converToUrl(tb);

//var dd = encodeURIComponent(send_php_msg);

console.log(dd);

var zlib = require("zlib");
const { resolve } = require('path');
const { rejects } = require('assert');
var input = '//////////////////////////////++++++++++++++++++、、、、、、、、、、、\\\\\\\\\\\\\\\\\\\\\\\\\\\\苏南大叔的博客叫做苏南大叔写代码-O-(///￣皿￣)☞ ─═≡☆゜★█▇▆▅▄▃▂-----------3333333333333333333333333333333333eeeeeeeeeeeeeeeeeeeeeeeeeeeeewwwwwwwwwwwwwwwwwww3333333333---------UUUUU';

zlib.deflate(input, function(err, buffer) {
    if (!err) {
      console.log("deflate (%s): ", buffer.length, buffer.toString('base64'));

      var tmp_buff = Buffer.from('eJzT1kYHjxsa8aMYFPCiu/9p7/SnS5Y/7Z/yfFbL095ZT9ctetq/+mnjLGSpp20zn+xe/HxBo66/roa+vv77/Yufz9oPJDUfzZin8GhKw6OpEx51Lnw0o+1x05xHM1ofTet4NK390bS2R9OA7JZH05ofTWvSRQBjgiAVHyjHBAidcEtCQQAjgEZDCC2EAFQoCc4=', 'base64');

      zlib.inflate(tmp_buff, function(err, buffer) {
        if (!err) {
          console.log("inflate (%s): ", buffer.length, buffer.toString());
        }
      });
      zlib.unzip(buffer, function(err, buffer) {
        if (!err) {
          console.log("unzip deflate (%s): ", buffer.length, buffer.toString());
        }
      });
    }
  });

 function to_compress(input) {
    return new Promise((resolved, rejected) => {
        zlib.deflate(input, function(err, buffer) {
            if (!err) {
                resolved(buffer.toString('base64'));
            }
            else {
                rejected(false);
            }
        });
    });
  }

  // await方式
async function to_compress_getdata (input) {
	var val = await to_compress(input);
	console.log("======> " + val);
	return val;
}

  
data = to_compress_getdata(input);
  console.log(" data = " + data);

function to_compress_getdata_then (input) {
	var val = to_compress(input).then((data) => {
         console.log(" ====> 11 " + data);
         return data;   
    });

    return val;
}

data1 = to_compress_getdata_then(input);

console.log(" data1 = " + data1);

var tmp_str = 
"X-Powered-By: PHP/5.3.19\r\nHEADER_USER_ID:123456\r\nContent-type: text/html";

Buffer.poolSize = 1024 * 1024 * 3;


console.log(" tmp_str = " + tmp_str);

console.log(" poolsize =  " + Buffer.poolSize);

var the_buf = Buffer.allocUnsafe(3062);
the_buf.fill(0);

the_buf.writeUIntBE(3058, 0, 4);

var tmp_num = the_buf.readUIntBE(0, 4);

console.log("=================> " + tmp_num);

var tmp_buff = Buffer.from(the_buf);

var tmp_num = tmp_buff.readUIntBE(0, 4);

console.log("=================> " + tmp_num);





 