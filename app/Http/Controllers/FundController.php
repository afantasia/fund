<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Queue\Connectors\RedisConnector;

class FundController extends Controller
{
    //
    function index(Request $request){


        return view('fund.index');
    }
    function test(){
        $redis=new RedisConnector();
        $connect=$redis->connect('https://node.functions.tk');
        $result=$connect->push('!!?');
        dd($result);

    }
}
