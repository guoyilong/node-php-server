
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

util = require('../lib/util');

data = util.loadjson('../config/config.json');

console.log(data);