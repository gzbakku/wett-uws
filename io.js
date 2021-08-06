

module.exports = {

  test:()=>{return worker(engine.db("firestore").collection("test"));}

};

function worker(path){

  return {
    get:(docId)=>{
      return path.doc(docId).get().then((data)=>{return data;}).catch((e)=>{engine.common.error(e);});
    },
    add:(filename,data)=>{
      let build = path.doc(filename);
      return build.insert(data).then(()=>{return true;}).catch((e)=>{engine.common.error(e);});
    },
    query:(object)=>{
      let build = path;
      if(object.query){
        for(tag in object.query){
          build.where(tag,'==',object.query[tag]);
        }
      }
      if(!object.limit){object.limit = 5;}
      build.limit(5);
      if(object.orderBy){build.orderBy(object.orderBy);}
      if(object.after){build.orderBy(object.after);}
      if(object.before){build.orderBy(object.before);}
      return build.get().then((d)=>{return d;}).catch((e)=>{engine.common.error(e);});
    }
  };

}
