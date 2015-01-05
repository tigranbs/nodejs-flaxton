// including useful libs
var dgram = require('dgram')
    , net = require('net')
    , fxLib = require('./fxLib')
    , fxSocket = require('./fxSocket');


function FxClient(address){
    this.address = address;
    this.udp_socket = dgram.createSocket('udp4');
    this.tcp_socket = new net.Socket();
    this.fxSockets = {}; // key-value, data_id->FxSocket For every connected Client
    this.data_recieved = function(){};
}

FxClient.prototype.connect = function(callback){
    var client = this
        , fxSockets = {};
    this.tcp_socket.connect(client.address.port, client.address.host, function(){
        var new_socket = new fxSocket.CreateSocket(client.tcp_socket, client.udp_socket
            , {
                port: client.address.port,
                address: client.address.host
            });
        // Listen UDP
        client.udp_socket.on('message', function (message, remote) {
            var r = fxLib.parse_udp_meta(message, message.length);
            if(r == false) return;
            if(!(r.data_id in client.fxSockets)) return;
            client.fxSockets[r.data_id].udp_message(r, remote);
        });

        client.udp_socket.bind();

        callback(new_socket);
    });

    this.tcp_socket.on('data', function(data){
        var r = fxLib.parse_tcp_meta(data);
        if(r == false) return;
        if(r == fxLib.END_DATA) {
            for(var i in fxSockets)
            {
                client.fxSockets[fxSockets[i]].stop_udp = true;
            }
            return;
        }

        if(!(r.data_id in client.fxSockets))
        {
            var new_socket = new fxSocket.CreateSocket(client.tcp_socket, client.udp_socket);
            new_socket.on('data', function(fxData){
                var new_socket =  new fxSocket.CreateSocket(client.tcp_socket, client.udp_socket, client.fxSockets[r.data_id].remote_udp);
                delete client.fxSockets[r.data_id];
                delete fxSockets[r.data_id];
                client.data_recieved(fxData, new_socket);
            });
            client.fxSockets[r.data_id] = new_socket;
            fxSockets[r.data_id] = r.data_id;
        }
        client.fxSockets[r.data_id].tcp_data(r);
    });

    this.tcp_socket.on('end', function(){
        for(var i in fxSockets)
        {
            delete client[i];
            delete fxSockets[i];
        }
    });
};


exports.CreateClient = function(address){
    var addr = fxLib.parse_address(address);
    if(addr == false) return addr;
    return new FxClient(addr);
};