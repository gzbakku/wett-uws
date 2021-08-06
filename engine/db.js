"use strict";

const plugins = {};
let sessions = {};

module.exports = function(name){

  let builder = {
    name:name,
    lastType:'',
    address:[]
  };
  
  return {
    install:install,
    init:async (auth)=>{
      if(!plugins[name]){return new engine.common.Error(`no plugin found for ${name}`);}
      let start = await plugins[name].init(auth);
      if(start instanceof engine.common.Error){return start.now("failed-init-plugin");}
      sessions[auth.name || name] = {
        type:name,
        data:start
      };
      return true;
    },
    collection:(collection_name)=>{
      return collection(collection_name,builder);
    },
    batch:()=>{
      if(!builder.batchQueries){builder.batchQueries = [];}
      if(!builder.batch){builder.batch = true;}
      return batch(builder);
    }
  }

}

function install(plugin){
  if(
    !(plugin instanceof Object) ||
    !(typeof(plugin.type) === "string") ||
    !(plugin.init instanceof Function) ||
    !(plugin.processAddress instanceof Function) ||
    !(plugin.get instanceof Function) ||
    !(plugin.insert instanceof Function) ||
    !(plugin.delete instanceof Function) ||
    !(plugin.update instanceof Function) ||
    !(plugin.commit instanceof Function) 
  ){
    return new engine.common.Error("invalid plugin");
  }
  plugins[plugin.type] = plugin;
  return true;
}

//------------------------------------------------------------------------------
// address builders

function collection(name,builder){
  builder.address.push({type:'collection',query:name});
  builder.lastType = 'collection';
  return {
    doc:(name)=>{return doc(name,builder);},
    get:(get_raw_reference)=>{return get(builder,get_raw_reference);},
    delete:()=>{return del(builder);},
    where:(a,b,c)=>{return where(a,b,c,builder);},
    orderBy:(i,d)=>{return orderBy(i,d,builder);},
    limit:(q)=>{return limit(q,builder);}
  }
}

function doc(name,builder){
  builder.address.push({type:'doc',query:name});
  builder.lastType = 'doc';
  return {
    collection:(name)=>{return collection(name,builder);},
    get:(get_raw_reference)=>{return get(builder,get_raw_reference);},
    exists:()=>{return exists(builder);},
    insert:(body)=>{return insert(body,builder);},
    update:(body)=>{return update(body,builder);},
    increment:(body)=>{return increment(body,builder);},
    delete:()=>{return del(builder);}
  }
}

function where(a,b,c,builder){
  builder.address.push({type:'where',query:[a,b,c]});
  return {
    get:(get_raw_reference)=>{return get(builder,get_raw_reference);},
    update:()=>{return update(builder);},
    delete:()=>{return del(builder);},
    where:(a,b,c)=>{return where(a,b,c,builder);},
    orderBy:(i,d)=>{return orderBy(i,d,builder);},
    limit:(q)=>{return limit(q,builder);},
    after:(n)=>{return after(n,builder);},
  }
}

function orderBy(index,direction,builder){
  builder.address.push({type:'orderBy',query:{index:index,direction:direction}});
  return {
    get:(get_raw_reference)=>{return get(builder,get_raw_reference);},
    limit:(q)=>{return limit(q,builder);},
    after:(n)=>{return after(n,builder);},
  }
}

function limit(query,builder){
  builder.address.push({type:'limit',query:query});
  // console.log(builder);
  return {
    get:(get_raw_reference)=>{return get(builder,get_raw_reference);},
    after:(n)=>{return after(n,builder);},
    orderBy:(i,d)=>{return orderBy(i,d,builder);},
  }
}

function after(name,builder){
  builder.address.push({type:'after',query:name});
  return {
    get:(get_raw_reference)=>{return get(builder,get_raw_reference);},
  }
}

function batch(builder){
  return {
    flush:()=>{return builder;},
    collection:(name)=>{return collection(name,builder);},
    commit:()=>{return commit(builder);},
    insert:(body)=>{return insert(body,builder);},
    update:(body)=>{return update(body,builder);},
    delete:()=>{return del(builder);}
  }
}

//------------------------------------------------------------------------------
// data processors

function get(builder,get_raw_reference){
  if(get_raw_reference === true){builder.raw = true;}
  return plugins[sessions[builder.name].type].get(builder,sessions[builder.name]);
}

function exists(builder){
  builder.find = true;
  return plugins[sessions[builder.name].type].get(builder,sessions[builder.name]);
}

function del(builder){
  if(builder.batch){
    builder.batchQueries.push({address:builder.address,opp:'delete'});
    builder.address = [];
    return;
  }
  return plugins[sessions[builder.name].type].delete(builder,sessions[builder.name]);
}

function insert(object,builder){
  if(builder.batch){
    builder.batchQueries.push({address:builder.address,opp:'insert',object:object});
    builder.address = [];
    return;
  }
  return plugins[sessions[builder.name].type].insert(object,builder,sessions[builder.name]);
}

function update(object,builder){
  if(builder.batch){
    builder.batchQueries.push({address:builder.address,opp:'update',object:object});
    builder.address = [];
    return;
  }
  return plugins[sessions[builder.name].type].update(object,builder,sessions[builder.name]);
}

function increment(object,builder){
  if(builder.batch){
    builder.batchQueries.push({address:builder.address,opp:'increment',object:object});
    builder.address = [];
    return;
  }
  if(!plugins[sessions[builder.name].type].increment){return new Promise((resolve,reject)=>{
    reject("no increment function in plugin");
  });}
  return plugins[sessions[builder.name].type].increment(object,builder,sessions[builder.name]);
}

function commit(builder){
  if(!plugins[sessions[builder.name].type].commit){return new Promise((resolve,reject)=>{
    reject("no commit function in plugin");
  });}
  return plugins[sessions[builder.name].type].commit(builder,sessions[builder.name]);
}
