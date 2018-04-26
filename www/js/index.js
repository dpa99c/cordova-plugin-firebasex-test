var $output, $name;
function onDeviceReady(){
    $output = $('#log-output');
    $name = $('#name');
    log("deviceready");
}
$(document).on('deviceready', onDeviceReady);

function clear(){
    $output.empty();
    $name.val('');
}

function stringify(str){
    if(typeof str === "object"){
        str = JSON.stringify(str);
    }
    return str;
}

function prependLogMessage(message){
    $output.prepend('<span class="'+(message.logLevel ? message.logLevel : '')+'">' +message.msg + '</span>' + (message.nobreak ? "<br/>" : "<br/><br/>" ));
}

function log(msg, opts){
    opts = opts || {};

    opts.logLevel = opts.logLevel || "log";
    console[opts.logLevel](msg);

    opts.msg = msg;
    prependLogMessage(opts);
}

function logError(msg){
    log(msg, {
        logLevel: "error"
    });
}

function onError(action, error){
    logError(action +": "+stringify(error));
}

function onSuccess(action){
    log(action +": successful");
}

function backup(){
    log("backup");
    var data = {
        name: $name.val()
    };
    cordova.plugin.cloudsettings.save(data, onSuccess.bind(this, "backup"), onError.bind(this, "backup"));
}

function restore(){
    log("restore");
    cordova.plugin.cloudsettings.restore(function(data) {
        onSuccess("restore: "+JSON.stringify(data));
        if (data) {
            $name.val(data.name);
            log("data restored");
        } else {
            log("no data to restore");
        }
    }, onError.bind(this, "restore"));
}