const fs = require('fs');

function loadjson(file_path)
{
    let rawdata = fs.readFileSync(file_path);
    let data = JSON.parse(rawdata);
    
    return data;
}

function computation()  
{	
    let sum = 0;	
    console.info('计算开始');	
    console.time('计算耗时');	
    for (let i = 0; i < 1e10; i++) {	
        sum += i	
    };	
    console.info('计算结束');	
    console.timeEnd('计算耗时');	
    return sum;	
}

module.exports = {
    computation,    
    loadjson
};