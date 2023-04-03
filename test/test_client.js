// 1 引入模块
const net = require('net');
const { exit } = require('process');
const readline = require('readline');

var zlib = require("zlib");

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
client.connect(543,'****');

// 不要这样用 会将buffer 转成utf8字符串 造成数据错乱 设置了 client on data data 就是字符串 如果不设就是 buffer   
//client.setEncoding('utf8');


//client.setRecvBufferSize(1024 * 1024); 
console.log(" -----> " + client.bytesRead);

var last_recv_msg = null;
var last_total_msg_len = 0;

function parase_msg(recv_msg) 
{
    let ret_tb = JSON.parse(recv_msg);

    let ret_msg = ret_tb['msg'];

    let tmp_tb = Buffer.from(ret_msg, 'base64');

    zlib.inflate(tmp_tb, function(err, buffer) {
        if (!err) {
            console.log("inflate (%s): ", buffer.length, buffer.toString());
        }
        else {
            console.log(" err = " + err);
        }
    });

    gapMsec = Date.now() - startMsec;
    console.error(" cost time msec = " + gapMsec);

    startMsec = Date.now();
}

client.on('data',(chunk)=>{

    //console.log(" type_of = " + typeof(chunk) + " " + chunk);
    console.log(" total len = " + chunk.length + " type of = " + typeof(chunk));

    if (last_recv_msg != null && last_total_msg_len > 0) {
       
        last_recv_msg = last_recv_msg + chunk;
        if (last_total_msg_len == last_recv_msg.length) {
            parase_msg(last_recv_msg);
            last_recv_msg = null;
            last_total_msg_len = 0;
            return;
        }

        // 如果还没接收完 继续接收
        if (last_total_msg_len > last_recv_msg.length) {
            console.log(" ==>-----> " + last_total_msg_len + " " + last_recv_msg.length);
        }

    }
    else {
        let offset = 0;

        console.log(" ===>  chunk = " + chunk);

        var tmp_buff = Buffer.from(chunk, 'utf8');

        console.log(" ===>  tmp_buff = " + tmp_buff);

        let ret_msg_len = tmp_buff.readUInt32BE(offset);
        offset += 4;

        console.log(" ret_msg_len =  " + ret_msg_len + " offset = " + offset);

        let recv_msg = tmp_buff.slice(offset, chunk.length);
        console.log(" ret_msg = " + recv_msg);

        if (ret_msg_len + 4 == chunk.length) {
            parase_msg(recv_msg);
        }

        // 如果数据包太大 被分包
        if (ret_msg_len + 4 > chunk.length) {
            last_recv_msg = recv_msg;
            last_total_msg_len = ret_msg_len;
        }
    }

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

function sendLogin(the_user_id)
{

    var login_tb = {};
    login_tb.user_id = the_user_id;
    login_tb.session_key = Buffer.from('guoyilon', 'utf8').toString('hex');
    login_tb.server_id = 1;

    var login_content = JSON.stringify(login_tb);

    to_compress(login_content).then((login_data_msg) => {
        
        buf.fill(0);
        var offset = 0;
    
        var tb = {};
        tb.user_id = the_user_id;
        tb.cmd = 101;
        tb.msg = login_data_msg;
    
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

    });

}

sendLogin(the_user_id);

// 绑定输io流事件,获取输入输出字符
rl.on('line',(mes)=>{
   
    if (mes == "quit") {
        client.end;
        client.destroy();
        exit();
    }


    var logic_tb = {};
    logic_tb.user_id = the_user_id;
    logic_tb.session_key = Buffer.from('guoyilon', 'utf8').toString('hex');
    logic_tb.server_id = 1;
    logic_tb.user_new_name = mes;

    var logic_content = JSON.stringify(logic_tb);

    to_compress(logic_content).then((logic_data_msg) => {
        buf.fill(0);
        var offset = 0;

        var tb = {};
        tb.user_id = the_user_id;
        tb.cmd = 101;
        tb.msg = logic_data_msg;

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

        //send_len = client.write(buf.slice(0, offset));

        //send_len = client.write(buf.slice(0, offset));

        //console.log("send len = " + send_len);

    });

})