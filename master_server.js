const http = require('http');	
var util = require("util");
const fork = require('child_process').fork;
const cpus = require('os').cpus();

var cluster = require('cluster');

// 1 引入模块
const net = require('net');

const log4js = require('./lib/log_utils.js'); // 引入库

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
}	

for (let i=0; i< config_data.worker_num; i++) {	
    createWorker();	
}


log4js.MyDebug(" process_num " + Object.keys(work_process_manager.workers_map).length);
log4js.MyDebug(" workers_map_index = %s ", JSON.stringify(work_process_manager.workers_map_index));

function waitMsgFromWorker(the_worker, worker_index, msg, client_id, cur_msg_index)
{
    log4js.MyDebug(" waitMsgToWorker now to user worker pid = " + the_worker.pid + " client id = " + client_id);

    the_worker.once('message', result_json => {
        log4js.MyDebug(" send msg = " + msg  + " result = " + result_json + " pid = " + the_worker.pid + " client id = " + client_id);

        var ret_json_tb = JSON.parse(result_json);
        if (ret_json_tb['msg_index'] != cur_msg_index) {
            log4js.MyError(" not my msg my msg = %s ret msg = %s ", msg, ret_json_tb['msg']);
            waitMsgFromWorker(the_worker, worker_index, msg, client_id, cur_msg_index);
            
            return;
        }

        the_worker.cur_process_num -= 1;
        
        client = clientArr[client_id];
        if (client != null) {
            client.write("result is " + result_json + " pid " + the_worker.pid);
        }

        // 检查该进程　
        if (work_process_manager.msg_queue_arr.hasOwnProperty(worker_index) == true && work_process_manager.msg_queue_arr[worker_index].length > 0) {

            // 说明有客户端的消息　在消息队列中　堆集 这时得顺序处理
            var msg_obj = work_process_manager.msg_queue_arr[worker_index].shift();

            log4js.MyError(" worker index = %s msg obj = %s left len = %s ", worker_index, JSON.stringify(msg_obj), work_process_manager.msg_queue_arr[worker_index].length);

            next_client_id = msg_obj.client_id;
            next_msg = msg_obj.msg;

            sendMsgToWorker(the_worker, worker_index, next_msg, next_client_id);
        }
    });	

    log4js.MyError("waitMsgToWorker sssssssssssssssssssssssssss===> test");
}

function sendMsgToWorker(the_worker, worker_index, msg, client_id)
{
    log4js.MyDebug(" now to user worker pid = " + the_worker.pid + " client id = " + client_id);

    the_worker.send_msg_index += 1;
    var msg_tb = {};
    msg_tb.msg = msg;
    msg_tb.msg_index = the_worker.send_msg_index;

    the_worker.send(JSON.stringify(msg_tb)); 
    the_worker.cur_process_num += 1;
    
    the_worker.once('message', result_json => {
        log4js.MyDebug(" send msg = " + msg  + " result = " + result_json + " pid = " + the_worker.pid + " client id = " + client_id + " msg_index = " + msg_tb.msg_index);

        var ret_json_tb = JSON.parse(result_json);
        if (ret_json_tb['msg_index'] != msg_tb.msg_index) {
            log4js.MyError(" not my msg my msg = %s ret msg = %s  ret_msg_inde = %s cur_msg_index = %s", msg, ret_json_tb['msg'], ret_json_tb['msg_index'], msg_tb.msg_index);
            
            waitMsgFromWorker(the_worker, worker_index, msg, client_id, msg_tb.msg_index);
            return;
        }

        the_worker.cur_process_num -= 1;
        
        client = clientArr[client_id];
        if (client != null) {
            client.write("result is " + result_json + " pid " + the_worker.pid);
        }

        // 检查该进程　
        if (work_process_manager.msg_queue_arr.hasOwnProperty(worker_index) == true && work_process_manager.msg_queue_arr[worker_index].length > 0) {

            // 说明有客户端的消息　在消息队列中　堆集 这时得顺序处理
            var msg_obj = work_process_manager.msg_queue_arr[worker_index].shift();

            log4js.MyError(" worker index = %s msg obj = %s left len = %s ", worker_index, JSON.stringify(msg_obj), work_process_manager.msg_queue_arr[worker_index].length);

            next_client_id = msg_obj.client_id;
            next_msg = msg_obj.msg;

            sendMsgToWorker(the_worker, worker_index, next_msg, next_client_id);
        }
    });	

    log4js.MyError("sssssssssssssssssssssssssss===> test");
    
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

        // 如果该子进程　已经有消息在处理 则需要把当前消息加到消息队列之中
        if (the_worker.cur_process_num >= config_data.php_connect_num) {
            var msg_obj = {};
            msg_obj.client_id = client_id;
            msg_obj.msg = msg;

            log4js.MyWarn(" cur_process_num %s add msg to queue msg %s client_id %s", the_worker.cur_process_num, msg, client_id);

            if (work_process_manager.msg_queue_arr.hasOwnProperty(worker_index) == false) {
                work_process_manager.msg_queue_arr[worker_index] = [];
            }

            work_process_manager.msg_queue_arr[worker_index].push(msg_obj);

            log4js.MyError(" worker index %s now queue length %s ", worker_index, work_process_manager.msg_queue_arr[worker_index].length);
            return;
        }

        sendMsgToWorker(the_worker, worker_index, msg, client_id);
    }
}

//workers[0].send('sssss');
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
        
        //log4js.MyDebug(" ===> offset = " + offset + " msg_len = " + msg_len);

        var msg_json_str = buf.slice(offset, offset + msg_len);
        log4js.MyDebug("user_id =  " + user_id + " msg_len = " + msg_len + " offset " + offset +  " json_str = " + msg_json_str);

        let msg_tb = myUtil.strToJson(msg_json_str.toString());
        if (typeof(msg_tb) != 'object') {
            let tmp_ret_msg_tb = {};
            tmp_ret_msg_tb.error = "str can not to json";
            //tmp_ret_msg_tb.msg_json_str = msg_json_str;
            client.write(JSON.stringify(tmp_ret_msg_tb));
            return;
        }

        log4js.MyDebug(" recv msg   user_id = " + msg_tb.user_id + " cmd = " + msg_tb.cmd + " msg = " + msg_tb.msg);

        var cmd = msg_tb.cmd;
        var msg = msg_tb.msg;

        console.log('free ' + os.freemem() / kb + 'kb\r\n');

        if (cmd == 101) {
            doLogic(msg, client.id);
        }
        else {

            if (cmd == 102) {

                myUtil.computation();

                for (let i in clientArr) {
                    the_client = clientArr[i];
                    // 自己当前的的连接不发 为空的连接不发
                    if (the_client == null || the_client.id == client.id) {
                        continue;
                    }
                    console.log(" client id = " + the_client.id);
                    the_client.write(" from client " + client.id + " msg = " + msg);
                }
            }

            client.write("send broadcast ====>");

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

server.listen(config_data.server_port, config_data.server_ip, () => {
    log4js.MyDebug('打开服务器 %s', server.address());
});


