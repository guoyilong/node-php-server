# PHP style query string encoder in Node.JS

[![NPM](https://nodei.co/npm/urlencode-for-php.png?downloads=true&stars=true)](https://www.npmjs.com/package/urlencode-for-php)

```
npm install urlencode-for-php --save
```

## Usage

```js
var urlencode = require('urlencode-for-php');

var data = {a:[1,2,3,4]};
console.log( urlencode(obj) );
// will output 'a[0]=1&a[1]=2&a[2]=3&a[3]=4'
```

```js
var obj = 
{
	"a":"b", 
	c: [ 1, 2, 3 ], 
	d:
	[
		{ arr: ["+-X&?",2] },
		{ arr: [3,4] }
	]
};
console.log(urlencode(obj));
// will output: 'a=b&c[0]=1&c[1]=2&c[2]=3&d[0][arr][0]=%2B-X%26%3F&d[0][arr][1]=2&d[1][arr][0]=3&d[1][arr][1]=4'
```

## License
MIT