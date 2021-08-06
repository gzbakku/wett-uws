const baseWorker = require('child_process');
const exec = baseWorker.exec;

module.exports=  {

  run : function(cmd){

    return new Promise((resolve,reject)=>{

      if(cmd == null || cmd == undefined){
        reject('invalid_cmd');
      }

      const runner = exec(cmd,(err, stdout, stderr)=>{
        if(err){
          console.log(err);
          reject(err);
        }
        if(stderr){
          console.log(stderr);
          resolve(stderr);
        }
        if(stdout){
          console.log(stdout);
          resolve(stdout);
        }
      });

      // runner.stdout.on('data', (data)=>{console.log(data);});
      runner.stdout.pipe(process.stdout);

    });

  },

};
