/*var net = require('net');
var client = net.connect(1025,'127.0.0.1');
client.on('error',function(){
	console.log('error');
});
client.on('end',function(){
	console.log('end');
});
client.on('data',function(data){
	console.log('data');
	console.log(data);
});
client.write("sdfsdfdf");
*/
var fcgi = require("../lib/fastcgi");
var client = fcgi.createClient('127.0.0.1',9000);

client.request({
	GATEWAY_INTERFACE:'CGI/1.1',
	SERVER_SOFTWARE:'nginx',
	QUERY_STRING:'a=12334444&b=11111',
	REQUEST_METHOD:'GET',
	CONTENT_TYPE:'',
	CONTENT_LENGTH:'',
	SCRIPT_FILENAME:'/web/www/www/node/test2.php',
	SCRIPT_NAME:'/test.php',
	REQUEST_URI:'/test.php',
	DOCUMENT_URI:'/test.php',
	DOCUMENT_ROOT:'/web/www/www/node',
	SERVER_PROTOCOL:'HTTP/1.0',
	REMOTE_ADDR:'192.168.9.29',
	REMOTE_PORT:'1862',
	SERVER_ADDR:'192.168.1.53',
	SERVER_PORT:'80',
	SERVER_NAME:'test.uuzu.com',
	REDIRECT_STATUS:'200',
	HTTP_HOST:'test.uuzu.com',
	HTTP_USER_AGENT:'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:14.0) Gecko/20100101 Firefox/14.0.1',
	HTTP_ACCEPT:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	HTTP_ACCEPT_LANGUAGE:'zh-cn,zh;q=0.8,en-us;q=0.5,en;q=0.3',
	HTTP_ACCEPT_ENCODING:'gzip, deflate',
	HTTP_CONNECTION:'keep-alive',
	HTTP_COOKIE:'__utma=48812706.757519911.1345827041.1345827041.1345827041.1; __utmz=48812706.1345827041.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); lzstat_uv=3188274942174957314|2762635@2762633@2771621@1864724; Hm_lvt_1262182b97a01da1ac259bcdb1eb91d7=1345821604104,1345827042336,1345827101811,1345827125237; ad_code=12070900mCthA; uuzu_LAST_SERVER=s27.x.uuzu.com; game_id=8; ad_aterial=1589; _UUZUACCOUNT=dsgfdghgjd',
	HTTP_CACHE_CONTROL:'max-age=0'
});

client.request({
	GATEWAY_INTERFACE:'CGI/1.1',
	SERVER_SOFTWARE:'nginx',
	QUERY_STRING:'a=1233333&b=11111',
	REQUEST_METHOD:'GET',
	CONTENT_TYPE:'',
	CONTENT_LENGTH:'',
	SCRIPT_FILENAME:'/web/www/www/node/test2.php',
	SCRIPT_NAME:'/test.php',
	REQUEST_URI:'/test.php',
	DOCUMENT_URI:'/test.php',
	DOCUMENT_ROOT:'/web/www/www/node',
	SERVER_PROTOCOL:'HTTP/1.0',
	REMOTE_ADDR:'192.168.9.29',
	REMOTE_PORT:'1862',
	SERVER_ADDR:'192.168.1.53',
	SERVER_PORT:'80',
	SERVER_NAME:'test.uuzu.com',
	REDIRECT_STATUS:'200',
	HTTP_HOST:'test.uuzu.com',
	HTTP_USER_AGENT:'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:14.0) Gecko/20100101 Firefox/14.0.1',
	HTTP_ACCEPT:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	HTTP_ACCEPT_LANGUAGE:'zh-cn,zh;q=0.8,en-us;q=0.5,en;q=0.3',
	HTTP_ACCEPT_ENCODING:'gzip, deflate',
	HTTP_CONNECTION:'keep-alive',
	HTTP_COOKIE:'__utma=48812706.757519911.1345827041.1345827041.1345827041.1; __utmz=48812706.1345827041.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); lzstat_uv=3188274942174957314|2762635@2762633@2771621@1864724; Hm_lvt_1262182b97a01da1ac259bcdb1eb91d7=1345821604104,1345827042336,1345827101811,1345827125237; ad_code=12070900mCthA; uuzu_LAST_SERVER=s27.x.uuzu.com; game_id=8; ad_aterial=1589; _UUZUACCOUNT=dsgfdghgjd',
	HTTP_CACHE_CONTROL:'max-age=0'
});

//client.close_connect();