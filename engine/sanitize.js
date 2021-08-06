"use strict";

const common = require('./common');
const sanitize = require('htmlspecialchars');
const log = false;

module.exports = function doThis(item){

  let type = getType(item);

  if(type == 'object'){
    return processObject(item);
  }  else if(type == 'array'){
    return processArray(item);
  } else if(type == 'string'){
     return processString(item);
  } else {
    return item;
  }

}

function getType(object){
  if(object === null || object === undefined){
    return null;
  } else if(object instanceof Object){
    return 'object';
  } else if(object instanceof Array){
    return 'array';
  } else{
    return typeof(object)
  }
}

function processString(string){
  return sanitize(string);
}

function processArray(array){

  if(!array.length || array.length === 0){
    return array;
  }

  let make = [];
  for(var i=0;i<array.length;i++){
    let item = array[i];
    let type = getType(item);
    if(type == 'string'){
      make.push(processString(item));
    } else if(type == 'array'){
      make.push(processArray(item));
    } else if(type == 'object'){
      make.push(processObject(item));
    } else {
      make.push(item);
    }
  }
  return make;

}

function processObject(object){

  let keys = Object.keys(object);
  if(keys.length === 0){
    return object;
  }

  let make = {};
  for(var i=0;i<keys.length;i++){

    let key = keys[i];
    let value = object[key];
    let type = getType(value);

    if(type == 'string'){
      make[key] = processString(value);
    } else if(type == 'object'){
      make[key] = processObject(value);
    } else if(type == 'array'){
      make[key] = processArray(value);
    } else {
      make[key] = value;
    }

  }

  return make;

}
