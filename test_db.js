const wett_firestore = require("../wett-firestore/index");
global.engine = require("./index");
global.io = require("./io");

main();

async function main(){

    let log = true;

    let install = await engine.db().install(wett_firestore);
    if(install instanceof engine.common.Error){
        return install.now("failed-install-wett-firebase-plugin").log(log);
    }

    let init = await engine.db("firestore").init({
        name:'firestore',
        cred:require('./secure/daachi_firestore_key.json'),
        url:require('./secure/dbUrl.json').daachi
    });
    if(init instanceof engine.common.Error){
        return init.now("init failed").log(log);
    }
    console.log({init:init});

    if(false){
        let add = await engine.db("firestore").collection("test").doc("test0")
        .insert({
            count:0,
            some:true
        })
        .then(()=>{return true;})
        .catch(()=>{return false;});
        console.log({add:add});
    }

    if(false){
        let get_doc = await engine.db("firestore").collection("test").doc("test0")
        .get()
        .then((d)=>{return d;})
        .catch((e)=>{
            console.log(e);
            return false;
        });
        console.log({get_doc:get_doc});
    }

    if(false){
        const test_anchor = await engine.db("firestore").collection("test").doc("test4")
        .get(true)
        .then((d)=>{return d;})
        .catch((e)=>{
            console.log(e);
            return false;
        });
        if(!test_anchor){return new Error("failed-get-test_anchor_doc").log();}
        // console.log({test_anchor:test_anchor});
        let get_collection = await engine.db("firestore").collection("test")
        .where("count",">",0)
        .limit(4)
        .orderBy("count",'asc')
        .after(test_anchor)
        .get(true)
        .then((d)=>{return d;})
        .catch((e)=>{
            console.log(e);
            return false;
        });
        console.log({get_collection:get_collection});
    }

    if(true){
        let exists = await engine.db("firestore").collection("test").doc("test0")
        .exists()
        .then((d)=>{return d;})
        .catch((e)=>{
            console.log(e);
            return false;
        });
        console.log({exists:exists});
    }

    if(false){
        let update = await engine.db("firestore").collection("test").doc("test0")
        .update({
            update:true
        })
        .then(()=>{return true;})
        .catch(()=>{return false;});
        console.log({update:update});
    }

    if(false){
        let increment = await engine.db("firestore").collection("test").doc("test0")
        .increment({
            count:1
        })
        .then(()=>{return true;})
        .catch(()=>{return false;});
        console.log({increment:increment});
    }

    if(false){
        let del = await engine.db("firestore").collection("test").doc("test0")
        .delete()
        .then(()=>{return true;})
        .catch(()=>{return false;});
        console.log({delete:del});
    }

    if(false){
        let batch = engine.db("firestore").batch();
        if(true){
            batch.collection("test").doc("test0").insert({count:0,some:true});
            batch.collection("test").doc("test1").insert({count:1,some:true});
            batch.collection("test").doc("test2").insert({count:2,some:true});
            batch.collection("test").doc("test3").insert({count:3,some:true});
            batch.collection("test").doc("test4").insert({count:4,some:true});
            batch.collection("test").doc("test5").insert({count:5,some:true});
            batch.collection("test").doc("test6").insert({count:6,some:true});
            batch.collection("test").doc("test7").insert({count:7,some:true});
            batch.collection("test").doc("test8").insert({count:8,some:true});
            batch.collection("test").doc("test9").insert({count:9,some:true});
        }
        if(false){
            batch.collection("test").doc("test0").increment({count:1});
            batch.collection("test").doc("test1").increment({count:1});
            batch.collection("test").doc("test2").increment({count:1});
        }
        if(false){
            batch.collection("test").doc("test0").update({some:true});
            batch.collection("test").doc("test1").update({some:true});
            batch.collection("test").doc("test2").update({some:true});
        }
        if(false){
            batch.collection("test").doc("test2").delete();
        }
        if(false){
            console.log(batch.flush());
        }
        if(true){
            let commit = await batch.commit()
            .then(()=>{
                return true;
            })
            .catch((e)=>{
                console.log(e);
                return false;
            });
            console.log({commit:commit});
        }
    }

}

