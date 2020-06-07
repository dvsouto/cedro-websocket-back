var net = require("net");
var fs = require('fs');

///////////////////////////////////////////////////////////

var authenticated = false;
var username = 'alesona';
var password = '102030';

var bolsa = {};

///////////////////////////////////////////////////////////

var socket = net.connect({
    port: 81,
    host: "datafeed1.cedrotech.com"
}, function(){
    console.log("Conectado no servidor");
});

socket.setEncoding('utf8');

socket.on('data', function(data){
    if (authenticated !== true)
        return auth_server(data);

    if (authenticated === true)
        return read_data(data);
});

socket.on('close', function(){
    console.log("Conexao fechada");
});

///////////////////////////////////////////////////////////

/**
 * Efetuar a autenticação no servidor
 * @param string data
 */
function auth_server(data)
{
    if (authenticated === true)
        return;

    console.log("Autenticando...");

    send_data('', function(){
        send_data(username, function(){
            send_data(password, function(){
                authenticated = true;
                console.log('Login efetuado');

                send_bqt('petr4');
            });            
        });
    });
}

function read_data(data)
{
    var received_method = data[0].toUpperCase();

    if (received_method != 'B')
        return;

    data = data.split("\n" + received_method + ":");

    for(var i = 0; i < data.length; i++)
    {
        data[i] = data[i].replace(/\n/, "");
        data[i] = data[i].replace(/\r/, "");

        if (data[i].substr(0, 2) === received_method + ":")
            data[i] = data[i].substr(2);

        explode = data[i].split(":");

        if (explode.length >= 2)
        {
            // var received_method = explode.shift().toUpperCase();
            var ativo = explode.shift().toLowerCase();
            // var method_data = {};

            // var to = false;
            // for(var i = 0; i < explode.length; i++)
            // {
            //     if (! to)
            //     {
            //         to = explode[i];
            //         method_data[to] = '';
            //     } else
            //     {
            //         method_data[to] = explode[i];
            //         to = false;
            //     }
            // }

            switch(received_method)
            {
                case "B":
                    read_bqt(ativo, explode.join(":"));
                break;
            }
        }
    }

    return false;
}

function read_bqt(ativo, data)
{
    // return console.log(data);
    // A:([0-9]*):([A?V]):([0-9.]*):([0-9.]*):([0-9.]*):([0-9.]{8}):([0-9.]*)[:]{0,1}([0-9.]*)[:]{0,1}([0-9.]*)[:]{0,1}([a-zA-Z0-9\s]*)[:]{0,1}
    var reader = new RegExp('A:([0-9]*):([A?V]):([0-9.]*):([0-9.]*):([0-9.]*):([0-9.]{8}):([0-9.]*)[:]{0,1}([0-9.]*)[:]{0,1}([0-9.]*)[:]{0,1}([a-zA-Z0-9\s]*)[:]{0,1}([L|X|M]{0,1})', 'umi');
    var transform = [
        'posicao',
        'direcao',
        'preco',
        'quantidade',
        'corretora',
        'data',
        'nova_posicao',
        'posicao_antiga',
        'tipo',
        'order_id',
        'tipo_oferta'
    ];
    
    var find = reader.exec(data);
    var parsed = {};

    if (data.length > 0 && find)
    {
        for(var i = 1; i < find.length; i++)
        {
            parsed[transform[i-1]] = find[i];
        }

        bolsa[ativo.toLowerCase()].book.push(parsed);
        console.log("Updated book: [" + ativo + "] " + data);
    } else if(data === 'E'){
        fs.writeFile("data/bqt_" + ativo + ".json", JSON.stringify(bolsa[ativo].book), function(e){
            if (e)
                console.log("Ocorreu um erro: " + e);
        }); 
        // console.log("FIM !!!!!!!!!!!");
    }


    // console.log('\n')
}

///////////////////////////////////////////////////////////

/**
 * Envia uma string para o servidor
 * @param string write
 * @param function callback
 * @author Davi Souto
 *         26/11/2017
 */
function send_data(write, callback)
{
    return socket.write(write + "\n", callback);
}

/**
 * Ativar o recebimento do negociações de um ativo
 * @param string ativo
 * @author Davi Souto
 *         26/11/2017
 */
function send_sqt(ativo)
{
    send_data('sqt ' + ativo);
}

/**
 * Ativar o recebimento do book de ofertas de um ativo
 * @param string ativo
 * @author Davi Souto
 *         26/11/2017
 */
function send_bqt(ativo)
{
    if (! bolsa[ativo])
    {
        bolsa[ativo] = {
            book: [],
            negociacoes: {}
        }
    }

    send_data('bqt ' + ativo);
}

///////////////////////////////////////////////////////////////////