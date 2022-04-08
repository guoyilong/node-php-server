// 1 引入模块
const net = require('net');
const { exit } = require('process');
const readline = require('readline');

const myUtil = require('../lib/util');

//const { json } = require('stream/consumers');
// 2 创建套接字和输入输出命令行
let rl = readline.createInterface({
// 调用std接口
input:process.stdin,
output:process.stdout
});

var msg_cmd = {
    'do_login': 101,
    'logic_msg': 201
};


let client = new net.Socket();
// 3 链接
client.connect(443,'10.0.117.111');

client.setEncoding('utf8');
client.on('data',(chunk)=>{

    console.log("data = " + chunk);

    gapMsec = Date.now() - startMsec;
    console.error(" cost time msec = " + gapMsec);

    startMsec = Date.now();
})

client.on('error',(e)=>{
console.log(e.message);
})

client.on('close', (p1)=>{
    console.error(" client close connect  id = ");
    client.end();
    client.destroy();
    exit(1);
});

var buf = Buffer.alloc(1024 * 1024);

startMsec = Date.now();

//console.log(JSON.toString(process.argv));

var the_user_id = 121;
if (process.argv.length > 2) {
    the_user_id = process.argv[2];
    console.log(" the_user_id = " + the_user_id);
}

function sendLogin(the_user_id)
{
    buf.fill(0);
    var offset = 0;

    var tb = {};
    tb.user_id = the_user_id;
    tb.cmd = 101;
    tb.msg = "now to login";

    tb_str = JSON.stringify(tb);

    tb_str = myUtil.enCode(tb_str);

    console.log("send msg json = " + tb_str);

    buf.writeUIntBE(msg_cmd.do_login, 0, 4);
    offset += 4;

    buf.writeUIntBE(the_user_id, offset, 4);
    offset += 4;

    tb_str_len = tb_str.length;
    buf.writeUIntBE(tb_str_len, offset, 4);
    offset += 4;

    buf.write(tb_str, offset);
    offset += tb_str_len;

    //console.log(" ====> 111 " + tb_str_len.toString(16));

    console.log("===> send byte   " + offset);

    /*
    tmp_buff = buf.slice(0, offset);

    for (var i = 0; i < 12; i++) {
        let hex = (tmp_buff[i]).toString(16);
        if (hex.length === 1) {
            hex = '0' + hex;
        }
        hex = hex.toUpperCase();

        console.log("==1111=======> hexs = " + hex);
    }


    //console.log("=====> " + tmp_buff.toString('base64',0,offset));
    */

    // 发送
    startMsec = Date.now();
    //send_len = client.write(buf.slice(0, offset).toString('base64',0, offset));
    send_len = client.write(buf.slice(0, offset));
}

sendLogin(the_user_id);

// 绑定输io流事件,获取输入输出字符
rl.on('line',(mes)=>{
   
    if (mes == "quit") {
        client.end;
        client.destroy();
        exit();
    }

    buf.fill(0);
    var offset = 0;

    var tb = {};
    tb.user_id = the_user_id;
    tb.cmd = 101;
    tb.msg = mes;

    tb_str = JSON.stringify(tb);
    tb_str = myUtil.enCode(tb_str);

    console.log("send msg json = " + tb_str + " i_msg_cmd = " + msg_cmd.logic_msg);

    buf.writeUIntBE(msg_cmd.logic_msg, 0, 4);
    offset += 4;

    buf.writeUIntBE(the_user_id, offset, 4);
    offset += 4;

    tb_str_len = tb_str.length;
    buf.writeUIntBE(tb_str_len, offset, 4);
    offset += 4;

    buf.write(tb_str, offset);
    offset += tb_str_len;

    console.log(" ====> 111 " + tb_str_len.toString(16));

    console.log("===> send byte   " + offset);

    tmp_buff = buf.slice(0, offset);

    for (var i = 0; i < 12; i++) {
        let hex = (tmp_buff[i]).toString(16);
        if (hex.length === 1) {
            hex = '0' + hex;
        }
        hex = hex.toUpperCase();

        console.log("==1111=======> hexs = " + hex);
    }


    //console.log("=====> " + tmp_buff.toString('base64',0,offset));

    // 发送
    startMsec = Date.now();
    //send_len = client.write(buf.slice(0, offset).toString('base64',0, offset));

    send_len = client.write(buf.slice(0, offset));

    //console.log("send len = " + send_len);
     
})