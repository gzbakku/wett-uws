const fs = require('fs-extra');
const nfs = require('fs');    //native file system - nfs  //used for sub dir loop

module.exports = {

  exists:(location)=>{
    return fs.exists(location);
  },

  dir:{
    cwd:()=>{
      return process.cwd();
    },
    app:()=>{
      let scriptAddressRef = process.argv[1];
      let scriptMidPoint = scriptAddressRef.lastIndexOf('\\');
      return scriptAddressRef.substring(0,scriptMidPoint);
    },
    ensure:async (location)=>{
      return fs.ensureDir(location)
      .then(()=>{
        return true;
      })
      .catch((err)=>{
        common.error(err)
        return common.error('failed-ensure-dir-io');
      });
    },
    create:(location)=>{
      return fs.mkdir(location)
      .then(()=>{
        return true;
      })
      .catch((err)=>{
        common.error(err)
        return common.error('failed-create-dir-io');
      });
    },
    subDir:(srcpath)=>{
      return new Promise((resolve,reject)=>{
        nfs.readdir(srcpath,{withFileTypes:true},(e,files)=>{
          if(e){
            common.error(e);
            common.error("failed-read_sub_directories-subDir-dir-io");
            reject("failed-read_sub_directories-subDir-dir-io");
          }
          let collect = [];
          for(let file of files){
            if(file.isDirectory()){
              collect.push(file.name);
            }
          }
          resolve(collect);
        });
      });
    },
    files:(srcpath)=>{
      nfs.readdir(srcpath,{withFileTypes:true},(e,files)=>{
        if(e){
          common.error(e);
          common.error("failed-read_children_files-files-dir-io");
          reject("failed-read_children_files-files-dir-io");
        }
        let collect = [];
        for(let file of files){
          if(file.isFile()){
            collect.push(file.name);
          }
        }
        resolve(collect);
      });
    },
    children:(srcpath)=>{
      return new Promise((resolve,reject)=>{
        nfs.readdir(srcpath,(e,files)=>{
          if(e){
            common.error(e);
            common.error("failed-read_chilren_items-children-dir-io");
            reject("failed-read_chilren_items-children-dir-io");
          }
          resolve(files);
        });
      });
    }
  },//dir ends here

  copy:async (from,to)=>{
    return fs.copy(from,to)
    .then(()=>{
      return true;
    })
    .catch((error)=>{
      common.error(error);
      return common.error("failed-copy-io");
    });
  },

  read:(location)=>{
    return fs.readFile(location,'utf-8')
    .then((data)=>{
      return data;
    })
    .catch((err)=>{
      common.error(err);
      return common.error("failed-read_file-io");
    });
  },

  readJson:async (location)=>{
    let run = await fs.readFile(location,'utf-8')
    .then((data)=>{
      return data;
    })
    .catch((err)=>{
      common.error(err);
      return common.error("failed-readJson-io");
    });
    if(run){
      return JSON.parse(run);
    } else {
      return false;
    }
  },

  write:(location,data)=>{
    return fs.writeFile(location,data,'utf-8')
    .then(()=>{
      return true;
    })
    .catch((err)=>{
      common.error(err);
      return common.error("failed-write-io");
    });
  },

  delete:(location)=>{
    return fs.remove(location)
    .then(()=>{
      return true;
    })
    .catch((e)=>{
      common.error(e);
      return false;
    });
  }

};
