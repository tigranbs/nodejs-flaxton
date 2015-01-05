//CONST VARIABLES
exports.END_DATA = '$';
//Fixed Pocket Length from UDP
exports.POCKET_LENGTH = 100;


//Returns { 'port': PORT, 'host': HOST } object from address string. Example '127.0.0.1:8888'
//Returns false if address is not correct
exports.parse_address = function(address){
    var splited = address.split(':');
    if(splited.length !== 2) {
        return false;
    }
    var host = splited[0]
        , port = splited[1];
    if(host == '') host = '0.0.0.0';
    return {
        port: port,
        host: host
    }
};

//Parsing TCP meta data from remote socket, returns object with data_id, data_length and data_pocket_length
// OR Data End symbol if remote ends sending data
//OR false if data is coruped
exports.parse_tcp_meta = function(data){
    if(data.length !== 12)
    {
        if(data.length > 2) return false;
        if(data.toString() == exports.END_DATA)
        {
            return exports.END_DATA;
        }
        return false;
    }
    return {
        data_id: data.slice(0, 4).readInt32BE(0),
        data_length: data.slice(4, 8).readInt32BE(0),
        data_pocket_count: data.slice(8, 12).readInt32BE(0)
    };
};

//Parsing UDP meta data for every pocket, returns object with data_id, data_index, data_body
// OR false if data is not with the same length
exports.parse_udp_meta = function(data, length) {
    if(length !== exports.POCKET_LENGTH) return false;
    return {
        data_id: data.slice(0, 4).readInt32BE(0),
        data_index: data.slice(4, 8).readInt32BE(0),
        data_body: data.slice(8, (length - 8))
    };
};

exports.combine_data = function(unsorted_object, data_length){
    var keys_array = Object.keys(unsorted_object)
        , buff_array = []
        , sortNumber = function(a,b) {
            return a - b;
        };
    keys_array.sort(sortNumber);
    for(var i in keys_array)
    {
        buff_array.push(unsorted_object[keys_array[i]]);
    }
    return Buffer.concat(buff_array, data_length).slice(0, data_length);
};