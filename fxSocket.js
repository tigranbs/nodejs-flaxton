//Used Types
function FxMetaData(data_id, length, pocket_count){
    this.data_id = data_id;
    this.length = length;
    this.pocket_count = pocket_count;
    this.data = {}; // key-value, int->Buffer, must be pocket_count length
}


// including useful libs
var dgram = require('dgram')
    , fxLib = require('./fxLib')
    , async = require('async');


// Socket handler for Flaxton Protocol
// remote_udp Could be object with { port: REMOTE_PORT, address: REMOTE_ADDRESS }
function FxSocket(remote_tcp, udp_socket, remote_udp){
    this.remote_udp = remote_udp;
    this.udp_socket = udp_socket;
    this.remote_tcp = remote_tcp;
    this.socket_data = {}; // key-value, data_id->FxMetaData
    this.stop_udp = false;
    this._events = {
        'data': function(fx_meta, buffer){}
        //TODO: may be some other events, need to think about
    };
}

FxSocket.prototype.tcp_data = function(fxMeta){
    //fxSocket._events['data'](r, data);
    this.socket_data[fxMeta.data_id] = new FxMetaData(fxMeta.data_id, fxMeta.data_length, fxMeta.data_pocket_count);
};

//Recieve Data for UDP socket
FxSocket.prototype.udp_message = function(fxMeta, remote_udp){
    var fxSocket = this;
    fxSocket.remote_udp = remote_udp;
    if(!(fxMeta.data_id in fxSocket.socket_data)) return;
    if(fxMeta.data_index in fxSocket.socket_data[fxMeta.data_id].data) return;
    fxSocket.socket_data[fxMeta.data_id].data[fxMeta.data_index] = fxMeta.data_body;
    if(Object.keys(fxSocket.socket_data[fxMeta.data_id].data).length == fxSocket.socket_data[fxMeta.data_id].pocket_count)
    {
        fxSocket.remote_tcp.write(fxLib.END_DATA);
        fxSocket._events['data'](fxLib.combine_data(fxSocket.socket_data[fxMeta.data_id].data, fxSocket.socket_data[fxMeta.data_id].length));
    }
};

// Function for defining available events
FxSocket.prototype.on = function(name, callback){
    if(typeof callback != 'function') return;
    if(name in this._events) this._events[name] = callback;
};

// Send Data using Socket Handler
// message - Buffer object or String
FxSocket.prototype.send = function(message, sent_callback) {
    if(typeof message == "string") message = new Buffer(message);
    var data_id = new Buffer(4)
        , pocket_count = new Buffer(4)
        , data_length = new Buffer(4)
        , pocket_count_number = Math.floor((message.length/(fxLib.POCKET_LENGTH - 8)) + 1);
    data_id.writeInt32BE((Math.floor((Math.random() * (Math.pow(2,20) - 1)) + 1)), 0);
    pocket_count.writeInt32BE(pocket_count_number, 0);
    data_length.writeInt32BE(message.length, 0);

    var tcp_meta = Buffer.concat([data_id, data_length, pocket_count], 12);
    this.remote_tcp.write(tcp_meta);
    this.stop_udp = false;

    // Create Send pockets
    var udp_pockets = []
        , start_key = 0
        , move_key = fxLib.POCKET_LENGTH - 8;
    for(var i=0; i < pocket_count_number; i++)
    {
        var pocket_index = new Buffer(4)
            , pocket_body = message.slice(start_key, start_key + move_key);
        pocket_index.writeInt32BE(i, 0);
        udp_pockets.push(Buffer.concat([data_id, pocket_index, pocket_body], fxLib.POCKET_LENGTH));
        start_key += move_key;
    }
    var fxSocket = this;

    async.forever(function(more){
        if(fxSocket.stop_udp) more("end!");
        async.each(udp_pockets, function(pocket, next){
            fxSocket.udp_socket.send(pocket, 0, pocket.length, fxSocket.remote_udp.port, fxSocket.remote_udp.address, function(){
                next();
            });
        }, function(err){
            more();
        });
    }, function(err){
        if(typeof sent_callback == 'function') sent_callback();
    });
};

exports.CreateSocket = function(remote_tcp, udp_socket, remote_udp){
    return new FxSocket(remote_tcp, udp_socket, remote_udp);
};