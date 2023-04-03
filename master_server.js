const http = require('http');	
//var util = require("util");
const fork = require('child_process').fork;
const cpus = require('os').cpus();

// 1 引入模块
const net = require('net');

//const util = require('./lib/util');

//var heapdump = require('heapdump');

const log4js = require('./lib/log_utils.js'); // 引入库
const lib_util = require('./lib/util');

//os = require('os');
//var kb = 1024;

//console.log('free ' + os.freemem() / kb + 'kb\r\n');

// 配置读参数 
var config_json_name = "config.json";
if (process.argv.length > 2) {
    config_json_name = process.argv[2];
    console.log(" real_config_json_name  = " + config_json_name);
}

// 读取配置文件
const myUtil = require('./lib/util');
const ms = require('ms');
const config_data = myUtil.loadjson('./config/' + config_json_name);
log4js.MyDebug(" load config success server ip = %s port = %s worker_num = %s ", config_data.server_ip, config_data.server_port, config_data.worker_num);


// 2 创建服务器
var clientArr = [];
const server = net.createServer();

const broad_cast_server = net.createServer();

const work_process_manager = {};

global.last_gc_time_msec = 0;

work_process_manager.process_num = 0;
work_process_manager.workers_map = {};
work_process_manager.workers_map_index = [];
work_process_manager.msg_queue_arr = {};

function getIndexByPid(pid)
{
    let the_index = -1;
    for (let i = 0; i < work_process_manager.workers_map_index.length; i++) {
        if (work_process_manager.workers_map_index[i] == pid) {
            the_index = i;
            break;
        }
    }
    return the_index;
}

function getClient_WorkerIndex(client_id)
{
    let workers_num = work_process_manager.workers_map_index.length;

    let cur_client_index = client_id;
    let worker_index = cur_client_index % workers_num;
    return worker_index;
}

// 当进程替换时 　检查旧的进程是否还有消息堆积　如果有　得清空掉
// 该子进程　对应的所有客户端连接　都踢下线　重新登录 每个子进程　就像一组单独的服务器 服务器宕机了　肯定该服务器上的玩家　都得掉线
function checkIsHasStackMsg(worker_index)
{
    let user_arr = {};
    // 检查该进程　
    if (work_process_manager.msg_queue_arr.hasOwnProperty(worker_index) == true && work_process_manager.msg_queue_arr[worker_index].length > 0) {

        console.log(" ======>  " + JSON.stringify(work_process_manager.msg_queue_arr[worker_index]));

        let total_len = work_process_manager.msg_queue_arr[worker_index].length;
        for (let i = 0; i < total_len; i++) {
            // 说明有客户端的消息　在消息队列中　堆集 这时得顺序处理
            let msg_obj = work_process_manager.msg_queue_arr[worker_index].shift();

            log4js.MyError(" now get msg obj from queue worker index = %s msg obj = %s left len = %s ", worker_index, JSON.stringify(msg_obj), work_process_manager.msg_queue_arr[worker_index].length);

            let the_user_id = msg_obj.user_id;
            if (user_arr.hasOwnProperty(the_user_id) == true) {
                user_arr[the_user_id] += 1;
            }
            else {
                user_arr[the_user_id] = 1;
            }
        }

        log4js.MyError("checkIsHasStackMsg this user has msg in server not process user_arr =  %s", JSON.stringify(user_arr));
    }

    // 将该子进程对应的所有连接都踢下线
    for (let i in clientArr) {
        let the_client = clientArr[i];
        
        if (the_client == null) {
            continue;
        }

        let tmp_id = the_client.id;
        let the_worker_index = getClient_WorkerIndex(tmp_id);

        if (the_worker_index == worker_index) {
            doMsgException(the_client, "this worker process has dump ");
        }
    }
}

// 如果玩家已经在线　后面又有玩家登录　而且是同一玩家　这时　之前的玩家连接　得被踢掉
function checkOtherClientOnLine(the_user_id, client_id)
{
    for (let i in clientArr) {
        let the_client = clientArr[i];
        
        if (the_client == null) {
            continue;
        }

        let tmp_id = the_client.id;
        let tmp_user_id = the_client.bind_user_id;

        if (tmp_user_id == the_user_id && client_id != tmp_id) {
            doMsgException(the_client, "other client is login");
        }
    }
}

// 某一个子进程关闭　新建一个子进程　替换原来的子进程　继续提供分发服务
function replaceOldWorker(oldPid) {

    // 找到旧的子进程　对应的编号　
    var old_index = getIndexByPid(oldPid);

    if (old_index >= 0) {
        checkIsHasStackMsg(old_index);

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

            var i_msg_cmd = ret_json_tb['i_msg_cmd'];
            var the_user_id = ret_json_tb['user_id'];

            var need_send_to_client = true;
            // 检查必要的消息头　是否都存在　缺一不可
            if (isNaN(the_msg_index) == true || isNaN(the_client_id) == true || isNaN(i_msg_cmd) == true || isNaN(the_user_id) == true) {
                log4js.MyError(" not find msg_index or client_id ret_json = %s", result_json);
                need_send_to_client = false;
            }

            // 检查玩家ID 消息头　是否合法
            if (need_send_to_client == true) {
                if (the_user_id == 0 || checkMsgCmdIsLegal(i_msg_cmd) == false) {
                    log4js.MyError(" error user_id = %s or i_msg_cmd = %s ret_json", the_user_id, i_msg_cmd, result_json);
                    need_send_to_client = false;
                }
            }

            var client = null;

            // 检查连接是否存在
            if (need_send_to_client == true) {
                client = clientArr[the_client_id];
                if (client == null) {
                    need_send_to_client = false;
                    log4js.MyError(" this client has close connect client_id = %s ", the_client_id);
                }
                else {
                    // 检查该连接的会话　是否是同一个玩家　有可能有的消息处理很慢　连接都断开了　新连接进来了　替换它原来的位置　但是这可能是其他玩家的连接　
                    // 所以当之前的消息返回时　要检查是否是当前的连接会话　如果不是　则不能下发给当前的连接
                    if (client.bind_user_id != the_user_id) {
                        log4js.MyError("cur logic msg not my client user_id = %s bind_user_id = %s ", the_user_id, client.bind_user_id);
                        need_send_to_client = false;
                    }  
                }
            }

            if (need_send_to_client == true) {
                // todo 如果是登录　则需要检查　登录是否成功　因为登录会做一些检查
                if (i_msg_cmd == msg_cmd.do_login) {
                    // todo 检查是否登录成功　如果成功　则需要检查该玩家已经在线　如果已经在线　得踢掉前面的连接
                    checkOtherClientOnLine(the_user_id, the_client_id);
                }
            }

            if (need_send_to_client == true && client != null) {
                let msg_len = result_json.length;
                let send_len = msg_len + 4;
                let send_buffer = Buffer.allocUnsafe(send_len + 10);
                send_buffer.fill(0);

                let tmp_offset = 0;
                send_buffer.writeUIntBE(msg_len, 0, 4);
                tmp_offset += 4;
                send_buffer.write(result_json, tmp_offset);
                tmp_offset += msg_len;

                log4js.MyDebug("send msg to client tmp_offset = %s %s ", tmp_offset, msg_len);
                
                client.write(send_buffer.slice(0, tmp_offset));
                result_json = null;
                send_buffer = null;
            }

            // 找该进程对应的编号　因为消息队列　记录的是　每个子进程对应的编号
            var worker_index = getIndexByPid(compute.pid);
            
            // 检查该进程　
            if (work_process_manager.msg_queue_arr.hasOwnProperty(worker_index) == true && work_process_manager.msg_queue_arr[worker_index].length > 0) {

                // 说明有客户端的消息　在消息队列中　堆集 这时得顺序处理
                var msg_obj = work_process_manager.msg_queue_arr[worker_index].shift();

                log4js.MyError(" now get msg obj from queue worker index = %s msg obj = %s left len = %s ", worker_index, JSON.stringify(msg_obj), work_process_manager.msg_queue_arr[worker_index].length);

                var next_client_id = msg_obj.client_id;
                var next_msg = msg_obj.msg;
                var i_msg_cmd = msg_obj.i_msg_cmd;
                var the_user_id = msg_obj.user_id;

                sendMsgToWorker(compute, worker_index, next_msg, next_client_id, i_msg_cmd, the_user_id);
            }

        });	
    }
}

function checkMsgCmdIsLegal(i_msg_cmd) {
    if (i_msg_cmd == msg_cmd.do_login || i_msg_cmd == msg_cmd.logic_msg) {
        return true;
    }
    return false;
}

const createWorker = () => {	
    const compute = fork('./php_worker.js', [config_json_name]);	

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

        let ret_json_tb = JSON.parse(result_json);

        let the_msg_index = ret_json_tb['msg_index'];
        let the_client_id = ret_json_tb['client_id'];

        let i_msg_cmd = ret_json_tb['i_msg_cmd'];
        let the_user_id = ret_json_tb['user_id'];

        let need_send_to_client = true;
        // 检查必要的消息头　是否都存在　缺一不可
        if (isNaN(the_msg_index) == true || isNaN(the_client_id) == true || isNaN(i_msg_cmd) == true || isNaN(the_user_id) == true) {
            log4js.MyError(" not find msg_index or client_id ret_json = %s", result_json);
            need_send_to_client = false;
        }

        // 检查玩家ID 消息头　是否合法
        if (need_send_to_client == true) {
            if (the_user_id == 0 || checkMsgCmdIsLegal(i_msg_cmd) == false) {
                log4js.MyError(" error user_id = %s or i_msg_cmd = %s ret_json", the_user_id, i_msg_cmd, result_json);
                need_send_to_client = false;
            }
        }

        let client = null;

        // 检查连接是否存在
        if (need_send_to_client == true) {
            client = clientArr[the_client_id];
            if (client == null) {
                need_send_to_client = false;
                log4js.MyError(" this client has close connect client_id = %s ", the_client_id);
            }
            else {
                // 检查该连接的会话　是否是同一个玩家　有可能有的消息处理很慢　连接都断开了　新连接进来了　替换它原来的位置　但是这可能是其他玩家的连接　
                // 所以当之前的消息返回时　要检查是否是当前的连接会话　如果不是　则不能下发给当前的连接
                if (client.bind_user_id != the_user_id) {
                    log4js.MyError("cur logic msg not my client user_id = %s bind_user_id = %s ", the_user_id, client.bind_user_id);
                    need_send_to_client = false;
                }  
            }
        }

        if (need_send_to_client == true) {
            // todo 如果是登录　则需要检查　登录是否成功　因为登录会做一些检查
            if (i_msg_cmd == msg_cmd.do_login) {
                // todo 检查是否登录成功　如果成功　则需要检查该玩家已经在线　如果已经在线　得踢掉前面的连接
                checkOtherClientOnLine(the_user_id, the_client_id);
            }
        }

        if (need_send_to_client == true && client != null) {

            let msg_len = result_json.length;
            let send_len = msg_len + 4;
            let send_buffer = Buffer.allocUnsafe(send_len + 10);
            send_buffer.fill(0);

            let tmp_offset = 0;
            send_buffer.writeUIntBE(msg_len, 0, 4);
            tmp_offset += 4;
            send_buffer.write(result_json, tmp_offset);
            tmp_offset += msg_len;

            log4js.MyDebug("send msg to client tmp_offset = %s %s ", tmp_offset, msg_len);
            
            client.write(send_buffer.slice(0, tmp_offset));
            result_json = null;
            send_buffer = null;
        }

        // 找该进程对应的编号　因为消息队列　记录的是　每个子进程对应的编号
        let worker_index = getIndexByPid(compute.pid);
        
        // 检查该进程　
        if (work_process_manager.msg_queue_arr.hasOwnProperty(worker_index) == true && work_process_manager.msg_queue_arr[worker_index].length > 0) {

            // 说明有客户端的消息　在消息队列中　堆集 这时得顺序处理
            let msg_obj = work_process_manager.msg_queue_arr[worker_index].shift();

            log4js.MyError(" now get msg obj from queue worker index = %s msg obj = %s left len = %s ", worker_index, JSON.stringify(msg_obj), work_process_manager.msg_queue_arr[worker_index].length);

            let next_client_id = msg_obj.client_id;
            let next_msg = msg_obj.msg;
            let next_i_msg_cmd = msg_obj.i_msg_cmd;
            let next_user_id = msg_obj.user_id;

            sendMsgToWorker(compute, worker_index, next_msg, next_client_id, next_i_msg_cmd, next_user_id);

            msg_obj = null;
        }

        client = null;

    });	
}	

for (let i=0; i< config_data.worker_num; i++) {	
    createWorker();	

    //console.log('free 111 ' + os.freemem() / kb + 'kb\r\n');
}


log4js.MyDebug(" process_num " + Object.keys(work_process_manager.workers_map).length);
log4js.MyDebug(" workers_map_index = %s ", JSON.stringify(work_process_manager.workers_map_index));


function sendMsgToWorker(the_worker, worker_index, msg, client_id, i_msg_cmd, user_id)
{
    log4js.MyDebug(" now to user worker pid = " + the_worker.pid + " client id = " + client_id);

    the_worker.send_msg_index += 1;
    let msg_tb = {};
    msg_tb.msg = msg;
    msg_tb.msg_index = the_worker.send_msg_index;
    msg_tb.client_id = client_id;
    msg_tb.i_msg_cmd = i_msg_cmd;
    msg_tb.user_id = user_id;

    the_worker.send(JSON.stringify(msg_tb)); 
    the_worker.cur_process_num += 1;

    msg_tb = null;
}

function doLogic(msg, client_id, i_msg_cmd, user_id)
{
    let workers_num = work_process_manager.workers_map_index.length;

    // 不同的连接的编号　在不同工作子进程中处理　保证同一个连接过来的数据　在同一个工作子进程中处理　
    let cur_client_index = client_id;
    let worker_index = cur_client_index % workers_num;
    let worker_pid = work_process_manager.workers_map_index[worker_index];

    //log4js.MyDebug(" doLogic client id %s workers_num %s worker_index %s worker_pid %s", client_id, workers_num, worker_index, worker_pid);

    if (work_process_manager.workers_map.hasOwnProperty(worker_pid)) {

        let the_worker = work_process_manager.workers_map[worker_pid];

        // 如果该子进程　已经有多条消息在处理　且处理的消息的数量　超出了子进程的同时处理消息的上限 则需要把当前消息加到消息队列之中
        if (the_worker.cur_process_num >= config_data.php_connect_num) {
            let msg_obj = {};
            msg_obj.client_id = client_id;
            msg_obj.msg = msg;
            msg_obj.i_msg_cmd = i_msg_cmd;
            msg_obj.user_id = user_id;

            log4js.MyWarn(" cur_process_num %s add msg to queue msg %s client_id %s", the_worker.cur_process_num, msg, client_id);

            if (work_process_manager.msg_queue_arr.hasOwnProperty(worker_index) == false) {
                work_process_manager.msg_queue_arr[worker_index] = [];
            }

            work_process_manager.msg_queue_arr[worker_index].push(msg_obj);

            log4js.MyWarn(" worker index %s now queue length %s ", worker_index, work_process_manager.msg_queue_arr[worker_index].length);
            
            msg_obj = null;
            return;
        }

        sendMsgToWorker(the_worker, worker_index, msg, client_id, i_msg_cmd, user_id);
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

// 处理消息异常
function doMsgException(client, logStr, close_client = true)
{
    log4js.MyError(logStr);

    let tmp_ret_msg_tb = {};
    tmp_ret_msg_tb.error = logStr;
    //tmp_ret_msg_tb.msg_json_str = msg_json_str;
    client.write(JSON.stringify(tmp_ret_msg_tb));

    if (close_client == true)  {
        clientArr[client.id] = null;

        client.end();
        client.destroy();
    }
}

/**
 * 单位为字节格式为 MB 输出
 */
 const format = function (bytes) {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
};

/**
 * 封装 print 方法输出内存占用信息 
 */
const mem_print = function() {
    let memoryUsage = process.memoryUsage();

    log4js.MyError(" memory info = %s ", JSON.stringify({
        rss: format(memoryUsage.rss),
        heapTotal: format(memoryUsage.heapTotal),
        heapUsed: format(memoryUsage.heapUsed),
        external: format(memoryUsage.external),
        arrayBuffers: format(memoryUsage.arrayBuffers),
    }));

    memoryUsage = null;
}


// 检查每个连接的心跳是否超时，如果超时　则断开连接
function checkConnectHeartBeat()
{
    //log4js.MyDebug("checkConnectHeartBeat not to check connect heart beat");

    //lib_util.computation();
    //lib_util.computation();

    let cur_sec = lib_util.getCurrentTimeStamp();

    if (global.last_gc_time_msec == 0) {
        global.last_gc_time_msec = cur_sec;
    }

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

    let gap_sec = cur_sec - global.last_gc_time_msec;
    if (gap_sec >= 300) {
        let mem = process.memoryUsage();
        let the_start_msec = Date.now();

        //heapdump.writeSnapshot(Date.now() + '.heapsnapshot');

        mem_print();

        global.gc();

        mem_print();

        let the_cost_msec = Date.now() - the_start_msec;
        log4js.MyError('memery,heapUsed %s M cost time = %s ms', ((process.memoryUsage().heapUsed - mem.heapUsed)/1024/1024).toFixed(5), the_cost_msec);
        global.last_gc_time_msec = cur_sec;

        mem = null;
    }
}

// 每10s 检查一次　连接心跳
setInterval(checkConnectHeartBeat, 100 * 1000);

var msg_cmd = {
    'do_login': 101,
    'logic_msg': 201
};

function doProcessStickyBagMsg(client, buf)
{
    log4js.MyError(" doProcessStickyBagMsg sticky bag ms len =  %s ", buf.length);

    let tmp_len = 0;
    let total_buf_len = buf.length;

    while(tmp_len < total_buf_len) {
        
        let offset = tmp_len;

        let left_len = total_buf_len - tmp_len;

        if (left_len <= 12) {
            tmp_len = total_buf_len;
            doMsgException(client, "msg error msg_len = " + left_len, false);
            break;
        }

        let i_msg_cmd = buf.readUIntBE(offset, 4);
        offset += 4;

        let user_id = buf.readUIntBE(offset, 4);
        offset += 4;

        let msg_len = buf.readUIntBE(offset, 4);
        offset += 4;

        tmp_len += 12;
        tmp_len += msg_len;

        log4js.MyWarn(" doProcessStickyBagMsg i_msg_cmd %s user_id = %s client id = %s ", i_msg_cmd, user_id, client.id);

        // 检查包头是否合法
        if (user_id <= 0 || checkMsgCmdIsLegal(i_msg_cmd) == false) {
            console.log("******************> erro cmd = " + i_msg_cmd + " user_id = " + user_id);
            doMsgException(client, "errog head package user_id = " + user_id + " i_msg_cmd = " + i_msg_cmd, false);
            continue;
        }

        // 检查是否是登录
        if (i_msg_cmd == msg_cmd.do_login) {
            // 这里先绑定玩家ID 因为玩家ID 是每条消息必发的　
            client.bind_user_id = user_id;
        }
        else if (i_msg_cmd == msg_cmd.logic_msg) {
            // 如果是逻辑命令　则需要检查　是否有形成会话　如果没有　则是跳过登录　直接发送逻辑命令　则是非法的　直接踢掉
            
            if (client.bind_user_id == 0) {

                let msg_json_str = buf.slice(offset, offset + msg_len);
                log4js.MyError("doProcessStickyBagMsg user_id =  " + user_id + " msg_len = " + msg_len + " offset " + offset +  " decode_json_str = " + msg_json_str);

                let decode_str = myUtil.deCode(msg_json_str.toString());

                log4js.MyError("doProcessStickyBagMsg cur client id = " + client.id + " decode_str = " + decode_str);

                for (let i in clientArr) {

                    let the_client = clientArr[i];
                    // 自己当前的的连接不发 为空的连接不发
                    if (the_client == null) {
                        continue;
                    }
                    
                    if (the_client.bind_user_id == user_id) {
                        log4js.MyError(" doProcessStickyBagMsg real client id = " + the_client.id + " cur_bind_user_id = " + the_client.bind_user_id);
                        break;
                    }
                }

                doMsgException(client, " doProcessStickyBagMsg the client not has login user_id = " + user_id, false);
                continue;
            }
        }
        
        log4js.MyDebug(" ===> offset = " + offset + " msg_len = " + msg_len);

        let msg_json_str = buf.slice(offset, offset + msg_len);
        log4js.MyDebug("doProcessStickyBagMsg user_id =  " + user_id + " msg_len = " + msg_len + " offset " + offset +  " decode_json_str = " + msg_json_str);

        let record_msec = Date.now();

        let decode_str = myUtil.deCode(msg_json_str.toString());

        let cost_msec = Date.now() - record_msec;
        console.log("----------------> %d ", cost_msec);

        let msg_tb = myUtil.strToJson(decode_str);
        if (typeof(msg_tb) != 'object') {
            doMsgException(client, " str can not to json msg_json_str  " + msg_json_str.toString(), false);
            continue;
        }

        log4js.MyDebug(" recv msg   user_id = " + msg_tb.user_id + " cmd = " + msg_tb.cmd + " msg = " + msg_tb.msg);

        let cmd = msg_tb.cmd;
        let recv_msg = msg_tb.msg;

        //console.log('free ' + os.freemem() / kb + 'kb\r\n');

        // 记录每个连接上次接收消息的时间戳　用来做心跳检测
        let curSec = lib_util.getCurrentTimeStamp();
        client.last_sec = curSec;

        if (cmd == 101) {
            doLogic(recv_msg, client.id, i_msg_cmd, user_id);
        }
        else {

            if (cmd == 102) {
            }
        }

        console.log("---------------------> tmpLen = " + tmp_len);
    }

    buf = null;
}

// 3 绑定链接事件
server.on('connection', (client)=> {
    log4js.MyDebug("remote address = " + client.remoteAddress + " port = " + client.remotePort + " length = " + clientArr.length);
    
    // 先找出空的位置　
    let allocate_index = -1;
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
    
    //client.setEncoding('utf8');
    client.setNoDelay(true);

    client.bind_user_id = 0;

    let the_cur_sec = lib_util.getCurrentTimeStamp();
    client.last_sec = the_cur_sec;

    // 客户socket进程绑定事件
    client.on('data',(buf)=>{

        //log4js.MyDebug(" recv msg client id = " + client.id + " msg = " + msg + " length = " + msg.length);
        log4js.MyDebug(" ===> " + typeof(buf) + " length " + buf.length + " client id = " + client.id);

        /*
        if (lib_util.isBase64Str(msg) == false) {
            doMsgException(client, " error msg msg =" + msg + " now to close this client ");
            return;
        }
        */

        //let buf = Buffer.from(msg, 'string');
        //let buf = msg;

        if (buf.length < 12) {
            doMsgException(client, " error msg buff length < 8 now to close this client ");
            return;
        }

        let offset = 0;

        let i_msg_cmd = buf.readUIntBE(offset, 4);
        offset += 4;

        let user_id = buf.readUIntBE(offset, 4);
        offset += 4;

        let msg_len = buf.readUIntBE(offset, 4);
        offset += 4;

        let cur_len = msg_len + 12;
        if (cur_len < buf.length) {
            // 如果有粘包的现象存在　则需要　分包　进行处理
            doProcessStickyBagMsg(client, buf);
            return;
        }

        log4js.MyWarn("i_msg_cmd %s user_id = %s client id = %s ", i_msg_cmd, user_id, client.id);

        // 检查包头是否合法
        if (user_id <= 0 || checkMsgCmdIsLegal(i_msg_cmd) == false) {
            doMsgException(client, "errog head package user_id = " + user_id + " i_msg_cmd = " + i_msg_cmd);
            return;
        }

        // 检查是否是登录
        if (i_msg_cmd == msg_cmd.do_login) {
            // 这里先绑定玩家ID 因为玩家ID 是每条消息必发的　
            client.bind_user_id = user_id;
        }
        else if (i_msg_cmd == msg_cmd.logic_msg) {
            // 如果是逻辑命令　则需要检查　是否有形成会话　如果没有　则是跳过登录　直接发送逻辑命令　则是非法的　直接踢掉
            
            if (client.bind_user_id == 0) {

                let msg_json_str = buf.slice(offset, offset + msg_len);
                log4js.MyError("user_id =  " + user_id + " msg_len = " + msg_len + " offset " + offset +  " decode_json_str = " + msg_json_str);

                let decode_str = myUtil.deCode(msg_json_str.toString());

                log4js.MyError(" cur client id = " + client.id + " decode_str = " + decode_str);

                for (let i in clientArr) {

                    let the_client = clientArr[i];
                    // 自己当前的的连接不发 为空的连接不发
                    if (the_client == null) {
                        continue;
                    }
                    
                    if (the_client.bind_user_id == user_id) {
                        log4js.MyError(" real client id = " + the_client.id + " cur_bind_user_id = " + the_client.bind_user_id);
                        break;
                    }
                }

                doMsgException(client, "the client not has login user_id = " + user_id);
                return;
            }
        }
        
        //log4js.MyDebug(" ===> offset = " + offset + " msg_len = " + msg_len);

        let msg_json_str = buf.slice(offset, offset + msg_len);
        log4js.MyDebug("user_id =  " + user_id + " msg_len = " + msg_len + " offset " + offset +  " decode_json_str = " + msg_json_str);

        let record_msec = Date.now();

        let decode_str = myUtil.deCode(msg_json_str.toString());

        let cost_msec = Date.now() - record_msec;
        console.log("----------------> %d ", cost_msec);

        let msg_tb = myUtil.strToJson(decode_str);
        if (typeof(msg_tb) != 'object') {
            doMsgException(client, " str can not to json msg_json_str  " + msg_json_str.toString());
            return;
        }

        log4js.MyDebug(" recv msg   user_id = " + msg_tb.user_id + " cmd = " + msg_tb.cmd + " msg = " + msg_tb.msg);

        let cmd = msg_tb.cmd;
        let recv_msg = msg_tb.msg;

        //console.log('free ' + os.freemem() / kb + 'kb\r\n');

        // 记录每个连接上次接收消息的时间戳　用来做心跳检测
        let curSec = lib_util.getCurrentTimeStamp();
        client.last_sec = curSec;

        if (cmd == 101) {
            doLogic(recv_msg, client.id, i_msg_cmd, user_id);
        }
        else {

            if (cmd == 102) {
            }
        }

        buf = null;

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


// 接收进程退出的信号
process.on("SIGINT", function() {
    console.log("receive signal SIGINT");
    process.exit(1001);
});

process.on("SIGTERM", function() {
    console.log("receive signal SIGTERM");
    process.exit(1002);
});

process.on("SIGHUP", function() {
    console.log("接收到退出指令");
});

process.on("exit", function() {
    console.log("master exit");
});

