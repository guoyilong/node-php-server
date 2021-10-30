const urlencode = require('../');

describe('urlencode-for-php', function() {

	it('test1', function(done) {
		var obj = {a:[1,2,3,4]};
		var expected = 'a[0]=1&a[1]=2&a[2]=3&a[3]=4';
		if (urlencode(obj) != expected) throw "Error";
		done();
	});

	it('test11', function(done) {
		var obj = {a:[1,2,3,4], b:{}, c: [], d: null};
		var expected = 'a[0]=1&a[1]=2&a[2]=3&a[3]=4';
		console.log(urlencode(obj));
		done();
	});

	it('test2', function(done) {
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
		var expected = 'a=b&c[0]=1&c[1]=2&c[2]=3&d[0][arr][0]=%2B-X%26%3F&d[0][arr][1]=2&d[1][arr][0]=3&d[1][arr][1]=4';
		if (urlencode(obj) != expected) throw "Error";
		done();
	});

	it('test3', function(done) {
		var obj = 
		{
			"a":"b", 
			c: [ 1, 2, 3 ], 
			d:
			[
				[ 1, 2, 3 ],
				[ 4, 5, 6 ]
			]
		};
		var expected = 'a=b&c[0]=1&c[1]=2&c[2]=3&d[0][0]=1&d[0][1]=2&d[0][2]=3&d[1][0]=4&d[1][1]=5&d[1][2]=6';
		if (urlencode(obj) != expected) throw "Error";
		done();
	});
});