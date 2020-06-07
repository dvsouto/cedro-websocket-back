var server = require('http').createServer();
var io = require('socket.io')(server);
var fs = require('fs');

io.on('connection', function(client){
    // client.on('event', function(data){
    //   console.log('event: ' + data);
    // });

    client.on('disconnect', function(){
        console.log("Conexao fechada");
    });

    client.on('read_bqt', function(ativo){
        ativo = ativo.toLowerCase();

        fs.readFile('data/bqt_' + ativo + '.json', function(e, data){
            if (e)
                return [];

            return client.emit('bqt_data', { 'ativo': ativo, 'data': JSON.parse(data) });
        });
    });

    console.log("Conexao estabelecida");
});

server.listen(3000);
console.log("Servidor iniciado na porta 3000");