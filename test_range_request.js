

const request = require("node-fetch");

main();

async function main(){

    let query = await request('http://localhost:8080/wsl_update_x64.msi',{
        method:"get",
        headers:{
            "content-range":'bytes=330-'
        }
    })
    .then((d)=>{
        console.log(d.headers);
        console.log(d);
    })
    .catch((e)=>{
        console.log(e);
    });

}