

const engine = require("./engine/index.js");
const keys = require("./secure/secure.json");
global.engine = require("./engine/index.js");

main();

async function main(){

  let loadKeys = engine.auth.loadKeys(keys.private,keys.public);
  if(loadKeys instanceof engine.common.Error){
    return loadKeys.now("failed-load_keys").log();
  }

  let make_token = engine.auth.createToken({
    channel_id:engine.md5("user"),
    uid:"some",
  });
  if(make_token instanceof engine.common.Error){
    return make_token.log();
  }

  let verify = engine.auth.verify(make_token);
  if(verify instanceof engine.common.Error){
    return verify.log();
  }

  engine.auth.sessions.add_auth_function((session_id)=>{
    return {
      session_id:session_id,
      uid:'some',
      channel_id:engine.md5("user"),
    };
  });

  engine.server.app.all((req,res)=>{
    res.send("hello world");
  });

  engine.server.app.message((channel_id,message,isBinary)=>{
    console.log(message);
    return true;
  });

  engine.server.app.post("/login",(req,res)=>{
    let make_token = engine.auth.createToken({
      channel_id:engine.md5("user"),
      uid:"some",
    });
    res.json({
      token:make_token
    });
  });

  engine.server.app.post("/some",async (req,res)=>{
    let verify = await engine.auth.verifyRequest(req);
    if((verify instanceof engine.common.Error)){
      return false;
    } 
    res.json({
      hello:true
    });
  });

  engine.server.init({
    port:8080,
    cors:"*",
  });

}