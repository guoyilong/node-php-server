    
    var buf = Buffer.alloc(1024 * 1024);

    buf.fill(0);
    var offset = 0;

    var mes = "hahahaha"
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
   console.log(buf.slice(0, offset).toString('base64',0, offset));

   //msg = "eSp7ImNtZCI6MTAxLCJtc2ciOiJoYWhhaGFoYSIsInVzZXJfaWQiOjEyMX0=";
   msg = "AAAAeQAAACp7ImNtZCI6MTAxLCJtc2ciOiJoYWhhaGFoYSIsInVzZXJfaWQiOjEyMX0=";
   var buf_test = Buffer.from(msg , 'base64');

    let offset1 = 0;
    user_id = buf_test.readUIntBE(offset1, 4);
    offset1 += 4;

    msg_len = buf_test.readUIntBE(offset1, 4);
    offset1 += 4;

    console.log(msg_len);

    console.log(user_id);

    var user_status = {};
    user_status[1] = 1;
    user_status[2] = 0;
    user_status[3] = 0;

    for (let index in user_status) {
        console.log(user_status[index]);
    }
        
    /*
        log4js.MyDebug(" ===> offset = " + offset + " msg_len = " + msg_len);

        msg_json_str = buf.slice(offset, offset + msg_len);
        log4js.MyDebug("user_id =  " + user_id + " msg_len = " + msg_len + " offset " + offset +  " json_str = " + msg_json_str);

        msg_tb = JSON.parse(msg_json_str);
        log4js.MyDebug(" recv msg   user_id = " + msg_tb.user_id + " cmd = " + msg_tb.cmd + " msg = " + msg_tb.msg);
    */