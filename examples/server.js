const keys = require("./secure.json");
global.engine = require("../index.js");
require('dotenv').config();

main();

async function main(){

  //---------------------------
  //load rsa keys
  //---------------------------
  let loadKeys = engine.auth.loadKeys(keys.private,keys.public);
  if(loadKeys instanceof engine.common.Error){
    return loadKeys.now("failed-load_keys").log();
  }

  //---------------------------
  //create token example
  //---------------------------
  let make_token = engine.auth.createToken({
    session_id:engine.md5(engine.uniqid()),
    channel_id:engine.md5("user")
  });
  if(make_token instanceof engine.common.Error){
    return make_token.log();
  }

  let verify = engine.auth.verify(make_token);
  if(verify instanceof engine.common.Error){
    return verify.log();
  }

  //---------------------------
  //add base dir for static file
  //---------------------------

  engine.server.app.base_dir(process.env.FILES_DIR);

  //---------------------------
  //add session auth function
  //---------------------------
  engine.auth.sessions.add_auth_function((session_id)=>{
    return {
      session_id:session_id,
      uid:'some',
      channel_id:engine.md5("user"),
    };
  });

  //---------------------------
  //add http request handler for non route requests
  //---------------------------
  engine.server.app.all((req,res)=>{
    res.send("hello world");
  });

  //---------------------------
  //add message handler
  //---------------------------
  engine.server.app.message((channel_id,message,isBinary)=>{
    console.log(message);
    return true;
  });

  //---------------------------
  //send file
  //---------------------------
  engine.server.app.get("/file",(req,res)=>{
    res.sendFile(process.env.FILES_DIR+"\\5g19f7.jpg");
  });

  //---------------------------
  //login function
  //---------------------------
  engine.server.app.post("/login",(req,res)=>{
    let make_token = engine.auth.createToken({
      channel_id:engine.md5("user"),
      uid:"some",
    });
    res.json({
      token:make_token
    });
  });

  //---------------------------
  //unprotected get api 
  //---------------------------
  engine.server.app.get("/get",async (req,res)=>{
    res.json({
      hello:'get'
    });
  });

  //---------------------------
  //unprotected api 
  //---------------------------
  engine.server.app.post("/some",async (req,res)=>{
    res.json({
      some:true
    });
  });

  //---------------------------
  //protected route 
  //---------------------------
  engine.server.app.post("/protected",async (req,res)=>{
    let verify = await engine.auth.verifyRequest(req);
    if((verify instanceof engine.common.Error)){
      return false;
    } 
    res.json({
      protected:true
    });
  });

  //---------------------------
  //start server 
  //---------------------------
  engine.server.init({
    port:8080,
    cors:"*",
  });

}