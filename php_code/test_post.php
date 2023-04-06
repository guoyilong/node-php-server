<?php

error_log("You messed up!\r", 3, "/var/tmp/my-errors.log");

//error_log("You messed up!\r", 3, "E:/phpProject/www/node/my-errors.log");

//print_r("hi php");
//print_r($_GET);
//echo file_get_contents('php://input');
//echo "shsskskks";
//print_r($_GET);

/*
register_shutdown_function('PageOnShutdown');
//include('error_test.php');
function PageOnShutdown()
{
    $msg = error_get_last();
    $_GET['error'] = $msg;

    print (json_encode($_GET));
}

*/


/**
 * 使用 json_encode() 处理数组时，
 * 不对数组里面的中文字串进行转义
 *
 * @param  array   $arr 待处理数组
 * @return string       Json格式的字符串
 */

function arrToJson($arr) {
    $ajax = ToUrlEncode($arr);
    $str_json = json_encode($ajax);
    return urldecode($str_json);
}

/**
 * 将数组里面key字串和value字串用urlencode转换格式后返回
 *
 * @param  array $arr 数组
 * @return array
 */
function ToUrlEncode($arr) {
    $temp = array();
    if (is_array($arr)) {
        foreach ($arr AS $key => $row) {
            //若key为中文，也需要进行urlencode处理
            $key = urlencode($key);
            if (is_array($row)) {
                $temp[$key] = ToUrlencode($row);
            } else {
                $temp[$key] = urlencode($row);
            }
        }
    } else {
        $temp = $arr;
    }

    return $temp;
}

function broadCastMsg($user_id, $msg, $node_server_ip, $node_server_port)
{
    $tb = array();
    $tb['user_id'] = $user_id;
    $tb['cmd'] = 101;
    $tb['msg'] = $msg;

    $tb_str = json_encode($tb);
    $the_len = strlen($tb_str);

    $date_str = date("Y-m-d", time());

    error_log(" the_len = {$the_len} \r\n", 3, "/var/tmp/php_send_{$date_str}.log");

    //echo  $the_len . "\r\n";

    $msg_buf = pack("N2a{$the_len}", 66, strlen($tb_str), $tb_str);

    var_dump($msg_buf);

    $msg_tb =  unpack("Nu_id/Lstr_len/a*msg_json", $msg_buf);

    var_dump($msg_tb);

    $host = $node_server_ip;

    $host_port = $node_server_port + 1;

    $fp = fsockopen($host, $host_port, $errno, $errstr, 30);

    if (!$fp) {
        error_log("FAILED TO CONNECT TO PUSH, {$host} {$host_port} host: errno {$errno} errstr {$errstr} \r\n", 3, "/var/tmp/php_send_{$date_str}.log");
        return -1;
    }

    $msg_buf_base_64 = base64_encode($msg_buf);

    error_log($msg_buf_base_64 . "\r\n", 3 , "/var/tmp/php_send_{$date_str}.log");

    $isendLen = fwrite($fp, $msg_buf_base_64);

    error_log(" sendLen = {$isendLen} \r\n", 3, "/var/tmp/php_send_{$date_str}.log");

    if ($isendLen > 0) {
        $data = fread($fp, 4096);
        error_log(" receive data = {$data} \r\n", 3, "/var/tmp/php_send_{$date_str}.log");
    }

    fclose($fp);

    ob_clean();
}

if (!empty($_POST)) {

    $tmp_tb = array();

    //$tmp_tb.sss = 100;

    $the_msg = $_POST['msg'];

    $msg_base64_str = base64_decode($the_msg);

    //var_dump($the_str);

    $msg_tb_str = gzuncompress($msg_base64_str);
    $msg_tb = json_decode($msg_tb_str, true);

    $time_str = date('Y-m-d h:i:s',time());

    $date_str = date("Y-m-d", time());

    error_log("{$time_str} ==> msg_tb = " . json_encode($msg_tb) . " user_id = " . $msg_tb['user_id'] . "\r\n", 3, "/var/tmp/php_record_{$date_str}.log");

    $cur_time = time();

    $rand_num = mt_rand(1, 100);

    $sleep_ms = 10;

    if ($rand_num <= 20) {
        $sleep_ms = 50;
    }
    else if ($rand_num > 20 && $rand_num <= 40) {
        $sleep_ms = 100;
    }
    else if ($rand_num > 40 && $rand_num <= 60) {
        $sleep_ms = 150;
    }
    else if ($rand_num > 60 && $rand_num <= 80) {
        $sleep_ms = 200;
    }
    else {
        $sleep_ms = 250;
    }

    $the_msg = $msg_tb['user_new_name'];

    $node_server_ip = $_POST['node_server_ip'];
    $node_server_port = $_POST['node_server_port'];

    if ($the_msg == "gyl") {
        $sleep_ms = 1000 * 30;
    }
    else if ($the_msg == "broadcast") {
        broadCastMsg(121, $the_msg, $node_server_ip, $node_server_port);
        ob_clean();
		$sleep_ms = 0;
    }
	
	//$sleep_ms = 0;

    $pid = posix_getpid();

    //$pid = 123;


    error_log(" {$the_msg} {$time_str} rand_num = {$rand_num} sleep_ms = {$sleep_ms} pid = {$pid} \r\n", 3, "/var/tmp/php_record_{$date_str}.log");

    //error_log(" {$the_msg} {$time_str} rand_num = {$rand_num} sleep_ms = {$sleep_ms} pid = {$pid} \r\n", 3, "E:/phpProject/www/node/php_record_{$date_str}.log");


    usleep(1000 * $sleep_ms);

    $_POST['sleep_ms'] = $sleep_ms;
	
	//unset($_GET['client_id']);
	

    $hostname = "****";
    //$hostname = "127.0.0.1";
    $username = "**";
    $password = "***";
    $dbName = "***";
    $dbPort = 3306;

    $conn = mysqli_connect($hostname, $username, $password, $dbName);

    if (mysqli_connect_errno($conn))
    {
        //echo "连接 MySQL 失败: " . mysqli_connect_error();
        $_POST['mysql_error'] = mysqli_connect_error();
    }
    else {
        if ($conn) {
            if (mysqli_select_db($conn, $dbName)) {

                $result = mysqli_query($conn, "SELECT count(*) as tmp_tb FROM tmp_tb where  id <= 8");

                while($row = mysqli_fetch_row($result))
                {
                    $field_num = $row[0];
                    $_POST['field_num'] = $field_num;
                }
            }
            else {
                echo  mysqli_error($conn);
            }
        }

        mysqli_close($conn);
    }

    if (isset($_SERVER['SERVER_SOFTWARE'])) {
        $_POST['SERVER_SOFTWARE'] = $_SERVER['SERVER_SOFTWARE'];
    }

    $ret_content = "guoyilongedu---------->&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&";

    for ($i = 0; $i <= 5; $i++) {
        $ret_content .= "dddddddddddddddddddddddddddddd222222222222224444444444422222222222sssssssssssfffffffffsssssffffffffffffffffffffffffffffff";
    }

    //$_POST['msg'] = 'guoyilongedu';

    $msg_tb['ret_content'] = $ret_content;

    $_POST['msg'] = json_encode($msg_tb);


    $dd = gzcompress($_POST['msg']);
    $_POST['msg'] =  base64_encode($dd);

    error_log(arrToJson($_POST) . " \r\n", 3, "/var/tmp/php_record_{$date_str}.log");

    //error_log(arrToJson($_POST) . " \r\n", 3, "E:/phpProject/www/node/php_record_{$date_str}.log");

    header("HEADER_USER_ID:123456");

    print(arrToJson($_POST));
}

?>
