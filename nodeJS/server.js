var fs = require('fs');
var serverEnv = new Array();
var envData = fs.readFileSync(__dirname+'/.env', 'utf8');
var dataArr = envData.split('\n');
var tmpArr = new Array();

for (var loopVar=0; loopVar<dataArr.length; loopVar++) {
    tmpArr = dataArr[loopVar].split('=');
    serverEnv[tmpArr[0]] = tmpArr[1];
}

var redis = require('redis');
var redisAdapter = require('socket.io-redis');
var options = {
    //key : fs.readFileSync('/home/nodejs/www/'+serverEnv['APP_DOMAIN']+'.key'),
    //cert : fs.readFileSync('/home/nodejs/www/'+serverEnv['APP_DOMAIN']+'.crt'),
    //ca : fs.readFileSync('/home/nodejs/www/'+serverEnv['APP_DOMAIN']+'.ca')
};

var app = require('https').createServer(options, handler).listen(443);
var io = require('socket.io').listen(app);

var redisPub = redis.createClient(6379, serverEnv['REDIS_SERVER']);
// return_buffers 값이 없으면 trailing bytes 발생
//var redisSub = redis.createClient(6379, serverEnv['REDIS_SERVER'], { return_buffers: true });
var redisSub = redis.createClient(6379, serverEnv['REDIS_SERVER']);
var redisClient = redis.createClient(6379, serverEnv['REDIS_SERVER']);
var eHandshake;

io.adapter(redisAdapter({pubClient : redisPub, subClient : redisSub }));

process.on("uncaughtException", function (err) {
    var fc_now = fc_time();
    // console.log("end_server----- end_server----- end_server-----" + fc_now['date'] + " " + fc_now['time']);
    // console.log(err);
    // console.log(eHandshake);
    // console.log("----------------------------------");
    process.exit();
});

process.on("exit", function (err) {
    console.log("exit");
    fc_logging('exit');
});

process.on("SIGINT", function (err) {
    console.log("SIGINT");
    fc_logging('SIGINT');
});

// require('child_process').spawn('node', ['tm_server_child.js']);
io.of('/cl').use(function(socket, callback) {
    var allow_url = ['http://touchmints.com', 'http://www.touchmints.com'];
    var handshakeData = socket.request;
    eHandshake = handshakeData;
    var oR = handshakeData.headers.referer;
    //var oIP = handshakeData.address.address; // handshakeData.address 가 undefine 의 경우가 있음
    // var oQ = handshakeData.query.q;
    // var oN = handshakeData.query.n;

    if (!oR) {
        var fc_now = fc_time();
        // console.log("---deny---deny---deny---deny---deny---deny"+fc_now['date']+" "+fc_now['time']);
        // console.log(handshakeData);
        callback(null, false);
        return;
    }

    //if (oR.indexOf("symflow.com")!=-1 || oR.indexOf("irskr.com")!=-1 || oR.indexOf("dcboard.jp")!=-1 || oR.indexOf("ibosrs.com")!=-1 || oR.indexOf("dcsurvey.jp")!=-1 || oR.indexOf("onqna.net")!=-1) {
    callback(null, true);
    return;
    //}

    fc_logging('---deny---deny---deny---deny---deny---deny /oQ '+oQ+' /oN '+oN);
    callback(null, false);
});

io.of('/cl').on('connection', function(socket) {
    fc_logging('connect');
    console.log('connection');
    var joinedRoom = null;
    var joinedRoomStr      = '';
    var socketIdStr       = '';
    var socketTypeStr     = '';
    var nicknameStr        = '';
    var permitStr            = '';
    var isLiveSurveyStr         = '';

    // 심플로우 계정 접속
    socket.on('join room', function(loomName, userId, permit, isLiveSurvey) {
        socket.join(loomName);
        console.log('+++++++++++++++++++++++++++');
        console.log('join room entered');
        console.log('userId : ' + userId);
        console.log('joinedRoom : ' + loomName);
        console.log('+++++++++++++++++++++++++++');
        joinedRoom = loomName;
        isLiveSurveyStr = isLiveSurvey;

        if(joinedRoom != null) {
            joinedRoomStr = joinedRoom.toString();
        }
        if(socket.id != null) {
            socketIdStr = socket.id.toString();
        }
        if(socket.conn.transport.name != null) {
            socketTypeStr = socket.conn.transport.name.toString();
        }
        if(userId != null) {
            nicknameStr = userId.toString();
        }
        if(permit != null) {
            permitStr = permit.toString();
        }
        if(isLiveSurvey != null) {
            isLiveSurveyStr = isLiveSurvey.toString();
        }

        redisClient.hmset(joinedRoom+'_'+userId+'_'+socketIdStr, {
            'joinedRoom' : joinedRoomStr,
            'socketId'  : socketIdStr,
            'socketType': socketTypeStr,
            'nickname'   : nicknameStr,
            'permit'       : permitStr,
            'isLiveSurvey'    : isLiveSurveyStr
        }, redis.print);
        redisClient.expire(joinedRoom+'_'+userId+'_'+socketIdStr, 86400);

        now_clients_num(joinedRoom, socket, nicknameStr, isLiveSurvey, true);
        socket.emit('sock', {'socketId' : socketIdStr, 'joinedRoom' : joinedRoom});
    });



    // 클라이언트로부터의 함수가 수신되면
    socket.on('callFunc', function(data) {
        for (var i in data.functions.argv){
            if(typeof data.functions.argv[i] == "string"){
                data.functions.argv[i]="'"+data.functions.argv[i]+"'";
            }
        }
        var sendData = {
            from: {
                name: socket.name,
                userid: socket.userid
            },
            data:{cmd:data.functions.funcName+'('+data.functions.argv.join(',')+')'},

        };
        console.log(sendData);
        if(data.castType=='notselfall'){
            // 메시지를 전송한 클라이언트를 제외한 모든 클라이언트에게 메시지를 전송한다
            socket.broadcast.emit('recv', sendData);
        }else if(data.castType=='all'){
            // 접속된 모든 클라이언트에게 메시지를 전송한다
            io.emit('recv', sendData);
        }else if(data.castType=='self'){
            // 메시지를 전송한 클라이언트에게만 메시지를 전송한다
            io.emit('recv', sendData);
        }else if(data.castType=='target'){
            // 특정 클라이언트에게만 메시지를 전송한다
            io.to(data.target).emit('s2c chat', sendData);
        }
    });

});

fetch_unix_timestamp = function()
{
    //return parseInt(new Date().getTime().toString().substring(0, 10));
    //return Math.floor(new Date().getTime() / 1000);
    // 1 / 1000 초까지
    return Math.floor(new Date().getTime());
};

timestamp = fetch_unix_timestamp();

function now_clients_num (joinedRoom, socket, userId, isLiveSurvey, isConnect) {
    if (!isConnect) {
        redisClient.del(joinedRoom+'_'+userId+'_'+socket.id);
    }

    redisClient.keys(joinedRoom+'_*', function (err, joinList) {
        var joinCount = joinList.length;
        var nowT = fetch_unix_timestamp();

        // 2018.05.17 제거
        // for (var loopVar=0; loopVar<joinCount; loopVar++) {
        //     redisClient.hgetall(joinList[loopVar], function (err, userInfo) {
        //         if (userInfo.permit.charAt(1) ==='1') {
        //             socket.to(userInfo.socketId).emit('clients changed', { nowC : joinCount, nowT : nowT });
        //             fc_logging('clients changed' + ' / nowC ' + joinCount + ' / nowT ' + nowT);
        //         }
        //     });
        // }

        if (isConnect) {
            fc_logging(joinedRoom+' / '+socket.id+' ('+socket.conn.transport.name+') Connected' + ' / nowC ' + joinCount + ' / nowT ' + nowT + ' / userId ' + userId + ' / isLiveSurvey '+isLiveSurvey);
        } else {
            fc_logging(joinedRoom+' / '+socket.id+' ('+socket.conn.transport.name+') disconnect' + ' / nowC ' + joinCount + ' / nicknameStr ' + userId);
        }
        // socket.emit('joined', { nowC : joinCount, nowT : nowT });
        socket.to(joinedRoom).emit('joined', { nowC : joinCount, nowT : nowT });
        socket.emit('joined', { nowC : joinCount, nowT : nowT });
    });
    return;
}

function fc_logging (msg) {
    var fc_now = fc_time();
    var output_msg = fc_now['time'] + ' - ' + msg;
    console.log(output_msg);
    // 2018.05.17 제거
    // fs.appendFile('/home/nodejs/www/log_socket/socket_'+fc_now['date']+'.txt', output_msg + '\r\n', function (err) {if (err) throw err;});
    return;
}

function handler (req, res) {
    if (req.url === '/connected.png') {
        fs.readFile(__dirname+'/connected.png', function(err, data){
            res.writeHead(200);
            res.end(data);
        });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Request-Method', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if ( req.method === 'OPTIONS' ) {
        res.writeHead(200);
        res.end();
        return;
    }

    return;
}

function fc_time_zero(ttt) {
    return (ttt<10) ? '0' + ttt : ttt;
}

function fc_time () {
    currentDate = new Date();
    var fc_year = currentDate.getFullYear()
        , fc_month = fc_time_zero(currentDate.getMonth()+1)
        , fc_day = fc_time_zero(currentDate.getDate())
        , fc_sec = fc_time_zero(currentDate.getSeconds())
        , fc_min = fc_time_zero(currentDate.getMinutes())
        , fc_hour = fc_time_zero(currentDate.getHours())
        , fc_msec = currentDate.getMilliseconds()
        , fc_now_array = new Array();

    fc_now_array['time'] = fc_hour+':'+ fc_min+':'+fc_sec+'.'+ String(fc_msec).substr(0,2);
    fc_now_array['date']= String(fc_year)+String(fc_month)+String(fc_day);
    return fc_now_array;
}

var fc_now = fc_time();




/*
var app = require('express')();
var server = require('http').createServer(app);
// http server를 socket.io server로 upgrade한다
var io = require('socket.io')(server);

// localhost:3000으로 서버에 접속하면 클라이언트로 index.html을 전송한다
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

// connection event handler
// connection이 수립되면 event handler function의 인자로 socket인 들어온다
io.on('connection', function(socket) {

    // 접속한 클라이언트의 정보가 수신되면
    socket.on('login', function(data) {
        console.log('Client logged-in:\n name:' + data.name + '\n userid: ' + data.userid);
        // socket에 클라이언트 정보를 저장한다
        socket.name = data.name;
        socket.userid = data.userid;
        // 접속된 모든 클라이언트에게 메시지를 전송한다
        io.emit('login', data.name );
    });



    // 클라이언트로부터의 함수가 수신되면
    socket.on('callFunc', function(data) {
        for (var i in data.functions.argv){
            if(typeof data.functions.argv[i] == "string"){
                data.functions.argv[i]="'"+data.functions.argv[i]+"'";
            }
        }
        var sendData = {
            from: {
                name: socket.name,
                userid: socket.userid
            },
            data:{cmd:data.functions.funcName+'('+data.functions.argv.join(',')+')'},

        };
        console.log(sendData);
        if(data.castType=='notselfall'){
            // 메시지를 전송한 클라이언트를 제외한 모든 클라이언트에게 메시지를 전송한다
            socket.broadcast.emit('recv', sendData);
        }else if(data.castType=='all'){
            // 접속된 모든 클라이언트에게 메시지를 전송한다
            io.emit('recv', sendData);
        }else if(data.castType=='self'){
            // 메시지를 전송한 클라이언트에게만 메시지를 전송한다
            io.emit('recv', sendData);
        }else if(data.castType=='target'){
            // 특정 클라이언트에게만 메시지를 전송한다
            io.to(data.target).emit('s2c chat', sendData);
        }
    });



    // force client disconnect from server
    socket.on('forceDisconnect', function() {
        socket.disconnect();
    });

    socket.on('disconnect', function() {
        console.log('user disconnected: ' + socket.name);
    });
});

server.listen(3000, function() {
    console.log('Socket IO server listening on port 3000');
});
*/