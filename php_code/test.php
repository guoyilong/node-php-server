<?php

//error_log("You messed up!\r", 3, "/var/tmp/my-errors.log");

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

if (!empty($_GET)) {

    $tmp_tb = array();

    //$tmp_tb.sss = 100;

    $the_msg = $_GET['msg'];

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

    if ($the_msg == "gyl") {
        $sleep_ms = 1000 * 10;
    }

    $pid = posix_getpid();

    $time_str = date('Y-m-d h:i:s',time());

    $date_str = date("Y-m-d", time());

    error_log(" {$the_msg} {$time_str} rand_num = {$rand_num} sleep_ms = {$sleep_ms} pid = {$pid} \r\n", 3, "/var/tmp/php_record_{$date_str}.log");

    //usleep(1000 * $sleep_ms);

    $hostname = "127.0.0.1";
    $username = "ss";
    $password = "222222";
    $dbName = "ssd";
    $dbPort = 3306;

    $conn = mysqli_connect($hostname, $username, $password, $dbName);

    if (mysqli_connect_errno($conn))
    {
        //echo "连接 MySQL 失败: " . mysqli_connect_error();
        $_GET['mysql_error'] = mysqli_connect_error();
    }
    else {
        if ($conn) {
            if (mysqli_select_db($conn, $dbName)) {

                $result = mysqli_query($conn, "SELECT count(*) as num FROM user_field");

                while($row = mysqli_fetch_row($result))
                {
                    $user_name = $row[0];
                    $_GET['user_name'] = $user_name;
                }
            }
            else {
                echo  mysqli_error($conn);
            }
        }

        mysqli_close($conn);
    }

    error_log(arrToJson($_GET) . " \r\n", 3, "/var/tmp/php_record_{$date_str}.log");

    print(arrToJson($_GET));
}

?>
