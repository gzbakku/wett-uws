

module.exports = {
    
    // request:require('request-promise'),
    request:require('node-fetch'),
    md5:require("md5"),
    uniqid:require("uniqid"),
    mime:require("mime"),

    auth:require("./auth"),
    common:require("./common"),
    db:require("./db"),
    disk:require("./disk"),
    sanitize:require("./sanitize"),
    server:require("./server"),
    time:require("./time"),
    validate:require("./validate"),
    
};