// 1 引入模块
const net = require('net');
const { exit } = require('process');
const readline = require('readline');
// 2 创建套接字和输入输出命令行
let rl = readline.createInterface({
// 调用std接口
input:process.stdin,
output:process.stdout
})
let client = new net.Socket();
// 3 链接
client.connect(8090,'10.0.2.15');

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

var buf = Buffer.alloc(1024 * 1024);

startMsec = Date.now();

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
    tb.user_id = 121;
    tb.cmd = 101;
    tb.msg = mes;

    tb_str = JSON.stringify(tb);

    console.log("send msg json = " + tb_str);

    buf.writeUIntBE(121, 0, 4);
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
    send_len = client.write(buf.slice(0, offset).toString('base64',0, offset));

    //console.log("send len = " + send_len);
     
})