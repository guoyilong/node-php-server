<?php

error_log("You messed up!", 3, "/var/tmp/my-errors.log");

//print_r("hi php");
//print_r($_GET);
//echo file_get_contents('php://input');
//echo "shsskskks";
//print_r($_GET);

if (!empty($_GET)) {

    $the_msg = $_GET['msg'];

    if ($the_msg == "gyl") {
        sleep(8);
    }

    print(json_encode($_GET));
}

?>
