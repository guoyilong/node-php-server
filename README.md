# node-php-server
基于nodejs 与　php 相结合的游戏服务器框架，nodejs 层负责数据转发，负载均衡，php层负责业务的逻辑
详情参考　https://blog.csdn.net/guoyilongedu/article/details/121049511

后台启动
nohup node --expose-gc master_server.js config_bak.json > 1.log 2>&1 &

