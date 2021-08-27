const crypto = require("crypto");

let keys = {
    private:null,
    public:null
};

let private_key,public_key;

function verify(token){

    let rebuild = Buffer.from(token, 'base64');
    let parsed;
    try{
        parsed = JSON.parse(rebuild.toString("utf8"));
    }catch(_){
        return new engine.common.Error("invalid_token-failed-parse_json");
    }

    if(
        !(parsed instanceof Object) ||
        !parsed.hasOwnProperty("signature") ||
        !parsed.hasOwnProperty("data") ||
        !(parsed.data instanceof Object) ||
        !parsed.data.hasOwnProperty("session_id") ||
        !parsed.data.hasOwnProperty("expire")
    ){
        return new engine.common.Error("invalid_token-failed-invalid_json_data");
    }

    let as_string = JSON.stringify(parsed.data);
    let signature = Buffer.from(parsed.signature, 'base64');

    try{
        const verify_signature = crypto.verify(
            "sha256",
            Buffer.from(as_string),
            {
                key: public_key,
                padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
            },
            signature
        );
        return parsed.data;
    }catch(e){
        return new engine.common.Error("failed-verify => " + e);
    }

}

class Sessions{
    constructor(){
        this.session = {};
    }
    add_auth_function(func){
        this.authenticator = func;
    }
    async authenticate(session_id){
        if(typeof(session_id) !== "string"){return false;}
        if(this.session[session_id]){return this.session[session_id];}
        if(!this.authenticator){return false;}
        let run = await this.authenticator(session_id);
        if(run instanceof Object){this.session[session_id] = run;}
        return run;
    }
    add(key,data){
        this.session[key] = data;
    }
    get(session_id){
        return this.session[session_id];
    }
    delete(session_id){
        delete this.session[session_id];
    }
}

module.exports = {

    sessions:new Sessions(),

    readKeys : function(privateKeyLocation,publicKeyLocation){
        if(!privateKeyLocation || !publicKeyLocation){
            return new engine.common.Error('not_found-location-private/public-keys');
        }
        let checkPrivate = fs.existsSync(privateKeyLocation);
        if(!checkPrivate){
            return new engine.common.Error('invalid_path-private_key');
        }
        let privateKey = fs.readFileSync(privateKeyLocation,'utf8');
        let checkPublic = fs.existsSync(publicKeyLocation);
        if(!checkPublic){
            return new engine.common.Error('invalid_path-private_key');
        }
        let publicKey = fs.readFileSync(publicKeyLocation,'utf8');
        return loadKeys(privateKey,publicKey);
    },
    
    loadKeys : function(private,public){
        if(!private || !public){
            return new engine.common.Error('not_found-private_key/public_key');
        }
        private_key = crypto.createPrivateKey(private);
        public_key = crypto.createPublicKey(public);
        return true;
    },

    createToken:(payload,options)=>{

        if(!(payload instanceof Object)){return new engine.common.Error("payload is not a object");}
        if(!(options instanceof Object)){options = {};}
        if(!options.expire){options.expire = 31536000;/*365days in seconds*/}
        if(!payload.session_id){payload.session_id = engine.uniqid();}
        if(!payload.channel_id){return new engine.common.Error("no channel_id property provided");}
        payload.expire = engine.time.now() + (options.expire * 1000);

        try{
            const signature = crypto.sign("sha256", Buffer.from(JSON.stringify(payload)), {
                key: private_key,
                padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
            });
            return Buffer.from(JSON.stringify({
                data:payload,
                signature:signature.toString("base64")}
            )).toString("base64");
        } catch(e){
            return new engine.common.Error("sign failed => " + e);
        }

    },

    verify:verify,

    verifyRequest:async (req)=>{
        if(!(req instanceof engine.server.Request)){
            return new engine.common.Error("invalid-request");
        }
        if(req.auth){return req.auth;}
        if(!req.headers["td-wet-token"]){
            return new engine.common.Error("no_token_found");
        }

        let do_verify = verify(req.headers["td-wet-token"]);
        if((do_verify instanceof engine.common.Error)){
            return do_verify.now("verify-token-failed");
        }

        if(!engine.auth.sessions.authenticate){
            return new engine.common.Error("not_found-authenticate-function");
        }

        const get_session = await engine.auth.sessions.authenticate(do_verify.session_id);
        if(!get_session){
            return new engine.common.Error("failed-get_session");
        } else {
            req.auth = get_session;
            return get_session;
        }
        
    }

};