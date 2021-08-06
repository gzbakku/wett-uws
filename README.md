# wett-uws

wett-uws is a wett api with a uws backend, this is a rest and websockets backend framework, which provides all the nessecary tools to start a backend service which inclused db, io, auth and server.
        
# Installtion

```cmd
npm i wett-uws
```

# services

wett-uws comes with all neccesary tools to start a backend services which you can learn within 10 minutes

## 1. Server

wett-uws server service comes with rest and websockets api's backed by uWebSockets.js its fast thats all you need to know.

### checkout uWebSockets.js at -
https://github.com/uNetworking/uWebSockets.js/

### 1.1. Rest Http api
all functions and methods of this api is defined below in code.

```javascript
global.engine = require("wett-uws");

function main(){
    
    //global rest request handler
    engine.server.app.all((req,res)=>{
        res.send("hello world");
    });

    //global websocket message handler
    engine.server.app.message((channel_id,message,isBinary)=>{
        console.log(message);
        return true;
    });
    
    //add some route to post method
    engine.server.app.post("/some",async (req,res)=>{
        res.json({
          hello:true
        });
    });
    
    //start server
    engine.server.init({
        port:8080,
        cors:"*",
    });
    
}

```

server controller has inbuilt routing which can be routed through the following sub functions

###

```javascript

//this route will run on all rest backends
engine.server.app.all((req,res)=>{
    res.send("hello world");
});

//this is a message handler for websockets
engine.server.app.message((channel_id,message,isBinary)=>{
    console.log(message);
    return true;
});

//this route will only be present on "post" http requests
engine.server.app.post("/some",async (req,res)=>{
    res.json({hello:true});
});

//this route will only be present on "get" http requests
engine.server.app.get("/some",async (req,res)=>{
    res.json({hello:true});
});

//this route will only be present on "set" http requests
engine.server.app.set("/some",async (req,res)=>{
    res.json({hello:true});
});

//this route will only be present on "delete" http requests
engine.server.app.delete("/some",async (req,res)=>{
    res.json({hello:true});
});

```

### 1.2. Websocket api

this api only works with authenticated connections meaning this api needs to have a auth token provided for authentication before connecting to the message handler.

#### 1.2.1 websocket auth handshake

1. generate auth token
2. connect to wss socket address
3. send a json object parsed as string {token:TokenString}
4. wait for auth response which is parsed as a string {auth:true}
5. connection is stable now

#### 1.2.2 Websockets To Rest Handler

websockets connection can execute rest route handlers when the message has a websocket request schema with "at" and "id" params as a string and body param as a object itself.

**only post method route handlers are available to websockets request workers.

```JSON
{
    "at":"route_address",
    "is":"uniqe request id",
    "body":{
        some:true
    }
}
```

## 2. Auth Service

auth service provides a token based session identifier and a session based authetication, which means you generate a token, that token is sent to the server then the auth service runs a user defined authenticator function which gets the sessions information from user if the session exists the session data will be stored in a live object this process eliminates the logout problem of json web tokens and its extremly fast to authenticate a rest or websocket request/connection.

### 2.1 Auth Load Keys Function

**returns engine.common.Error or True**

auth api operates on top of rsa256 public/private isgnature verification algorithm, so naturally you need rsa public/private keys to use auth api, hozz and other wett templates provides safe rsa key generation apis, you can use them or any other api to generate rsa keys.

```javascript
let keys = require("./secure/keys.json");
let loadKeys = engine.auth.loadKeys(keys.private,keys.public);
if(loadKeys instanceof engine.common.Error){
    return loadKeys.now()("failed-load_keys").log();
}
```

### 2.2 Auth authenticator function

**returns Object or False**

this function is user defined authenticator it runs in authentication chain and provides data about session via session_id which is defined in session_token

#### 2.2.1 authenticator registraction code
```javascript
engine.auth.sessions.add_auth_function((session_id)=>{
    return {
      session_id:session_id,
      uid:'some',
      channel_id:engine.md5("user"),
    };
});
````

#### 2.2.2 session rest request auth protocol
```perl
{Request}->
{Check_Session}->
    {
        {Session_Exists} -> {Run_Request}
        {Session_Not_Active} -> {
            {Token_Authentication}->
            {User_Defined_Authentication_Function}->
            {Log_Session}->
            {Run_Request}
        }
    }
```

#### 2.2.3 websockets handshake auth protocol
```perl
{Establish_Connection}->
{Send_Token_Message}(JSON->Parsed_as_String->{
    token:{TokenString}
})->
{Check_Session}->
    {
        {Session_Exists} -> {Listen_For_Messages}
        {Session_Not_Active} -> {
            {Token_Authentication}->
            {User_Defined_Authentication_Function}->
            {Log_Session}->
            {Listen_For_Messages}
        }
    }
```

#### 2.3 Auth Verify Function
this function verifies a token string and parses it to json data.

**returns engine.common.Error or Object**

```javascript
let token_string = "someTokenString";
let verify = engine.auth.verify(token_string);
if(verify instaceof engine.common.Error){
    return verify.now("token_authentication_failed").log();
}
```

#### 2.4 Auth createToken Function
this function creates a token for authentication of a rest or websocket connection/http_request 

**returns engine.common.Error or Token String**

```javascript
let make_token = engine.auth.createToken({
    channel_id:engine.md5("user"),
    uid:"some",
});
if(make_token instanceof engine.common.Error){
    return make_token.log();
}
```

##### 2.4.1 Token JSON Schema
this json is parsed to string which is parsed ArrayBuffer which is parsed to base64 encoded string.
```json
{
    data:{
        //other user defined data
        //although other used defined data is not useful in provided auth protocols
        session_id:"user_defined_session_identifier",
        channel_id:"user defined websocket connection name/identifier",
        expire:"token valility in seconds (INT)"
    },
    signature:"base64Encoded_Binary_as_String_RSA256_Signature"
}
```

#### 2.5 Auth verifyRequest Function
this function takes a req class object and returns the auth token is present.

**returns engine.common.Error or Token Data Object**

```javascript
engine.server.app.post("/some",async (req,res)=>{
    //----------------------------------------------
    //verify function
    let verify = await engine.auth.verifyRequest(req);
    if((verify instanceof engine.common.Error)){
        return false;
    }
    //----------------------------------------------
    res.json({
        hello:true
    });
});
```

#### 2.6 Auth sessions api
this api keeps log of active sessions these sessions are generated with the user defined authentication function which returns a object of session data and takes in session_id as a function parameter you can check the session_id againt your database and return the session information to be kept in auth sessions api.this sessions data will be attached to the websocket connection request with the req.auth parametere and can be fetched for http rest api request by runinng engine.auth.verifyRequest api.

##### 2.6.1 Auth Sessions "add_auth_function" function
this function sets user decalred authentication function and takes the authentication function as a parameter.

```javascript
engine.auth.sessions.add_auth_function((session_id)=>{
    return {
      session_id:session_id,
      uid:'some',
      channel_id:engine.md5("user"),
    };
});
````

##### 2.6.2 Auth Sessions "authenticate" function
this function is user decalred authentication function, takes session id and returns a object is session is valid or false is invalid.

```javascript
let authenticate = engine.auth.sessions.authenticate(session_id);
console.log({authenticate:authenticate});
````

##### 2.6.3 Auth Sessions "add" function
this function takes a session_id and session_data as parameters and sets them to active/live sessions

```javascript
engine.auth.sessions.add(session_id,{});
````

##### 2.6.4 Auth Sessions "get" function
this function takes a session_id and return active/live session data if it exists.

```javascript
engine.auth.sessions.get(session_id);
````

##### 2.6.5 Auth Sessions "delete" function
this function takes a session_id removes it from active/live sessions object.

```javascript
engine.auth.sessions.delete(session_id);
````

## 3. DB Service

db service is a abstraction layer on top of a "db specific" api layer ie it is a db syntax/api that compiles to native db syntax/api for example 

```javascript
//db api query
let db_query = await db.collection("users").doc("user1").get();

//mysql translation 
let mysql_query = `SELECT * FROM users WHERE Doc_Name = "user1"`;

//firestore translation 
let firestore_query = firestore.collection("users").doc("user1").get();
```

this api uses plugins to provide abstartcion layer over various databases. These plugins are available on npm and can be installed with the db install apis.

### 3.1 DB plugin install function
various plgins are available on npm to use.

```javascript
global.engine = require("wett-uws");
//plugin for firestore
const wett_firestore = require("wett_firestore");

function main(){
    
    //installation function
    let install = await engine.db().install(wett_firestore);
    if(install instanceof engine.common.Error){
        return install.now("failed-install-wett-firebase-plugin").log();
    }
    
    //init database from plugin
    let init = await engine.db("firestore").init({
        name:'firestore',
        cred:require('./creds.json'),
        url:require('./dbUrl.json').daachi
    });
    if(init instanceof engine.common.Error){
        return init.now("init failed").log(log);
    }
    
}

```

### 3.2 DB API Abstractions layer
this api uses a native abstraction layer so you can use diffrent kinds of databases with a single syntax throughtout your code so when you want to upgrade your application your database io wont be something to worry about.

#### 3.2.1 QUERY Structure

each query saves data in collections (tables) the data is represented in docs(rows), this provides a unified approach to mysql and nosql based database storage systems

following query translates to 

```javascript
//db api query
let db_query = await db.collection("users").doc("user1").collection("sessions").doc("session1").insert({
    name:"gzbakku",
    id:1
});

//last collections becomes the table and have previous collections doc_id's as a keys.

//mysql translation 
let mysql_query = `INSERT INTO sessions (users_DOC_NAME,sessions_DOC_NAME,name,id) VALUES ("user1","session1","gzbakku",1)`;
```

#### 3.2.2 DB query functions
these are location and query functions that are provided by the native db api.

#### 3.2.2.1 DB query "collection" function
all query start with a collection, the collection can be queried by doc,where,orderBy,limit and after functions to add and get data from the collection.

#### 3.2.2.2 DB query "doc" function
doc is the unique identifier key to a document ie its a row id or a doc in a collection it can be followed by insert,update, increment and delete functions to manipulate its contents.

#### 3.2.2.3 DB query "where" function
this is the primary query function you have to find the data in a collection, this function takes 3 parameter key, function and value,available functions are "==",">=","<=","<" and ">" they are usual in there operations and any number of where queries can be combindes to make a more complex query.

```javascript
let get_document = await db("firestore").collection("users").where("name","==","gzbakku").where("id","==",1).where("age",">=",18).where("age","<=",36).get()
```

#### 3.2.2.4 DB query "limit" function
this function takes a int and returns the int number of results

```javascript
let get_document = await db("firestore").collection("users").where("name","==","gzbakku").limit(5).get()
```

#### 3.2.2.5 DB query "orderBy" function
this function takes a key and "desc" or "asc" as directions and returns a array of result.

```javascript
let get_document = await db("firestore").collection("users").orderBy("age","desc").get()
```

#### 3.2.2.6 DB query "after" function
this function takes the last document and returns a query after given document, this document is database specific ie firestore takes a native object as the last item.

```javascript
let get_document = await db("firestore").collection("users").where("name","==","gzbakku").limit(5).orderBy("age","desc").after(lastObject).get()
```

#### 3.2.2.7 DB query "exists" function
this function takes a doc and returns a object indicating if the document exists.

```javascript
let document_exists = await db("firestore").collection("users").doc("user1").exists()
```

#### 3.2.2.8 DB query "get" function

##### 3.2.2.8.1 DB query "get" query function
get function on collection takes a boolean input which when is true returns last document as a raw item.
```javascript
let fetch_documents = await db("firestore").collection("users").where("age",">=",18).orderBy("age","desc").get(get_last_doc_as_raw);
```

##### 3.2.2.8.1 DB query "get" doc function
get function on document takes a boolean input which when is true returns raw document.
```javascript
let fetch_document = await db("firestore").collection("users").doc("user1").get(get_raw)
```

#### 3.2.2.9 DB query "delete" function
this function can be called on a collection or a document, beware this function manually deletes each document and can be slow when doing large queries and some databases dont delete the entire tree so you have to manually delete deep structures.

```javascript
let document_exists = await db("firestore").collection("users").doc("user1").delete()
```

#### 3.2.2.10 DB query "insert" function
this function can be called on a document and inserts the object into the database.

```javascript
let make_document = await db("firestore").collection("users").doc("user1").insert({
   name:"gzbakku",
   age:24,
   id:1
});
```

#### 3.2.2.10 DB query "update" function
this function can be called on a document and updates the object stored in the database.

```javascript
let update_document = await db("firestore").collection("users").doc("user1").update({
   id:2
});
```

#### 3.2.2.11 DB query "increment" function
this function can be called on a document and increments the value stored in the database by given int.

```javascript
let increment_document = await db("firestore").collection("users").doc("user1").increment({
   id:2//this adds 2 to the stored int value
});
```

#### 3.2.2.12 DB query "batch" function
this function collects queries in a transaction and performs them in a single request, some databases dont support batch queries.

```javascript
let batch = engine.db("firestore").batch();
batch.collection("users").doc("user1").insert({name:"gzbakku",age:null,id:1});
batch.collection("users").doc("user1").update({age:23});
batch.collection("users").doc("user1").increment({id:1});
let commit = await batch.commit();
```

#### 3.2.2.13 DB query "increment" function
this function runs the transactions on the database

```javascript
let batch = engine.db("firestore").batch();
batch.collection("users").doc("user1").insert({name:"gzbakku",age:null,id:1});
batch.collection("users").doc("user1").update({age:23});
batch.collection("users").doc("user1").increment({id:1});
let commit = await batch.commit();
```

## 4. Validate service
this serive provides a fast and easy api to validate json and email data

### 4.1 Validate "email" function
```javascript
console.log(engine.validate.email("gzbakku@gmail.com"));
```

### 4.2 Validate "json" function

this is a complex json data schema verification api

```javascript

let schema = {
    "user name":{type:"string",min:3,max:256},
    "age":{type:"number",min:18,max:111},
    "friends":{type:"array",min:1,max:2048,elective:true},
    "address":{type:"object",validate:{
        returnError:false,
        dynamic:false,
        maxSize:2,
        schema:{
            address:{type:"string",min:1,max:512},
            country:{type:"string",options:["singapore","india"]}
        },
    }},
};

if(!engine.validate.json(schema,data,"dynamic"||"static",maxSize,returnError)){
    return false;
}
```

#### 4.2.1 Operators
these are functions associated with data types to match the value to a schema

#### 4.2.1.1 "min" operator
as indicated min operator matches a string to a minimum length, array to a minimum no of items, object to a minimum number of keys and number to a minimum number of value.

#### 4.2.1.2 "max" operator
as indicated min operator matches a string to a maximum length, array to a maximum no of items, object to a maximum number of keys and number to a maximum number of value.

#### 4.2.1.3 "options" operator
this operator macthes a string to the given options in a array.

#### 4.2.1.4 "elective" operator
this operator ignores if the data is not available.this operator only works in the dynamic check.

#### 4.2.1.5 "validate" operator
this operator validates a children object and takes the same parameteres just in a object to validate the child object.

```json
{
    schema:{STANDARD_SCHEMA},
    dynamic:{DYNAMIC_VALIDATION},
    maxSize:{MAX_NO_OF_KEYS},
    returnError:{RETURN_ERR_OBJECT}
}
```

#### 4.2.2 Data types
supported data types are

1. string - (min,max,options,elective)
2. number - (min,max,elective)
3. array - (min,max,elective)
4. object - (min,max,elective,validate)
5. email - (min,max,elective)

#### 4.2.3 validate json function parameters

##### 4.2.3.1 Schema
this is a object where keys point to the keys in data and takes a object with match parameters as object data.
```javascript
    let schema = {
    "user name":{type:"string",min:3,max:256},
    "age":{type:"number",min:18,max:111},
    "friends":{type:"array",min:1,max:2048,elective:true},
    "address":{type:"object",validate:{
        returnError:false,
        dynamic:false,
        maxSize:2,
        schema:{
            address:{type:"string",min:1,max:512},
            country:{type:"string",options:["singapore","india"]}
        },
    }},
};
```

##### 4.2.3.2 data
this is the data object which will be validated through given schema

##### 4.2.3.3 validation type
these are two types of validation "static" and "dynamic", default is "static", static validation matches all the keys if any keys are absent the validation failes,dynamic validation allows absent keys but only those keys who's elective property is "TRUE"

##### 4.2.3.4 maxSize
this property allows you to limit size of a data object in dynamic validationm it takes a int which it matches to the number of keys present in data object.

##### 4.2.3.5 returnError
this proeprty takes a boolean if true it returns a object stating the field that failed match to schema and why it failed the match.

#### 4.2.4 Validate "json" sample

```javascript

let data = {
    "user name","gzbakku",
    age:24,
    address:{
        address:"github",
        country:"india"
    }
};

let schema = {
    "user name":{type:"string",min:3,max:256},
    "age":{type:"number",min:18,max:111},
    "friends":{type:"array",min:1,max:2048,elective:true},
    "address":{type:"object",validate:{
        returnError:false,
        dynamic:false,
        maxSize:2,
        schema:{
            address:{type:"string",min:1,max:512},
            country:{type:"string",options:["singapore","india"]}
        },
    }},
};

if(engine.validate.json(schema,data,"dynamic",4,false)){
    return false;
}
```

## 4. Sanitize service
this service takes a object array or stringa dn removes html special charaters from strings.

```javascript
engine.sanitize({
    some:"<h1>some</h1>"
});
```

## 5. Disk service
these are file management apis

### 5.1. Disk "dir" apis
these are directry management apis

### 5.1.1 Disk "dir" "cwd" function
this function returns the current corking directory.
```javascript
const cwd = engine.disk.dir.cwd();
```

### 5.1.2 Disk "dir" "app" function
this function returns directory in which current program was executed
```javascript
const app = engine.disk.dir.app();
```

### 5.1.3 Disk "dir" "ensure" function
this function ensures the dir exists if not it creates a dir in the path.
```javascript
engine.disk.dir.ensure("/some_dir");
```

### 5.1.4 Disk "dir" "sub_dir" function
this function returns sub directories in a given directory.
```javascript
const sub_dirs = engine.disk.dir.sub_dir("/some_dir");
```

### 5.1.5 Disk "dir" "files" function
this function returns files in a given directory.
```javascript
const files = engine.disk.dir.files("/some_dir");
```

### 5.1.6 Disk "dir" "children" function
this function returns all children element in given directory.
```javascript
const child_elements = engine.disk.dir.children("/some_dir");
```

## 5.2 Disk "copy" function
this function copy given item to given location.
```javascript
const copy_result = engine.disk.copy("/some_dir","/new_dir");
```

## 5.3 Disk "read" function
this function returns raw data or string of a given file.
```javascript
const data = engine.disk.read("/some_dir/some_file");
```

## 5.4 Disk "readJson" function
this function returns JSON object from a given file.
```javascript
const data = engine.disk.readJson("/some_dir/some_file.json");
```

## 5.5 Disk "write" function
this function writes data to given file.
```javascript
const write = engine.disk.write("/some_dir/some_file.json",data);
```

## 5.6 Disk "delete" function
this function deletes a given file.
```javascript
engine.disk.delete("/some_dir/some_file.json");
```

# 6. Time Service
this api makes time services easy you can get now,date,month,year,day from sub apis here those are usual i am not gonna explain them.only now returns getTime() method input in miliseconds what ever they are i dont remember they are time elapsed in mili-seconds since linux epoch or something check yourself.

### 6.1 Time Timer Class
this class makes it easy to find elapsed time from when a timer was begin.
```javascript
let timer = new engine.time.Timer();
setTimeout(()=>{
    //this will console log the time diffrence in mili-seconds
    timer.now(true);
},3000);
```

# 7. common 
these are some loggin apis including tell,error,inform and success each takes a message and a log boolean if log is true it will log the message to console.

## 7.1 common Error Class
this class makes it easy to generate a error chain it is returned by a few apis in auth and server.
```javascript
let error = new engine.common.Error("some error");
//this will add another error to the error chain
error.now("new error");
//this will log the error object to the console.
error.log();
```

# you are all set have fun.





