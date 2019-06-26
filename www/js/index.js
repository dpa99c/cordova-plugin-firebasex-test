var $output;
function onDeviceReady(){
    $output = $('#log-output');
    log("deviceready");

    if(cordova.platformId === "android"){
        // Custom FCM receiver plugin
        cordova.plugin.customfcmreceiver.registerReceiver(function(message){
            log("Received custom message: "+message);
        });
        getToken();
    }else if(cordova.platformId === "ios"){
        checkPermission(false);
    }

    //Register handlers
    window.FirebasePlugin.onNotificationOpen(function(notification) {
        var title = getNotificationTitle(notification);
        var body = getNotificationBody(notification);
        var msg = "FirebasePlugin message: "+body + '<br/>received in: ' + (notification.tap ? "background" : "foreground");
        if(title){
            msg += '<br/>title='+title;
        }
        log(msg);
    }, function(error) {
        logError("Failed receiving FirebasePlugin message: " + error);
    });

    window.FirebasePlugin.onTokenRefresh(function(token){
        log("Token refreshed: " + token)
    }, function(error) {
        logError("Failed to refresh token: " + error);
    });


}
$(document).on('deviceready', onDeviceReady);

var checkPermission = function(requested){
    window.FirebasePlugin.hasPermission(function(data){
        if(data.isEnabled){
            // Granted
            getToken();
        }else if(!requested){
            // Request permission
            window.FirebasePlugin.grantPermission(checkPermission.bind(this, true));
        }else{
            // Denied
            logError("Notifications won't be shown as permission is denied");
        }
    });
};

var getToken = function(){
    window.FirebasePlugin.getToken(function(token){
        log("Got token: " + token)
    }, function(error) {
        logError("Failed to get token: " + error);
    });
};

var getNotificationTitle = function(notification){
    return cordova.platformId === "ios" ? notification.aps.alert.title : notification.title;
};

var getNotificationBody = function(notification){
    return cordova.platformId === "ios" ? notification.aps.alert.body : notification.body;
};


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
