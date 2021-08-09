const uws = require("uWebSockets.js");
const fs = require("fs/promises");

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
    base_dir(dir){this.dir = dir;}
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
    constructor(request_id,base_response,signal,channel_id,cors){
        this.base_response = base_response;
        this.request_id = request_id;
        this.headers = {};
        this.status = "200 OK";
        this.signal = signal;
        this.channel_id = channel_id;
        this.cors = cors;
    }
    set(key,value){this.headers[key] = value;return this;}
    set_status(value){this.status = value;return this;}
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
        if(this.cors){this.base_response.writeHeader("Access-Control-Allow-Origin",this.cors);}
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
        if(this.cors){this.base_response.writeHeader("Access-Control-Allow-Origin",this.cors);}
        for(let key in this.headers){
            this.base_response.writeHeader(key,this.headers[key]);
        }
        this.base_response.write(value);
        this.base_response.end();
        return;
    }
    async sendFile(location){

        this.signal();

        let open = await fs.open(location)
        .then((file)=>{
            return file;
        })
        .catch((_)=>{
            return false; 
        });
        
        if(!open){
            this.base_response.writeStatus("404 Not Found");
            this.base_response.write("not found");
            this.base_response.end();
            return new engine.common.Error("failed-open_file");
        }

        function send_error(e){
            this.signal();
            this.base_response.writeStatus("500 Internal Server Error");
            this.base_response.write("not found");
            this.base_response.end();
            open.close();
            return new engine.common.Error("failed-send_file => "+e);
        }

        let stat = await open.stat();
        let block_size = 1000 * 1000 * 10;//bytes
        let offset = 0;
        let size = stat.size;

        if(
            !this.base_response.writeHeader("Content-Type",engine.mime.getType(location)) ||
            !this.base_response.writeHeader("Content-Length",stat.size.toString())
        ){return send_error("set_headers");}

        while(size > 0){
            let read_size = block_size;
            if(size < block_size){read_size = size;}
            let buffer = Buffer.alloc(read_size);
            let read_result = await open.read(buffer,0,read_size,offset);
            if(!this.base_response.write(new Uint8Array(buffer))){return send_error("write_data");}
            if(size > block_size){
                size -= block_size;
                offset += block_size;
            }
            else {
                offset += size;
                size -= size;
            }
        }

        this.base_response.end();
        open.close();

        return true;

    }

}

class ResponseHandler{
    constructor(res){
        this.res = res;
    }
    writeHeader(key,value){
        try {
            this.res.writeHeader(key,value);
            return true;
        } catch (_) {
            return false;
        }
    }
    writeStatus(status){
        try {
            this.res.writeStatus(status);
            return true;
        } catch (_) {
            return false;
        }
    }
    write(data){
        try {
            this.res.write(data);
            return true;
        } catch (_) {
            return false;
        }
    }
    end(){
        try {
            this.res.end();
            return true;
        } catch (_) {
            return false;
        }
    }
    onData(handler){
        try {
            this.res.onData(handler);
            return true;
        } catch (_) {
            return false;
        }
    }
    onAborted(handler){
        try {
            this.res.onAborted(handler);
            return true;
        } catch (_) {
            return false;
        }
    }
    getRemoteAddressAsText(){
        try {
            let fetch = this.res.getRemoteAddressAsText();
            return fetch;
        } catch (_) {
            return false;
        }
    }
    getProxiedRemoteAddressAsText(){
        try {
            let fetch = this.res.getProxiedRemoteAddressAsText();
            return fetch;
        } catch (_) {
            return false;
        }
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

    if(!config.file_read_chunk_size){
        config.file_read_chunk_size = 1000 * 1000 * 10;//bytes //10 Mega-Bytes
    }

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
        
      }).any('/*',async (base_res, req) => {

        let res = new ResponseHandler(base_res);

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
        }

        readJson(res,async (body)=>{

            let processed = false;

            let build_response = new Response(headers["td-wet-req"],res,()=>{
                processed = true;
            },null,config.cors);

            let enc = new TextDecoder(),auth;
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

            if(module.exports.app.routes[method][url]){
                let run = await module.exports.app.routes[method][url](build_request,build_response);
                if(!processed){
                    res.writeStatus("500 Internal Server Error");
                    res.end();
                    return;
                }
            } else {

                //------------------------------------------------
                //check if file exists
                //------------------------------------------------

                if(module.exports.app["dir"]){
                    let full_path = module.exports.app["dir"] + url;
                    while(full_path.indexOf("%20") >=0){
                        full_path = full_path.replace("%20"," ");
                    }
                    let open = await fs.open(full_path)
                    .then((d)=>{return d;}).catch(()=>{return false;});
                    if(open){

                        let range;
                        if(headers["Range"] || headers["range"] || headers["content-range"]){
                            range = parse_range_header(
                                headers["Range"] || headers["range"] || headers["content-range"]
                                );
                            if(!range){
                                if(!res.end()){
                                    open.close();
                                    return false;
                                }
                            } else {
                                if(!res.writeStatus("206 Partial Content")){
                                    open.close();
                                    return false;
                                }
                            }
                        } else {
                            if(!res.writeHeader("Accept-Ranges","bytes")){
                                open.close();
                                return false;
                            }
                        }
                        
                        let stat = await open.stat();
                        let block_size = config.file_read_chunk_size;//bytes
                        let offset = 0;
                        let size = stat.size;

                        if(range){

                            if(range.end){
                                if(
                                    (range.end > size) ||
                                    (range.end < range.start)
                                ){
                                    if(
                                        !res.writeStatus("416 Range Not Satisfiable") || 
                                        !res.end()
                                    ){
                                        open.close();
                                        return false;
                                    }
                                }
                            }
                            let range_size;
                            if(range.end){
                                range_size = range.end - range.start;
                            } else {
                                range_size = size - range.start;
                            }
                            size = range_size;
                            offset = range.start;
                            if(!range.end){range.end = stat.size;}
                            if(!res.writeHeader(
                                "Content-Range",
                                `${range.unit} ${range.start}-${range.end}/${stat.size}`
                            )){
                                open.close();
                                return false;
                            }
                        } else {
                            let get_mime = engine.mime.getType(full_path);
                            if(
                                !res.writeHeader("Content-Type",get_mime) ||
                                !res.writeHeader("Content-Length",stat.size.toString())
                            ){
                                open.close();
                                return false;
                            }
                        }

                        while(size > 0){
                            let read_size = block_size;
                            if(size < block_size){read_size = size;}
                            let buffer = Buffer.alloc(read_size);
                            let read_result = await open.read(buffer,0,read_size,offset);
                            if(!res.write(new Uint8Array(buffer))){
                                open.close();
                                return false;
                            }
                            if(size > block_size){
                                size -= block_size;
                                offset += block_size;
                            }
                            else {
                                offset += size;
                                size -= size;
                            }
                        }
                        res.end();
                        open.close();
                        return;
                    }
                }//send file if exists

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

function parse_range_header(header){
    if(typeof(header) !== "string"){return false;}
    let re = /([\w]*)\s*=\s*([\d]*)\s*-\s*([\d]*)/;
    let match = header.match(re);
    if(!match){return false;}
    if(!match[0]){return false;}
    return {
        unit:match[1],
        start: !isNaN(match[2]) ? Number(match[2]) : 0,
        end: !isNaN(match[3]) ? Number(match[3]) : null
    };
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
        // console.log("request aborted");
    });

  }