
function FxServer(address){
    this.address = address;
    this.udp_socket = dgram.createSocket('udp4');
    this.fxSockets = {}; // key-value, data_id->FxSocket For every connected Client
    this.data_recieved = function(){};
}


// including useful libs
var dgram = require('dgram')
    , net = require('net')
    , fxLib = require('./fxLib')
    , fxSocket = require('./fxSocket');

FxServer.prototype.tcp_handler = function(socket){
    var server = this
        , fxSockets = {};

    socket.on('data', function(data){
        var r = fxLib.parse_tcp_meta(data);
        if(r == false) return;
        if(r == fxLib.END_DATA) {
            for(var i in fxSockets)
            {
                server.fxSockets[fxSockets[i]].stop_udp = true;
            }
            return;
        }
        if(!(r.data_id in server.fxSockets))
        {
            server.fxSockets[r.data_id] = new fxSocket.CreateSocket(socket, server.udp_socket);
            server.fxSockets[r.data_id].on('data', function(fxData){
                var new_socket = new fxSocket.CreateSocket(socket, server.udp_socket, server.fxSockets[r.data_id].remote_udp);
                delete server.fxSockets[r.data_id];
                delete fxSockets[r.data_id];
                server.data_recieved(fxData, new_socket);
            });
            fxSockets[r.data_id] = r.data_id;
        }
        server.fxSockets[r.data_id].tcp_data(r);
    });

    socket.on('end', function(){
        for(var i in fxSockets)
        {
            delete server[i];
            delete fxSockets[i];
        }
    });
};

FxServer.prototype.TCP_SERVER = function(){
    var fxServer = this
        , addr = fxLib.parse_address(fxServer.address);
    net.createServer(function (socket) {
        fxServer.tcp_handler(socket);
    }).listen(addr.port, addr.host);
};

FxServer.prototype.UDP_SERVER = function(){
    var fxServer = this
        , addr = fxLib.parse_address(fxServer.address);

    fxServer.udp_socket.on('message', function (message, remote) {
        var r = fxLib.parse_udp_meta(message, message.length);
        if(r == false) return;
        if(!(r.data_id in fxServer.fxSockets)) return;
        fxServer.fxSockets[r.data_id].udp_message(r, remote);
    });

    fxServer.udp_socket.bind(addr.port, addr.host);
};

FxServer.prototype.listen = function(){
    this.UDP_SERVER();
    this.TCP_SERVER();
};


exports.CreateServer = function(address){
    return new FxServer(address);
};