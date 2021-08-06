const uws = require("uWebSockets.js");

class App{
    constructor(){
        this.routes = {message:null,all:null,get:{},set:{},put:{},post:{},delete:{},};
    }
    message(handler){this.routes.message = handler;}
    all(handler){this.routes.all = handler;}
    get(route,handler){this.routes.get[route] = handler;}
    set(route,handler){this.routes.set[route] = handler;}
    put(route,handler){this.routes.put[route] = handler;}
    post(route,handler){this.routes.post[route] = handler;}
    delete(route,handler){this.routes.delete[route] = handler;}
}

class Request{
    constructor(base_request,base_response,data){
        for(let key in data){
            this[key] = data[key];
        }
    }
    /*
        url:parsed.at,
        headers:{},
        body:parsed.body,
        method:'post',
        channel_id:ws.channel_id,
        request_id:parsed.id,
        session_id:ws.session_id,
        type:'websocket',
        auth:get_auth_token,
        ips:[enc.decode(ws.getRemoteAddressAsText())]
    */
}

class Response{
    constructor(request_id,base_response,signal,channel_id){
        this.base_response = base_response;
        this.request_id = request_id;
        this.headers = {};
        this.status = "200 OK";
        this.signal = signal;
        this.channel_id = channel_id;
    }
    set(key,value){this.headers[key] = value;return this;}
    status(value){this.status = value;return this;}
    json(value){
        if(this.channel_id){
            if(!this.request_id){return new engine.common.Error("not_found-request_id");}
            let do_send = engine.server.send(this.channel_id,{
                request_id:this.request_id,
                body:value
            });
            if(do_send instanceof engine.common.Error){
                return do_send.now("ws-response-send_failed").log();
            }
            return true;
        }
        this.signal();
        this.base_response.writeStatus(this.status);
        this.base_response.writeHeader("Content-Type",'application/json');
        for(let key in this.headers){
            this.base_response.writeHeader(key,this.headers[key]);
        }
        this.base_response.write(JSON.stringify(value));
        this.base_response.end();
        return;
    }
    send(value){
        if(this.channel_id){
            return new engine.common.Error("cannot_reply-non_Object-items");
        }
        this.signal();
        this.base_response.writeStatus(this.status);
        for(let key in this.headers){
            this.base_response.writeHeader(key,this.headers[key]);
        }
        this.base_response.write(value);
        this.base_response.end();
        return;
    }
}

module.exports = {
    Request:Request,
    Response:Response,
    app:new App(),
    send:send,
    init:init
};

let timers = {};
let connections = {};

function get_connection_id() {
    while(true){
        let uid = engine.uniqid();
        if(!timers.hasOwnProperty(uid)){return uid;}
    }
}

remove_expire();

function remove_expire(params) {
    setInterval(()=>{
        // console.log("expire");
    },10000);
}

function send(channel_id,body){
    if(body instanceof Object){body = JSON.stringify(body);}
    if(!connections[channel_id]){return new engine.common.Error("not_found-channel");}
    try{
        connections[channel_id].send(body);
        return true;
    }catch(e){
        console.log(e);
        return false;
    }
}

async function init(config){

    let builder;

    if(
        config.key &&
        config.cert &&
        config.password
    ){
        builder = uws.App({
            key_file_name:config.key,
            cert_file_name:config.cert,
            passphrase:config.password
        });
    } else {
        builder = uws.App({});
    }

    builder.ws('/*', {
      
        /* There are many common helper features */
        idleTimeout: 30,
        maxBackpressure: 1024,
        maxPayloadLength: 512,
        compression: uws.DEDICATED_COMPRESSOR_3KB,
        perMessageDeflate:true,

        open:(ws)=>{
            let conn_id = get_connection_id();
            ws.id = conn_id;
            ws.expire = engine.time.now() + (5 * 1000);
            ws.authenticated = false;
            setTimeout(()=>{
                if(ws.closed){return;}
                if(!ws.authenticated){ws.close();}
            },3000);
        },
      
        /* For brevity we skip the other events (upgrade, open, ping, pong, close) */
        message:async (ws, message, isBinary) => {

            let parsed;
            if(!isBinary){
                try{
                    let enc = new TextDecoder();
                    let as_text = enc.decode(message);
                    parsed = JSON.parse(as_text);
                }catch(_){
                    return false;
                }
            }

            if(!ws.authenticated){
                if(!(parsed instanceof Object)){ws.closed = true;return ws.close();}
                if(!parsed.token || typeof(parsed.token) !== "string"){return ws.close();}
                let verify = engine.auth.verify(parsed.token);
                if(verify instanceof engine.common.Error){ws.closed = true;return ws.close();}
                if(!verify.hasOwnProperty("channel_id")){ws.closed = true;return ws.close();}
                if(!engine.auth.sessions.authenticator){ws.closed = true;return ws.close();}
                let authenticate = await engine.auth.sessions.authenticate(verify.session_id);
                if(authenticate === false || (authenticate instanceof engine.common.Error))
                {ws.closed = true;return ws.close();}
                connections[verify.channel_id] = ws;
                ws.authenticated = true;
                ws.channel_id = verify.channel_id;
                ws.session_id = verify.session_id;
                ws.send(JSON.stringify({
                    auth:true
                }));
                return;
            }

            let get_auth_token = await engine.auth.sessions.authenticate(ws.session_id);
            if(!get_auth_token){
                ws.closed = true;
                return ws.close();
            }

            if(isBinary){
                if(engine.server.app.message){
                    await engine.server.app.message(ws.channel_id,message,true);
                }
                return;
            } else {
                if(!(parsed instanceof Object)){
                    return;
                }
            }

            if(
                parsed.hasOwnProperty("at") && 
                parsed.hasOwnProperty("id") && 
                parsed.hasOwnProperty("body") && 
                typeof(parsed.at) === "string" &&
                typeof(parsed.id) === "string" &&
                typeof(parsed.body) === "object"
            ){
                // console.log(engine.server.app.routes.post);
                if(engine.server.app.routes.post[parsed.at]){
                    let enc = new TextDecoder();
                    let build_request = new Request(null,null,{
                        url:parsed.at,
                        headers:{},
                        body:parsed.body,
                        method:'post',
                        channel_id:ws.channel_id,
                        request_id:parsed.id,
                        session_id:ws.session_id,
                        type:'websocket',
                        auth:get_auth_token,
                        ips:[enc.decode(ws.getRemoteAddressAsText())]
                    });
                    let build_response = new Response(parsed.id,null,()=>{
                        processed = true;
                    },ws.channel_id);
                    await engine.server.app.routes.post[parsed.at](build_request,build_response);
                    return;
                } else {
                    await engine.server.app.message(ws.channel_id,parsed,false);
                }
            } else if(engine.server.app.message){
                if(engine.server.app.routes.message){
                    await engine.server.app.routes.message(ws.channel_id,parsed,false);
                }
            }

        },

        close:(ws)=>{
            console.log("connection closed");
            // console.log(ws);
        }
        
      }).any('/*',(res, req) => {

        let url = req.getUrl();
        let method = req.getMethod();
        let headers = {};
        req.forEach((k,v)=>{headers[k] = v;});

        if(method === "options"){
            res.writeHeader("Access-Control-Request-Method","GET,HEAD,PUT,PATCH,POST,DELETE");
            res.writeHeader("Access-Control-Allow-Headers","content-type,td-wet-token");
            res.writeHeader("Access-Control-Allow-Origin",config.cors);
            res.writeHeader("Keep-Alive","timeout=8");
            res.writeHeader("Connection","keep-alive");
            res.end();
            return;
        } else {
            res.writeHeader("Access-Control-Allow-Origin",config.cors);
        }

        if(!module.exports.app.routes[method] && !module.exports.app.routes.all){
            res.writeStatus("404 Not Found");
            res.end();
            return;
        }
        if(!module.exports.app.routes[method][url] && !module.exports.app.routes.all){
            res.writeStatus("404 Not Found");
            res.end();
            return;
        }

        readJson(res,async (body)=>{

            let processed = false;

            let build_response = new Response(headers["td-wet-req"],res,()=>{
                processed = true;
            });

            let enc = new TextDecoder(),auth;
            if(headers["td-wet-token"] && false){
                let token = headers["td-wet-token"];
                let verify = engine.auth.verify(token);
                if(verify){
                    let authenticate = await engine.auth.sessions.authenticate(verify.session_id);
                    if(authenticate){
                        auth = authenticate;
                    }
                }
            }

            let build_request = new Request(null,null,{
                url:url,
                headers:headers,
                body:body,
                method:method,
                type:'rest',
                auth:auth,
                ips:[
                    enc.decode(res.getRemoteAddressAsText()),
                    enc.decode(res.getProxiedRemoteAddressAsText()),
                ]
            });

            if(!body){
                let run = await module.exports.app.routes.all(build_request,build_response);
                if(!processed){
                    res.writeStatus("500 Internal Server Error");
                    res.end();
                    return;
                }
                return;
            }

            if(!module.exports.app.routes[method]){
                res.writeStatus("404 Not Found");
                res.end();
                return;
            }
            if(!module.exports.app.routes[method][url]){
                res.writeStatus("404 Not Found");
                res.end();
                return;
            }

            if(module.exports.app.routes[method][url]){
                if(!headers['content-type']){
                    res.writeStatus("406 Not Acceptable");
                    res.end();
                    return;
                }
                let run = await module.exports.app.routes[method][url](build_request,build_response);
                if(!processed){
                    res.writeStatus("500 Internal Server Error");
                    res.end();
                    return;
                }
            } else {
                let run = await module.exports.app.routes.all(build_request,build_response);
                if(!processed){
                    res.writeStatus("500 Internal Server Error");
                    res.end();
                    return;
                }
            }

        });//readjson
        
      }).listen(config.port, (listenSocket) => {
        if (listenSocket) {
          console.log('Listening to port ' + config.port);
        }
      });
}

function readJson(res,handler) {
    
    let buffer;

    res.onData((ab, isLast)=>{

        let chunk = Buffer.from(ab);
        if (isLast) {
            if (buffer) {
                try {
                    let json = JSON.parse(Buffer.concat([buffer, chunk]));
                    handler(json);
                } catch (e) {
                    handler(false);
                    // res.writeStatus("500 Internal Server Error");
                    // res.end();
                }
            } else {
                try {
                    let json = JSON.parse(chunk);
                    handler(json);
                } catch (e) {
                    handler(false);
                    // res.writeStatus("500 Internal Server Error");
                    // res.end();
                }
            }
        } else {
            if (buffer) {
                buffer = Buffer.concat([buffer, chunk]);
            } else {
                buffer = Buffer.concat([chunk]);
            }
        }

    });

    res.onAborted(()=>{
        console.log("request aborted");
    });

  }