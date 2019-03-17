@extends("themes.default.layouts.basic")

@section('title'){{ cache("config.homepage")->title }}@endsection

@section('include_css')
    <!-- common -->
    <link rel="stylesheet" type="text/css" href="{{ ver_asset('themes/default/css/common.css') }}">
@endsection

@section('headerUp')
    {{ fireEvent('headerUp') }}
    <script src="{{ ver_asset('js/socket.io.js') }}"></script>
@endsection

@section('content')
    <div id="chatLogs"></div>
    <form >
        <select id="target">
            <option value="notselfall">나빼고전부</option>
            <option value="all">전부</option>
            <option value="self">나만</option>
        </select><input type="text" id="msgForm" placeholder="적당히 입력해보면됨">

    </form>
    <script>
        function alertType(a){
            alert(a);
        }
        $(function(){

            // socket.io 서버에 접속한다
            var socket = io.connect('https://node.functions.tk/', {
                'connect timeout':1500 ,
                'sync disconnect on unload':true,
                'secure': true,
                'transports' : ['websocket', 'flashsocket', 'htmlfile', 'xhr-polling', 'jsonp-polling', 'polling']
            });

            // 서버로 자신의 정보를 전송한다.
            socket.emit("login", {
                // name: "ungmo2",
                name: makeRandomName(),
                userid: "ungmo2@gmail.com"
            });

            // 서버로부터의 메시지가 수신되면
            socket.on("login", function(data) {
                $("#chatLogs").append("<div><strong>" + data + "</strong> has joined</div>");
            });
            // 서버로부터의 함수호출 수신되면
            socket.on("recv", function(result) {
                (new Function(result.data.cmd))();
            });
            function sendFunc(castType,funcName,argv){
                socket.emit("callFunc", { castType:castType,functions:{funcName:funcName,argv:argv} });
            }
            $("form").submit(function(e) {
                e.preventDefault();
                var $msgForm = $("#msgForm");
                var castType=$("#target").val();
                var funcName='alertType';
                var argv=[$("#msgForm").val()];
                sendFunc(castType,funcName,argv);
            });

            function makeRandomName(){
                var name = "";
                var possible = "abcdefghijklmnopqrstuvwxyz";
                for( var i = 0; i < 3; i++ ) {
                    name += possible.charAt(Math.floor(Math.random() * possible.length));
                }
                return name;
            }
        });
    </script>
@endsection
