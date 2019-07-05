var $output, FirebasePlugin;

// UI logging
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

function clearLog(){
    $output.empty();
}

// Init
function onDeviceReady(){
    FirebasePlugin = window.FirebasePlugin;
    $output = $('#log-output');
    log("deviceready");


    //Register handlers
    FirebasePlugin.onMessageReceived(function(message) {
        try{
            console.log("onMessageReceived");
            console.dir(message);
            if(message.messageType === "notification"){
                handleNotificationMessage(message);
            }else{
                handleDataMessage(message);
            }
        }catch(e){
            logError("Exception in onMessageReceived callback: "+e.message);
        }

    }, function(error) {
        logError("Failed receiving FirebasePlugin message: " + error);
    });

    FirebasePlugin.onTokenRefresh(function(token){
        log("Token refreshed: " + token)
    }, function(error) {
        logError("Failed to refresh token: " + error);
    });


    checkPermission(false); // Check permission then get token
    setTimeout(setScreenName, 1000);
    setUserID();
    setUserProperty();
    logEvent();

    // Platform-specific
    if(cordova.platformId === "android"){
        initAndroid();
    }else if(cordova.platformId === "ios"){
        initIos();
    }
}
$(document).on('deviceready', onDeviceReady);

var initIos = function(){};

var initAndroid = function(){

    // Custom FCM receiver plugin
    cordova.plugin.customfcmreceiver.registerReceiver(function(message){
        log("Received custom message: "+message);
    });

    // Define custom  channel - all keys are except 'id' are optional.
    var customChannel  = {
        // channel ID - must be unique per app package
        id: "my_channel_id",

        // Channel name. Default: empty string
        name: "My channel name",

        //The sound to play once a push comes. Default value: 'default'
        //Values allowed:
        //'default' - plays the default notification sound
        //'ringtone' - plays the currently set ringtone
        //filename - the filename of the sound file located in '/res/raw' without file extension (mysound.mp3 -> mysound)
        sound: "blackberry",

        //Vibrate on new notification. Default value: true
        //Possible values:
        //Boolean - vibrate or not
        //Array - vibration pattern - e.g. [500, 200, 500] - milliseconds vibrate, milliseconds pause, vibrate, pause, etc.
        vibration: [300, 200, 300],

        // Whether to blink the LED
        light: true,

        //LED color in ARGB format - this example BLUE color. If set to -1, light color will be default. Default value: -1.
        lightColor: "0xFF0000FF",

        //Importance - integer from 0 to 4. Default value: 3
        //0 - none - no sound, does not show in the shade
        //1 - min - no sound, only shows in the shade, below the fold
        //2 - low - no sound, shows in the shade, and potentially in the status bar
        //3 - default - shows everywhere, makes noise, but does not visually intrude
        //4 - high - shows everywhere, makes noise and peeks
        importance: 4,

        //Show badge over app icon when non handled pushes are present. Default value: true
        badge: true,

        //Show message on locked screen. Default value: 1
        //Possible values (default 1):
        //-1 - secret - Do not reveal any part of the notification on a secure lockscreen.
        //0 - private - Show the notification on all lockscreens, but conceal sensitive or private information on secure lockscreens.
        //1 - public - Show the notification in its entirety on all lockscreens.
        visibility: 1
    };

    FirebasePlugin.createChannel(customChannel,
        function() {
            log("Created custom channel: "+customChannel.id);
            FirebasePlugin.listChannels(
                function(channels) {
                    if(typeof channels == "undefined") return;
                    for(var i=0;i<channels.length;i++) {
                        log("Channel id=" + channels[i].id + "; name=" + channels[i].name);
                    }
                },
                function(error) {
                    logError('List channels error: ' + error);
                }
            );
        },
        function(error) {
            logError("Create channel error: " + error);
        }
    );
};

// Notifications
var checkPermission = function(requested){
    FirebasePlugin.hasPermission(function(hasPermission){
        if(hasPermission){
            log("Remote notifications permission granted");
            // Granted
            getToken();
        }else if(!requested){
            // Request permission
            log("Requesting remote notifications permission");
            FirebasePlugin.grantPermission(checkPermission.bind(this, true));
        }else{
            // Denied
            logError("Notifications won't be shown as permission is denied");
        }
    });
};

var getToken = function(){
    FirebasePlugin.getToken(function(token){
        log("Got token: " + token)
    }, function(error) {
        logError("Failed to get token: " + error);
    });
};

var handleNotificationMessage = function(message){

    var title, type = 'FCM';
    if(message.title){
        title = message.title;
    }else if(message.notification && message.notification.title){
        title = message.notification.title;
    }else if(message.aps && message.aps.alert && message.aps.alert.title){
        type = 'APNS';
        title = message.aps.alert.title;
    }


    var body;
    if(message.body){
        body = message.body;
    }else if(message.notification && message.notification.body){
        body = message.notification.body;
    }else if(message.aps && message.aps.alert && message.aps.alert.body){
        body = message.aps.alert.body;
    }

    var msg = type + " notification message received in " + (message.tap ? "background": "foreground");
    if(title){
        msg += '; title='+title;
    }
    if(body){
        msg += '; body='+body;
    }
    msg  += ": "+ JSON.stringify(message);
    log(msg);
};

var handleDataMessage = function(message){
    log("Data message received: " + JSON.stringify(message));
};


function clearNotifications(){
    // Log a test error
    FirebasePlugin.clearAllNotifications(function(){
        log("Cleared all notifications");
    },function(error){
        log("Failed to clean notifications: " + error);
    });
}

// Crashlytics
function sendNonFatal(){
    // Log a test error
    FirebasePlugin.logError("Test error", function(){
        log("Sent non-fatal error");
    },function(error){
        log("Failed to send non-fatal error: " + error);
    });
}

function sendCrash(){
    // Log a test message
    FirebasePlugin.logMessage("A custom message about this crash", function(){
        console.log("Sent crash message");
        FirebasePlugin.sendCrash();
    },function(error){
        log("Failed to send crash message: " + error);
    });
}

// Badge
function getBadgeNumber(){
    FirebasePlugin.getBadgeNumber(function(number){
        log("Current badge number: "+number);
    },function(error){
        log("Failed to get badge number: " + error);
    });
}

function incrementBadgeNumber(){
    FirebasePlugin.getBadgeNumber(function(current){
        var number = current+1;
        FirebasePlugin.setBadgeNumber(number, function(){
            log("Set badge number to: "+number);
        },function(error){
            log("Failed to set badge number: " + error);
        });
    },function(error){
        log("Failed to get badge number: " + error);
    });
}

function clearBadgeNumber(){
    FirebasePlugin.setBadgeNumber(0, function(){
        log("Cleared badge number");
    },function(error){
        log("Failed to clear badge number: " + error);
    });
}

// Analytics
function logEvent(){
    FirebasePlugin.logEvent("my_event", {"foo": "bar"}, function(){
        log("Logged event");
    },function(error){
        log("Failed to log event: " + error);
    });
}

function setScreenName(){
    FirebasePlugin.setScreenName("my_screen", function(){
        log("Sent screen name");
    },function(error){
        log("Failed to send screen name: " + error);
    });
}

function setUserID(){
    FirebasePlugin.setUserId("user_id", function(){
        log("Set user ID");
    },function(error){
        log("Failed to set user ID: " + error);
    });
}

function setUserProperty(){
    FirebasePlugin.setUserProperty("some_key", "some_value", function(){
        log("Set user property");
    },function(error){
        log("Failed to set user property: " + error);
    });
}
