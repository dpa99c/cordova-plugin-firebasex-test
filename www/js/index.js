var $output;
function onDeviceReady(){
    $output = $('#log-output');
    log("deviceready");

    // Custom FCM receiver plugin
    cordova.plugin.customfcmreceiver.registerReceiver(function(message){
        log("Received custom message: "+message);
    });

    // cordova-plugin-firebase
    window.FirebasePlugin.onNotificationOpen(function(notification) {
        var msg = "FirebasePlugin message: "+notification.body + '<br/>received in: ' + (notification.tap ? "background" : "foreground");
        if(notification.title){
            msg += '<br/>title='+notification.title;
        }
        log(msg);
    }, function(error) {
        logError("Failed receiving FirebasePlugin message: " + error);
    });

    window.FirebasePlugin.onTokenRefresh(function(token){
        log("Token received: " + token)
    }, function(error) {
        logError("Failed receiving token: " + error);
    });
}
$(document).on('deviceready', onDeviceReady);


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