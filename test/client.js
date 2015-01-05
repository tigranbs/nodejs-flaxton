var client = require('../fxClient').CreateClient("127.0.0.1:8888");
var readline = require('readline');

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

client.data_recieved = function(data, socket){
    console.log(data.toString());
    resend(socket);
};


function resend(socket)
{
    rl.question("Type To Send: ", function(answer) {
        socket.send(answer.toString());
    });
}

client.connect(function(socket){
    resend(socket)
});
