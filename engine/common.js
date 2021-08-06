"use strict";

const log = false;
const chalk = require('chalk');
const clog = console.log;

class Error{
  constructor(e) {
    this.error = e;
    this.chain = [];
  }
  now(e){
    this.chain.push(this.error);
    this.error = e;
    return this;
  }
  log(trigger){
    if(trigger === false){return;}
    console.log(this);
    return this;
  }
}

module.exports = {

  Error:Error,

  tell : function(message,doI){
    if(doI == true || log == true){
      clog(chalk.cyan('>>> ' + message));
    }
    return true;
  },

  error : function(error){
    clog(chalk.red('!!! ' + error));
    return false;
  },

  inform : function(message){
    clog(chalk.blueBright('>>> ' + message));
    return true;
  },

  success : function(message){
    clog(chalk.underline.greenBright('@@@ ' + message));
    return true;
  }

};
