
//var fs = require('fs');
 
/*
function loadjson(filepath)
{
    var data;
 
    try{
 
        var jsondata = iconv.decode(fs.readFileSync(filepath, "binary"), "utf8");
 
        data = JSON.parse(jsondata);
 
        console.log(data);
    }
    catch(err)
    {
        console.log(err);
    }
 
    return data;
}

var data = loadjson('../config/config.json');
*/

START:
console.log("ssssssssssssss");

util = require('../lib/util');

data = util.loadjson('../config/config.json');

console.log(data);

msg = '{"user_id":121,"cmd":101,"msg":"sssssssssssssss"}';

console.log(" type = %s", typeof(msg));

