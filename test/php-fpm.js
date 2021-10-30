var PHPFPM = require('node-phpfpm');
 
var __dirname = "/web/www/www/node/";


console.log("ssssssssssssss");

var phpfpm = new PHPFPM(
{
    host: '127.0.0.1',
    port: 9000,
    documentRoot: __dirname
});
 

phpfpm.run('test2.php?a=b&c=d&e[0]=1&e[1]=2', function(err, output, phpErrors)
{
    if (err == 99) console.error('PHPFPM server error');
    console.log(output);
    if (phpErrors) console.error(phpErrors);
});


phpfpm.run(
    {
        uri: 'test.php',
        json: 
        {
            a:'a',
            b:'b'
        }
    }, function(err, output, phpErrors)
    {
        console.log(output);
        //console.log(err, output, phpErrors);
    });
