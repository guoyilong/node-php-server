const http = require('http');	
var util = require("util");
const fork = require('child_process').fork;
const cpus = require('os').cpus();

// 1 引入模块
const net = require('net');

const log4js = require('./lib/log_utils.js'); // 引入库
const lib_util = require('./lib/util');

os = require('os');
var kb = 1024;

console.log('free ' + os.freemem() / kb + 'kb\r\n');

global.do_logic_num = 0;

// 读取配置文件
const myUtil = require('./lib/util');
const config_data = myUtil.loadjson('./config/config.json');
log4js.MyDebug(" load config success server ip = %s port = %s worker_num = %s ", config_data.server_ip, config_data.server_port, config_data.worker_num);


// 2 创建服务器
let clientArr = [];
const server = net.createServer();

const broad_cast_server = net.createServer();

const work_process_manager = {};

work_process_manager.process_num = 0;
work_process_manager.workers_map = {};
work_process_manager.workers_map_index = [];
work_process_manager.msg_queue_arr = {};

function getIndexByPid(pid)
{
    var the_index = -1;
    for (var i = 0; i < work_process_manager.workers_map_index.length; i++) {
        if (work_process_manager.workers_map_index[i] == pid) {
            the_index = i;
            break;
        }
    }
    return the_index;
}

// 某一个子进程关闭　新建一个子进程　替换原来的子进程　继续提供分发服务
function replaceOldWorker(oldPid) {

    // 找到旧的子进程　对应的编号　
    var old_index = getIndexByPid(oldPid);

    if (old_index >= 0) {
        const compute = fork('./php_worker.js');	
        compute.has_close = false;
        // 当一个子进程使用 process.send() 发送消息时会触发 'message' 事件	

        // 子进程监听到一些错误消息退出	
        compute.on('close', (code, signal) => {	

            var the_pid = compute.pid;

            log4js.MyError(` 第二次 收到close事件，子进程收到信号 ${signal} 而终止，退出码 ${code}　oldIndex ${old_index}`);	

            if (compute.has_close == true) {
                log4js.MyError(" this worker has close pid = %s ", the_pid);
                return;
            }
            compute.has_close = true;
            compute.kill();	
        
            delete work_process_manager.workers_map[the_pid];
            work_process_manager.process_num -= 1;

            replaceOldWorker(the_pid);
        });	


        compute.on('error', (err) => {	

            var the_pid = compute.pid;
    
            log4js.MyError(`收到error事件，error msg  ${err.message} 而终止，退出`);	
    
            if (compute.has_close == true) {
                log4js.MyError(" this worker has close pid = %s ", the_pid);
                return;
            }
            compute.has_close = true;
            compute.kill();	
        
            delete work_process_manager.workers_map[the_pid];
            work_process_manager.process_num -= 1;
    
            // 马上补上一个工作字进程　
            replaceOldWorker(the_pid);
        });	
    
        compute.on('exit', (code, signal) => {	
    
            var the_pid = compute.pid;
    
            log4js.MyError(`收到exit事件，子进程收到信号 ${signal} 而终止，退出码 ${code}`);
            
            if (compute.has_close == true) {
                log4js.MyError(" this worker has close pid = %s ", the_pid);
                return;
            }
            compute.has_close = true;
            compute.kill();	
        
            delete work_process_manager.workers_map[the_pid];
            work_process_manager.process_num -= 1;
    
            // 马上补上一个工作字进程　
            replaceOldWorker(the_pid);
        });	
    
        compute.on('disconnect', () => {	
    
            var the_pid = compute.pid;
    
            log4js.MyError(`收到disconnect事件，子进程收到信号`);	
    
            if (compute.has_close == true) {
                log4js.MyError(" this worker has close pid = %s ", the_pid);
                return;
            }
            compute.has_close = true;
            compute.kill();	
        
            delete work_process_manager.workers_map[the_pid];
            work_process_manager.process_num -= 1;
    
            // 马上补上一个工作字进程　
            replaceOldWorker(the_pid);
        });	

        
        compute.isInUse = false;
        compute.cur_process_num = 0;
        compute.send_msg_index = 0;
        work_process_manager.workers_map[compute.pid] = compute;
        work_process_manager.process_num += 1;
        // 直接替换成原来的编号即可　保证工作子进程的数量　始终保持不变
        work_process_manager.workers_map_index[old_index] = compute.pid;

        log4js.MyDebug(' replac old worker process created, newPid: %s ppid: %s oldPid: %s old_index: %s', compute.pid, process.pid, oldPid, old_index);
    }
}

const createWorker = () => {	
    const compute = fork('./php_worker.js');	

    compute.has_close = false;

    // 当一个子进程使用 process.send() 发送消息时会触发 'message' 事件	

    // 子进程监听到一些错误消息退出	
    compute.on('close', (code, signal) => {	

        var the_pid = compute.pid;

        log4js.MyError(`收到close事件，子进程收到信号 ${signal} 而终止，退出码 ${code}`);	

        if (compute.has_close == true) {
            log4js.MyError(" this worker has close pid = %s ", the_pid);
            return;
        }

        compute.has_close = true;
        compute.kill();	
    
        delete work_process_manager.workers_map[the_pid];
        work_process_manager.process_num -= 1;

        // 马上补上一个工作字进程　
        replaceOldWorker(the_pid);
    });	

    compute.on('error', (err) => {	

        var the_pid = compute.pid;

        log4js.MyError(`收到error事件，error msg  ${err.message} 而终止，退出`);	

        if (compute.has_close == true) {
            log4js.MyError(" this worker has close pid = %s ", the_pid);
            return;
        }
        compute.has_close = true;

        compute.kill();	
    
        delete work_process_manager.workers_map[the_pid];
        work_process_manager.process_num -= 1;

        // 马上补上一个工作字进程　
        replaceOldWorker(the_pid);
    });	

    compute.on('exit', (code, signal) => {	

        var the_pid = compute.pid;

        log4js.MyError(`收到exit事件，子进程收到信号 ${signal} 而终止，退出码 ${code}`);
        
        if (compute.has_close == true) {
            log4js.MyError(" this worker has close pid = %s ", the_pid);
            return;
        }
        compute.has_close = true;
        
        compute.kill();	
    
        delete work_process_manager.workers_map[the_pid];
        work_process_manager.process_num -= 1;

        // 马上补上一个工作字进程　
        replaceOldWorker(the_pid);
    });	

    compute.on('disconnect', () => {	

        var the_pid = compute.pid;

        log4js.MyError(`收到disconnect事件，子进程收到信号`);	

        if (compute.has_close == true) {
            log4js.MyError(" this worker has close pid = %s ", the_pid);
            return;
        }
        compute.has_close = true;

        compute.kill();	
    
        delete work_process_manager.workers_map[the_pid];
        work_process_manager.process_num -= 1;

        // 马上补上一个工作字进程　
        replaceOldWorker(the_pid);
    });	
    
    compute.isInUse = false;
    compute.cur_process_num = 0;
    compute.send_msg_index = 0;
    work_process_manager.workers_map[compute.pid] = compute;
    work_process_manager.process_num += 1;
    work_process_manager.workers_map_index.push(compute.pid);

    log4js.MyDebug('worker process created, pid: %s ppid: %s', compute.pid, process.pid);

      // 有消息事件过来　根据内容转发给对应的客户端连接
    compute.on('message', result_json => {
        
        log4js.MyDebug("recv msg result_json = %s pid = %s", result_json, compute.pid);

        // 该进程　正在处理的消息数量　也得往下减
        if (compute.cur_process_num > 0) {
            compute.cur_process_num -= 1;
        }

        var ret_json_tb = JSON.parse(result_json);

        var the_msg_index = ret_json_tb['msg_index'];
        var the_client_id = ret_json_tb['client_id'];

        if (isNaN(the_msg_index) == true || isNaN(the_client_id) == true) {
            log4js.MyError(" not find msg_index or client_id ret_json = %s", result_json);
        }
        else {

            // todo 因为连接编号　可能被其他玩家的连接　替换　所以要检查玩家ID

            client = clientArr[the_client_id];
            if (client != null) {
                client.write("result is " + result_json + " pid " + compute.pid);
            }
            else {
                log4js.MyError(" this client has close connect client_id = %s ", the_client_id);
            }
        }

        // 找该进程对应的编号　因为消息队列　记录的是　每个子进程对应的编号
        var worker_index = getIndexByPid(compute.pid);
        
        // 检查该进程　
        if (work_process_manager.msg_queue_arr.hasOwnProperty(worker_index) == true && work_process_manager.msg_queue_arr[worker_index].length > 0) {

            // 说明有客户端的消息　在消息队列中　堆集 这时得顺序处理
            var msg_obj = work_process_manager.msg_queue_arr[worker_index].shift();

            log4js.MyError(" now get msg obj from queue worker index = %s msg obj = %s left len = %s ", worker_index, JSON.stringify(msg_obj), work_process_manager.msg_queue_arr[worker_index].length);

            next_client_id = msg_obj.client_id;
            next_msg = msg_obj.msg;

            sendMsgToWorker(compute, worker_index, next_msg, next_client_id);
        }

    });	
}	

for (let i=0; i< config_data.worker_num; i++) {	
    createWorker();	

    console.log('free 111 ' + os.freemem() / kb + 'kb\r\n');
}


log4js.MyDebug(" process_num " + Object.keys(work_process_manager.workers_map).length);
log4js.MyDebug(" workers_map_index = %s ", JSON.stringify(work_process_manager.workers_map_index));


function sendMsgToWorker(the_worker, worker_index, msg, client_id)
{
    log4js.MyDebug(" now to user worker pid = " + the_worker.pid + " client id = " + client_id);

    the_worker.send_msg_index += 1;
    var msg_tb = {};
    msg_tb.msg = msg;
    msg_tb.msg_index = the_worker.send_msg_index;
    msg_tb.client_id = client_id;

    the_worker.send(JSON.stringify(msg_tb)); 
    the_worker.cur_process_num += 1;
    
}

function doLogic(msg, client_id)
{
    var workers_num = work_process_manager.workers_map_index.length;

    // 不同的连接的编号　在不同工作子进程中处理　保证同一个连接过来的数据　在同一个工作子进程中处理　
    var cur_client_index = client_id;
    var worker_index = cur_client_index % workers_num;
    var worker_pid = work_process_manager.workers_map_index[worker_index];

    log4js.MyDebug(" doLogic client id %s workers_num %s worker_index %s worker_pid %s", client_id, workers_num, worker_index, worker_pid);

    if (work_process_manager.workers_map.hasOwnProperty(worker_pid)) {

        var the_worker = work_process_manager.workers_map[worker_pid];

        // 如果该子进程　已经有多条消息在处理　且处理的消息的数量　超出了子进程的同时处理消息的上限 则需要把当前消息加到消息队列之中
        if (the_worker.cur_process_num >= config_data.php_connect_num) {
            var msg_obj = {};
            msg_obj.client_id = client_id;
            msg_obj.msg = msg;

            log4js.MyWarn(" cur_process_num %s add msg to queue msg %s client_id %s", the_worker.cur_process_num, msg, client_id);

            if (work_process_manager.msg_queue_arr.hasOwnProperty(worker_index) == false) {
                work_process_manager.msg_queue_arr[worker_index] = [];
            }

            work_process_manager.msg_queue_arr[worker_index].push(msg_obj);

            log4js.MyWarn(" worker index %s now queue length %s ", worker_index, work_process_manager.msg_queue_arr[worker_index].length);
            return;
        }

        sendMsgToWorker(the_worker, worker_index, msg, client_id);
    }
}

var broad_cast_handler = function do_broad_cast(client, msg, callback) {
    log4js.MyDebug(" do_broad_cast ===> ");

    if (clientArr.length == 0) {
        return;
    }

    for (let i in clientArr) {
        the_client = clientArr[i];
        // 自己当前的的连接不发 为空的连接不发
        if (the_client == null) {
            continue;
        }
        //console.log(" client id = " + the_client.id);

        // 对所有的客户端连接进行广播　可以加上广播条件　有选择性的广播

        the_client.write(" from client from php "  + " msg = " + msg);
    }

    if (callback && typeof(callback) === "function") {
        callback();
    } 
}

// 处理消息
function doMsgException(client, logStr)
{
    log4js.MyError(logStr);

    let tmp_ret_msg_tb = {};
    tmp_ret_msg_tb.error = "not correct msg";
    //tmp_ret_msg_tb.msg_json_str = msg_json_str;
    client.write(JSON.stringify(tmp_ret_msg_tb));

    clientArr[client.id] = null;

    client.end();
    client.destroy();
}

// 检查每个连接的心跳是否超时，如果超时　则断开连接
function checkConnectHeartBeat()
{
    //log4js.MyDebug("checkConnectHeartBeat not to check connect heart beat");

    //lib_util.computation();
    //lib_util.computation();

    let cur_sec = lib_util.getCurrentTimeStamp();
    for (let index in clientArr) {
        if (clientArr[index] == null) {
            continue;
        }

        let gap_sec = cur_sec - clientArr[index].last_sec;

        // 如果30s 还没有收到该连接的消息　则需要断开连接
        if (gap_sec > 300) {

            log4js.MyError(" this client no message sent for a long time, now to close id = %s gapSec = %s", index, gap_sec);
        
            clientArr[index].end();
            clientArr[index].destroy();

            clientArr[index] = null;
        }
    }

    log4js.MyDebug(" %s ", "free 111 " + (os.freemem() / kb) + "kb");
}

// 每10s 检查一次　连接心跳
setInterval(checkConnectHeartBeat, 100 * 1000);

// 3 绑定链接事件
server.on('connection', (client)=> {
    log4js.MyDebug("remote address = " + client.remoteAddress + " port = " + client.remotePort + " length = " + clientArr.length);
    
    // 先找出空的位置　
    var allocate_index = -1;
    for (let index in clientArr) {
        if (clientArr[index] == null) {
            allocate_index = index;
            break;
        }
    }

    // 如果没有找到空闲的位置
    if (allocate_index < 0) {
        // 记录连接的进程
        client.id = clientArr.length;
        clientArr.push(client);
    }
    else {
        // 如果有空的位置　就分配到空的位置
        log4js.MyWarn("has allocate index " + allocate_index);
        client.id = allocate_index;
        clientArr[allocate_index] = client;
    }
    
    client.setEncoding('utf8');
    client.setNoDelay(true);

    // 客户socket进程绑定事件
    client.on('data',(msg)=>{

        log4js.MyDebug(" recv msg client id = " + client.id + " msg = " + msg + " length = " + msg.length);
        log4js.MyDebug(" ===> " + typeof(msg));

        if (lib_util.isBase64Str(msg) == false) {
            doMsgException(client, " error msg msg =" + msg + " now to close this client ");
            return;
        }

        var buf = Buffer.from(msg , 'base64');

        if (buf.length < 8) {
            doMsgException(client, " error msg buff length < 8 now to close this client ");
            return;
        }

        let offset = 0;
        var user_id = buf.readUIntBE(offset, 4);
        offset += 4;

        let msg_len = buf.readUIntBE(offset, 4);
        offset += 4;
        
        //log4js.MyDebug(" ===> offset = " + offset + " msg_len = " + msg_len);

        var msg_json_str = buf.slice(offset, offset + msg_len);
        log4js.MyDebug("user_id =  " + user_id + " msg_len = " + msg_len + " offset " + offset +  " json_str = " + msg_json_str);

        let msg_tb = myUtil.strToJson(msg_json_str.toString());
        if (typeof(msg_tb) != 'object') {
            doMsgException(client, " str can not to json msg_json_str  " + msg_json_str.toString());
            return;
        }

        log4js.MyDebug(" recv msg   user_id = " + msg_tb.user_id + " cmd = " + msg_tb.cmd + " msg = " + msg_tb.msg);

        var cmd = msg_tb.cmd;
        var msg = msg_tb.msg;

        console.log('free ' + os.freemem() / kb + 'kb\r\n');

        // 记录每个连接上次接收消息的时间戳　用来做心跳检测
        let curSec = lib_util.getCurrentTimeStamp();
        client.last_sec = curSec;

        if (cmd == 101) {
            doLogic(msg, client.id);
        }
        else {

            if (cmd == 102) {
            }
        }

    });

    client.on('close', (p1)=>{
        log4js.MyError(" client close connect  id = " + client.id);
        clientArr[client.id] = null;
    });

    client.on('error', (p1)=>{
        log4js.MyError(" client error id = " + client.id + " error msg = " + p1);
        clientArr[client.id] = null;
    })
})

broad_cast_server.on('connection', (client)=> {
    log4js.MyDebug("remote address = " + client.remoteAddress + " port = " + client.remotePort + " length = " + clientArr.length);
    
    client.setEncoding('utf8');

    // 客户socket进程绑定事件
    client.on('data',(msg)=>{

        log4js.MyDebug(" recv msg client id = " + client.id + " msg = " + msg + " length = " + msg.length);
        log4js.MyDebug(" ===> " + typeof(msg));

        var buf = Buffer.from(msg , 'base64');

        let offset = 0;
        var user_id = buf.readUIntBE(offset, 4);
        offset += 4;

        let msg_len = buf.readUIntBE(offset, 4);
        offset += 4;
        
        // 进行检验
        if (user_id != 66) {
            client.end();
            client.destroy();
            return;
        }

        var msg_json_str = buf.slice(offset, offset + msg_len);
        log4js.MyDebug("user_id =  " + user_id + " msg_len = " + msg_len + " offset " + offset +  " json_str = " + msg_json_str);

        let msg_tb = myUtil.strToJson(msg_json_str.toString());
        if (typeof(msg_tb) != 'object') {
            let tmp_ret_msg_tb = {};
            tmp_ret_msg_tb.error = "str can not to json";
            //tmp_ret_msg_tb.msg_json_str = msg_json_str;
            client.write(JSON.stringify(tmp_ret_msg_tb));
            client.end();
            client.destroy();
            return;
        }

        log4js.MyDebug(" recv msg   user_id = " + msg_tb.user_id + " cmd = " + msg_tb.cmd + " msg = " + msg_tb.msg);

        var cmd = msg_tb.cmd;
        var msg = msg_tb.msg;

        //console.log('free ' + os.freemem() / kb + 'kb\r\n');

        // 返回给php的消息
        client.write("send broadcast ====>");

        broad_cast_handler(client, msg, () => {
            console.log(" ====>　send broad cast finish");
        });

    });

    client.on('close', (p1)=>{
        log4js.MyError(" client close connect from php   ");
    });

    client.on('error', (p1)=>{
        log4js.MyError(" client from php error  "  + " error msg = " + p1);
    })
})


server.listen(config_data.server_port, config_data.server_ip, () => {
    log4js.MyDebug('打开服务器 %s', server.address());
});

broad_cast_server.listen(config_data.server_port + 1, config_data.server_ip, () => {
    log4js.MyDebug('打开服务器 %s', broad_cast_server.address());
});


