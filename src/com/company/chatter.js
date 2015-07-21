var express = require('express');
var redis = require('redis');
var redisClient = redis.createClient();
var app = express();

//app.use('/', function(request, response) {
//    response.sendFile(__dirname + "/index.html");
//});
app.use(express.static(__dirname + '/'));

var server = require('http').createServer(app);
var io = require('socket.io')(server);
var messages = [];

var storeMessage = function(name, data) {
    var message = JSON.stringify({name: name, data: data});
    redisClient.lpush("messages", message, function(err, response) {
        redisClient.ltrim(response, 0, 99);
    });
};

 redisClient.on("error", function (err) {
        console.log("Error " + err);
    });

io.on('connection', function(client) {
    client.on('join', function(nickname) {
        client.nickname = nickname;

        client.broadcast.emit("add chatter", client.nickname);

        redisClient.sadd("chatters", client.nickname);

        redisClient.smembers("chatters", function(err, names) {
            names.sort().forEach(function(name) {
                client.emit("add chatter", name);
            });
        });


        redisClient.lrange("messages", 0, -1, function(err, response) {
            messages = response.reverse();

            messages.forEach(function(message) {
                message = JSON.parse(message);
                client.emit("messages", message.name + ":" + message.data);
            });
        });

    });

    client.on('messages', function(data) {
        var name = client.nickname;

        client.broadcast.emit('messages', name + ":" + data);
        client.emit('messages', name + ":" + data)

        storeMessage(name, data);
    });

    client.on('disconnect', function() {
        redisClient.srem("chatters", client.nickname);
        client.broadcast.emit("remove chatter", client.nickname);
    });
});

server.listen(8080, function() {
    console.log("listening")
});