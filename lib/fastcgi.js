var net = require('net');

var FCGI_VERSION_1 = 1;
var FCGI_KEEP_CONN = 1;
var FCGI_RESPONDER = 1;


var FCGI_BEGIN_REQUEST = 1;
var FCGI_PARAMS = 4;
var FCGI_STDIN = 5;

module.exports = (function () {    
    function fastcgi() {
		var currRequrestId = 1;//当前请求id
		var requestMap = {};
		this.createClient =  function(host,port,timeout){
			if(timeout==null) timeout = 60;
			return new client(host,port,timeout);
		}

		var client = function(host,port,timeout){
			var self = this;
			console.log(port+":"+host+":"+timeout);
			this._client = net.connect(port,host);

			this._client.setTimeout(timeout*1000);
			this._client.on('timeout',function(){
				self._client.destroy();
			});

			this._client.on("data",self.responseHandle);

			this._client.on("end",function(){
				console.log("php-fpm end");
			});

			this._client.on('error',function(err){
				console.log('error:'+err);
			});
		}

		client.prototype.send = function (type,requestId,content){
			//if(type==FCGI_BEGIN_REQUEST) console.log(content);
			console.log(content);
			var contentLenth = content.length;
			if(content.length%8!=0) var paddingLength = 8 - content.length%8;
			else var paddingLength = 0;
			console.log("contentLenth="+contentLenth+"|paddingLength="+paddingLength);
			var length = contentLenth + paddingLength + 8;//总长度
			var buf = Buffer.alloc(length);
			var offset = 0;
			buf.writeInt8(FCGI_VERSION_1,offset++);
			buf.writeInt8(type,offset++);
			buf.writeInt16BE(requestId,offset);
			offset+=2;
			buf.writeInt16BE(contentLenth,offset);
			offset+=2;
			buf.writeInt8(paddingLength,offset++);
			buf.fill(0,offset,offset++);//reserved
			content.copy(buf,offset);
			offset+=contentLenth;
			if(offset<length) buf.fill(0,offset,length);
			console.log(buf);
			var ret = this._client.write(buf);
			console.log("send ret="+ret);
		}
		client.prototype.beginRequest = function(requestId,flag){
			if(flag==null) flag = 0;
			var buf = Buffer.alloc(8);
			var offset = 0;
			buf.writeInt16BE(FCGI_RESPONDER,offset);
			offset+=2;
			buf.writeInt8(flag,offset++);
			buf.fill(0,offset,8);
			console.log('beginRequest');
			this.send(FCGI_BEGIN_REQUEST,requestId,buf);
		}
		client.prototype.fcgiParams = function(requestId,fcgiparams){
			var length = 0;
			for(var name in fcgiparams){
				var nameLength = name.length;
				var valueLength = fcgiparams[name].length;
				if(nameLength<=127) length+=1;
				else length+=4;
				if(valueLength<=127) length+=1;
				else length+=4;
				length += nameLength;
				length += valueLength;
			}
			//length += 4;
			var data = Buffer.alloc(length);
			var offset = 0;
			for(var name in fcgiparams){
				var nameLength = name.length;
				var valueLength = fcgiparams[name].length;
				if(nameLength<=127) data.writeInt8(nameLength,offset++);
				else{
					var nameLength_e = nameLength | 2147483648;
					if(name == 'HTTP_COOKIE'){
						console.log('nameLength_e=');
						console.log(nameLength_e);
					}
					data.writeInt32BE(nameLength_e,offset);
					offset+=4;
				}
				if(valueLength<=127) data.writeInt8(valueLength,offset++);
				else{
					valueLength_e = valueLength | 2147483648;
					if(name == 'HTTP_COOKIE'){
						console.log('valueLength_e='+valueLength_e+"|valueLength="+valueLength);
					}
					data.writeInt32BE(valueLength_e,offset);
					offset+=4;
				}
				data.write(name,offset,nameLength);
				offset+=nameLength;
				data.write(fcgiparams[name],offset,valueLength);
				offset+=valueLength;
			}	
			//data.fill(0,offset,length);
			var offset = 0;
			while(true){
				var copyLength = (length-offset>65535)?65535:(length-offset);
				var buf = Buffer.alloc(copyLength);
				data.copy(buf,0,offset);				
				offset += copyLength;
				this.send(FCGI_PARAMS,requestId,buf);
				if(offset>=length) break;
			}
			this.endfcgiParams(requestId);
		}
		client.prototype.endfcgiParams = function(requestId){
			var buf = Buffer.alloc(0);
			//buf.fill(0,0,2);
			console.log('endfcgiParams');
			console.log(buf);
			this.send(FCGI_PARAMS,requestId,buf);
		}
		client.prototype.fcgiStdin = function(requestId,data){			
			var length = data.length;
			var offset = 0;
			while(true){
				var copyLength = (length-offset>65535)?65535:(length-offset);
				var buf = Buffer.alloc(copyLength);
				data.copy(buf,0,offset);				
				offset += copyLength;
				this.send(FCGI_STDIN,requestId,buf);
				if(offset>=length) break;
			}
		}
		client.prototype.request = function(fcgiparams,stdin){
			var requestId = this.getRequestId();
			this.beginRequest(requestId);
			this.fcgiParams(requestId,fcgiparams);
			//this.fcgiStdin(requestId,new Buffer(0));
		}
		client.prototype.getRequestId = function(){
			var requestId;
			while(true){
				requestId = currRequrestId++;
				if(currRequrestId>65535) currRequrestId=0;
				if(!requestMap[requestId]) break;
			}
			return requestId;
		}
		client.prototype.responseHandle = function(data){
			console.log("data==>");
			console.log(data.toString('utf8'));
		}
			
    }
	return new fastcgi();           
})();