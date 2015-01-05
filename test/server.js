var server = require("../fxServer").CreateServer("0.0.0.0:8888");

server.data_recieved = function(data, socket){
    console.log(data.toString());
    socket.send("bbbbbbbbbbbbbbbbbb");
};

server.listen();