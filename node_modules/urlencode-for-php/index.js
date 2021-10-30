module.exports = encode;
var flat = require('flat');


function encode(obj)
{
	var flatted = flat(obj);
	var params = [];
	for(var key in flatted)
	{
		if (flatted[key] !== null && typeof flatted[key] === 'object' && Object.keys(flatted[key]).length === 0) continue;
		if (flatted[key] === null) continue;
		params.push( dot2brackets(key)+'='+encodeURIComponent(flatted[key]) );
	}
	return params.join('&');
}

function dot2brackets(key)
{
	var arr = key.split('.');
	for(var i=1; i<arr.length; i++)
	{
		arr[i] = '['+arr[i]+']';
	}
	return arr.join('');
}