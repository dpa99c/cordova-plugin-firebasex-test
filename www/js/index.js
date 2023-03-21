var $output, FirebasePlugin;

// Fake authentication code as defined in the Firebase Console: see https://firebase.google.com/docs/auth/android/phone-auth#integration-testing
var FAKE_SMS_VERIFICATION_CODE = '123456';

// UI logging
function prependLogMessage(message){
    $output.prepend('<span class="'+(message.logLevel ? message.logLevel : '')+'">' +message.msg + '</span>' + (message.nobreak ? "<br/>" : "<br/><br/>" ));
}

function log(msg, opts){
    if(typeof opts === 'undefined'){
        opts = {};
    }else if(typeof opts === 'boolean'){
        opts = {showAlert: opts}
    }

    opts.logLevel = opts.logLevel || "log";
    console[opts.logLevel](msg);

    opts.msg = msg;
    prependLogMessage(opts);
    if(opts.showAlert){
        alertUser(opts.logLevel, msg);
    }
}

function logError(msg, error, showAlert){
    if(typeof error === 'boolean'){
        showAlert = error;
    }else if(typeof error === 'object'){
        msg += ': ' + JSON.stringify(error);
    }else if(typeof error === 'string'){
        msg += ': ' + error;
    }
    log(msg, {
        logLevel: "error",
        showAlert: showAlert
    });
}

function clearLog(){
    $output.empty();
}

/**
 * Determines if given string contains a numeric value.
 * https://stackoverflow.com/a/175787/777265
 * @param {string} str
 * @return {boolean}
 */
function isNumericString (str) {
    if (typeof str != "string") return false;
    return !isNaN(str) &&
        !isNaN(parseFloat(str));
}

function alertUser(title, msg, cb) {
    navigator.notification.alert(
        msg,
        cb,
        title
    );
}

function promptUserForInput(title, msg, cb) {
    navigator.notification.prompt(
        msg,
        function(result){
            var input = result.input1 || '';
            cb(input.trim());
        },
        title,
        ['Ok']
    );
}

function promptUserForYesNoChoice(title, msg, cb) {
    navigator.notification.confirm(
        msg,
        function(result){
            if(result){
                cb(result === 1);
            }
        },
        title,
        ['Yes','No']
    );
}

// Init
function onDeviceReady(){
    FirebasePlugin = window.FirebasePlugin;
    $output = $('#log-output');
    log("deviceready");

    $('#device-platform').text(cordova.platformId);
    cordova.plugins.diagnostic.getDeviceOSVersion(function(details){
        $('#device-version').text(details.version);
        $('#device-api-level').text(details.apiLevel);
        $('#device-api-name').text(details.apiName);
    });
    cordova.plugins.diagnostic.getBuildOSVersion(function(details){
        $('#target-api-level').text(details.targetApiLevel);
        $('#target-api-name').text(details.targetApiName);
        $('#min-api-level').text(details.minApiLevel);
        $('#min-api-name').text(details.minApiName);
    });

    // Set global error handler to catch uncaught JS exceptions
    var appRootURL = window.location.href.replace("index.html",'');
    window.onerror = function(errorMsg, url, line, col, error) {
        var logMessage = errorMsg;
        var stackTrace = null;

        var sendError = function(){
            FirebasePlugin.logError(logMessage, stackTrace, function(){
                log("Sent JS exception trace");
            },function(error){
                logError("Failed to send JS exception trace", error);
            });
        };

        logMessage += ': url='+url.replace(appRootURL, '')+'; line='+line+'; col='+col;

        if(error && typeof error === 'object'){
            StackTrace.fromError(error).then(function(trace){
                stackTrace = trace;
                sendError()
            });
        }else{
            sendError();
        }
    };


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
        logError("Failed receiving FirebasePlugin message", error);
    });

    FirebasePlugin.onTokenRefresh(function(token){
        log("Token refreshed: " + token)
    }, function(error) {
        logError("Failed to refresh token", error);
    });

    FirebasePlugin.registerAuthStateChangeListener(function(userSignedIn){
        log("Auth state changed: User signed " + (userSignedIn ? "in" : "out"));
    });

    // Custom FCM receiver plugin
    cordova.plugin.customfcmreceiver.registerReceiver(function(message){
        log("Received custom message: "+message);
    });

    checkNotificationPermission(false); // Check permission then get token

    checkAutoInit(false);
    isAnalyticsCollectionEnabled(false);
    isPerformanceCollectionEnabled(false);
    isCrashlyticsCollectionEnabled(false);
    isUserSignedIn(false);

    // Platform-specific
    $('body').addClass(cordova.platformId);
    if(cordova.platformId === "android"){
        initAndroid();
    }else if(cordova.platformId === "ios"){
        initIos();
    }
}
$(document).on('deviceready', onDeviceReady);

var initIos = function(){
    FirebasePlugin.onApnsTokenReceived(function(token){
        log("APNS token received: " + token)
    }, function(error) {
        logError("Failed to receive APNS token", error);
    });

    FirebasePlugin.registerInstallationIdChangeListener(function(installationId){
        log("Installation ID changed - new ID: " + installationId);
    });

    FirebasePlugin.registerApplicationDidBecomeActiveListener(function(){
        log("Application did become active");
    });

    FirebasePlugin.registerApplicationDidEnterBackgroundListener(function(){
        log("Application did enter background");
    });
};

var initAndroid = function(){

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
            logError("Create channel error", error);
        }
    );
};

// Notifications
var checkNotificationPermission = function(requested){
    FirebasePlugin.hasPermission(function(hasPermission){
        if(hasPermission){
            log("Remote notifications permission granted");
            // Granted
            getToken(false);
        }else if(!requested){
            // Request permission
            log("Requesting remote notifications permission");
            FirebasePlugin.grantPermission(checkNotificationPermission.bind(this, true));
        }else{
            // Denied
            logError("Notifications won't be shown as permission is denied");
        }
    });
};

var checkAutoInit = function(showUser){
    FirebasePlugin.isAutoInitEnabled(function(enabled){
        log("Auto init is " + (enabled ? "enabled" : "disabled"), showUser);
        $('body')
            .addClass('autoinit-' + (enabled ? 'enabled' : 'disabled'))
            .removeClass('autoinit-' + (enabled ? 'disabled' : 'enabled'));
    }, function(error) {
        logError("Failed to check auto init", error, true);
    });
};

var enableAutoInit = function(){
    FirebasePlugin.setAutoInitEnabled(true, function(){
        log("Enabled auto init", true);
        checkAutoInit(false);
    }, function(error) {
        logError("Failed to enable auto init", error, true);
    });
};

var disableAutoInit = function(){
    FirebasePlugin.setAutoInitEnabled(false, function(){
        log("Disabled auto init", true);
        checkAutoInit(false);
    }, function(error) {
        logError("Failed to disable auto init", erro, truer);
    });
};

var getID = function(){
    FirebasePlugin.getId(function(id){
        log("Got FCM ID: " + id, true)
    }, function(error) {
        logError("Failed to get FCM ID", error, true);
    });
};

var getToken = function(showAlert){
    FirebasePlugin.getToken(function(token){
        log("Got FCM token: " + token, showAlert)
    }, function(error) {
        logError("Failed to get FCM token", error, true);
    });
};

var getAPNSToken = function(){
    FirebasePlugin.getAPNSToken(function(token){
        log("Got APNS token: " + token, true)
    }, function(error) {
        logError("Failed to get APNS token", error, true);
    });
};

var handleNotificationMessage = function(message){

    var title;
    if(message.title){
        title = message.title;
    }else if(message.notification && message.notification.title){
        title = message.notification.title;
    }else if(message.aps && message.aps.alert && message.aps.alert.title){
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

    var msg = "Notification message received";
    if(message.tap){
        msg += " (tapped in " + message.tap + ")";
    }
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
    FirebasePlugin.clearAllNotifications(function(){
        log("Cleared all notifications", true);
    },function(error){
        logError("Failed to clear notifications", error, true);
    });
}

function subscribe(){
    FirebasePlugin.subscribe("my_topic", function(){
        log("Subscribed to topic", true);
    },function(error){
        logError("Failed to subscribe to topic", error, true);
    });
}

function unsubscribe(){
    FirebasePlugin.unsubscribe("my_topic", function(){
        log("Unsubscribed from topic", true);
    },function(error){
        logError("Failed to unsubscribe from topic", error, true);
    });
}

function getBadgeNumber(){
    FirebasePlugin.getBadgeNumber(function(number){
        log("Current badge number: "+number, true);
    },function(error){
        logError("Failed to get badge number", error, true);
    });
}

function incrementBadgeNumber(){
    FirebasePlugin.getBadgeNumber(function(current){
        var number = current+1;
        FirebasePlugin.setBadgeNumber(number, function(){
            log("Set badge number to: "+number, true);
        },function(error){
            logError("Failed to set badge number", error, true);
        });
    },function(error){
        logError("Failed to get badge number", error, true);
    });
}

function clearBadgeNumber(){
    FirebasePlugin.setBadgeNumber(0, function(){
        log("Cleared badge number", true);
    },function(error){
        logError("Failed to clear badge number", error, true);
    });
}

function unregister(){
    FirebasePlugin.unregister(function(){
        log("Unregistered from Firebase", true);
    },function(error){
        logError("Failed to unregister from Firebase", error, true);
    });
}

// Crashlytics
function setCrashlyticsCollectionEnabled(enabled){
    FirebasePlugin.setCrashlyticsCollectionEnabled(enabled, function(){
        log("Crashlytics data collection has been " + (enabled ? "enabled" : "disabled"), true);
    },function(error){
        logError("Failed to enable crashlytics data collection", error, true);
    });
}

function isCrashlyticsCollectionEnabled(showUser){
    FirebasePlugin.isCrashlyticsCollectionEnabled( function(enabled){
        log("Crashlytics data collection setting is " + (enabled ? "enabled" : "disabled"), showUser);
    },function(error){
        logError("Failed to fetch crashlytics data collection setting", error, true);
    });
}

function setCrashlyticsUserId(){
    FirebasePlugin.setCrashlyticsUserId("crashlytics_user_id", function(){
        log("Set crashlytics user ID", true);
    },function(error){
        logError("Failed to set crashlytics user ID", error, true);
    });
}

function setCrashlyticsCustomKey(){
    FirebasePlugin.setCrashlyticsCustomKey("my_key", "foo", function(){
        log("Set crashlytics custom key");
    },function(error){
        logError("Failed to set crashlytics custom key", error);
    });
}

function sendNonFatal(){
    FirebasePlugin.logError("This is a non-fatal error", function(){
        log("Sent non-fatal error", true);
    },function(error){
        logError("Failed to send non-fatal error", error, true);
    });
}

function causeJsException(){
    // Cause an uncaught JS exception
    var foo = someUndefinedVariable.bar;
}

function logCrashMessage(){
    FirebasePlugin.logMessage("A custom message about this crash", function(){
        console.log("Logged crash message - it will be sent with the next crash");
    },function(error){
        logError("Failed to log crash message", error, true);
    });
}

function sendCrash(){
    FirebasePlugin.sendCrash();
}

function sendNdkCrash(){
    helloc.causeCrash();
}

function didCrashOnPreviousExecution(){
    FirebasePlugin.didCrashOnPreviousExecution(function(didCrashOnPreviousExecution){
        log("Did crash on previous execution: "+didCrashOnPreviousExecution, true);
    }, function(error){
        logError("Failed to check crash on previous execution:" + error, true);
    });
}

// Analytics
function setAnalyticsCollectionEnabled(){
    FirebasePlugin.setAnalyticsCollectionEnabled(true, function(){
        log("Enabled analytics data collection", true);
    },function(error){
        logError("Failed to enable analytics data collection", error, true);
    });
}

function isAnalyticsCollectionEnabled(showUser){
    FirebasePlugin.isAnalyticsCollectionEnabled( function(enabled){
        log("Analytics data collection setting is " + (enabled ? "enabled" : "disabled"), showUser);
    },function(error){
        logError("Failed to fetch Analytics data collection setting", error, true);
    });
}

function logEvent(){
    FirebasePlugin.logEvent("my_event", {
        string: "bar",
        integer: 10,
        float: 1.234
    }, function(){
        log("Logged event", true);
    },function(error){
        logError("Failed to log event", error, true);
    });
}

function setScreenName(){
    FirebasePlugin.setScreenName("my_screen", function(){
        log("Sent screen name", true);
    },function(error){
        logError("Failed to send screen name", error, true);
    });
}

function setUserID(){
    FirebasePlugin.setUserId("user_id", function(){
        log("Set user ID", true);
    },function(error){
        logError("Failed to set user ID", error, true);
    });
}

function setUserProperty(){
    FirebasePlugin.setUserProperty("some_key", "some_value", function(){
        log("Set user property", true);
    },function(error){
        logError("Failed to set user property", error, true);
    });
}

// Performance
function setPerformanceCollectionEnabled(){
    FirebasePlugin.setPerformanceCollectionEnabled(true, function(){
        log("Enabled performance data collection");
    },function(error){
        logError("Failed to enable performance data collection", error, true);
    });
}

function isPerformanceCollectionEnabled(showUser){
    FirebasePlugin.isPerformanceCollectionEnabled( function(enabled){
        log("Performance data collection setting is " + (enabled ? "enabled" : "disabled"), showUser);
    },function(error){
        logError("Failed to fetch Performance data collection setting", error, true);
    });
}

var traceName = "my_trace";
function startTrace(){
    FirebasePlugin.startTrace(traceName, function(){
        log("Trace started", true);
    },function(error){
        logError("Failed to start trace", erro, truer);
    });
}

function incrementCounter(){
    FirebasePlugin.incrementCounter(traceName, "my_counter", function(){
        log("Incremented trace counter", true);
    },function(error){
        logError("Failed to increment trace counter", error, true);
    });
}

function stopTrace(){
    FirebasePlugin.stopTrace(traceName, function(){
        log("Trace stopped", true);
    },function(error){
        logError("Failed to stop trace", error, true);
    });
}

// Remote config
function getInfo(){
    FirebasePlugin.getInfo(function(info){
        log("Got remote config info: "+JSON.stringify(info), true);
        console.dir(info);
    },function(error){
        logError("Failed to get remote config info", error, true);
    });
}

var fetchTimeout = 60;
var minimumFetchInterval = 0;
function setConfigSettings(){
    FirebasePlugin.setConfigSettings(fetchTimeout, minimumFetchInterval,function(){
        log("Set remote config settings", true);
    },function(error){
        logError("Failed to set remote config settings", error, true);
    });
}

var defaults = {
    float_value: 2.1,
    json_value: {"some": "json"},
    integer_value: 2,
    boolean_value: false,
    string_value: "not set"
};
function setDefaults(){
    FirebasePlugin.setDefaults(defaults,function(){
        log("Set remote config defaults", true);
    },function(error){
        logError("Failed to set remote config defaults", error, true);
    });
}


var cacheExpirationSeconds = 10;
function fetch(){
    FirebasePlugin.fetch(cacheExpirationSeconds, function(){
        log("Remote config fetched", true);
    },function(error){
        logError("Failed to fetch remote config", error, true);
    });
}

function activateFetched(){
    FirebasePlugin.activateFetched(function(activated){
        log("Remote config was activated: " + activated, true);
    },function(error){
        logError("Failed to activate remote config", error, true);
    });
}

function fetchAndActivate(){
    FirebasePlugin.fetchAndActivate(function(activated){
        log("Remote config was activated: " + activated, true);
    },function(error){
        logError("Failed to activate remote config", error, true);
    });
}

function resetRemoteConfig(){
    FirebasePlugin.resetRemoteConfig(function(){
        log("Successfully reset remote config", true);
    },function(error){
        logError("Failed to reset remote config", error, true);
    });
}

function getAll(){
    FirebasePlugin.getAll(function(values){
        console.dir(values);
        log("Got all values from remote config", true);
        for(var key in values){
            log(key + " = " + values[key]);
        }
    },function(error){
        logError("Failed to get all values from remote config", error, true);
    });
}

function getStringValue(){
    FirebasePlugin.getValue("string_value", function(value){
        value = value.toString();
        console.dir(value);
        log("Got string value of type "+typeof value+ " from remote config: " + value, true);
    },function(error){
        logError("Failed to get string value from remote config", error, true);
    });
}

function getBooleanValue(){
    FirebasePlugin.getValue("boolean_value", function(value){
        value = (value === 'true');
        console.dir(value);
        log("Got boolean value of type "+typeof value+ " from remote config: " + value, true);
    },function(error){
        logError("Failed to get boolean value from remote config", error, true);
    });
}

function getIntegerValue(){
    FirebasePlugin.getValue("integer_value", function(value){
        value = parseInt(value);
        console.dir(value);
        log("Got integer value of type "+typeof value+ " from remote config: " + value, true);
    },function(error){
        logError("Failed to get integer value from remote config", error, true);
    });
}

function getFloatValue(){
    FirebasePlugin.getValue("float_value", function(value){
        value = parseFloat(value);
        console.dir(value);
        log("Got float value of type "+typeof value+ " from remote config: " + value, true);
    },function(error){
        logError("Failed to get float value from remote config", error, true);
    });
}

function getJsonValue(){
    FirebasePlugin.getValue("json_value", function(value){
        try{
            value = JSON.parse(value);
        }catch(e){
            return logError("Failed to parse JSON value from remote config", e.message, true);
        }
        console.dir(value);
        log("Got JSON value of type "+typeof value+ " from remote config: " + JSON.stringify(value), true);
    },function(error){
        logError("Failed to get JSON value from remote config", error, true);
    });
}


// Authentication
var authCredential,
    awaitingSms = false,
    timeoutInSeconds = 60;

function verifyPhoneNumber(){
    var phoneNumber;
    var enterPhoneNumber = function(){
        promptUserForInput("Enter phone number", "Input full phone number including international dialing code", function(_phoneNumber){
            if(!_phoneNumber) return alertUser("Invalid phone number", "Valid phone number must be entered", enterPhoneNumber);
            phoneNumber = _phoneNumber;
            verify();
        });
    };

    var enterVerificationCode = function(credential){
        promptUserForInput("Enter verification code", "Input the code in the received verification SMS", function(verificationCode){
            if(!verificationCode) return alertUser("verification code", "Valid verification code must be entered", enterVerificationCode);
            credential.code = verificationCode;
            verified(credential);
        });
    };

    var dismissUserPromptForVerificationCode = function() {
        navigator.notification.dismissAll();
    };

    var verify = function(){
        var fakeVerificationCode = $('#enterPhoneNumber .mockInstantVerificationInput')[0].checked ? FAKE_SMS_VERIFICATION_CODE : null,
            requireSmsValidation = $('#enterPhoneNumber .requireSmsValidationInput')[0].checked;

        FirebasePlugin.verifyPhoneNumber(function(credential) {
            log("Received phone number verification credential");
            if(credential.instantVerification){
                if(awaitingSms){
                    awaitingSms = false;
                    log("Auto-retrieval used to retrieve verification code from SMS - user does not need to manually enter");
                    dismissUserPromptForVerificationCode();
                }else{
                    log("Instant verification used - no SMS code sent to device");
                }
                verified(credential);
            }else{
                log("Instant verification not used - SMS code sent to device");
                awaitingSms = true;
                enterVerificationCode(credential);
            }
        }, function(error) {
            awaitingSms = false;
            logError("Failed to verify phone number", error, true);
        }, phoneNumber, {
            timeOutDuration: timeoutInSeconds,
            requireSmsValidation: requireSmsValidation,
            fakeVerificationCode: fakeVerificationCode
        });
    };

    var verified = function(credential){
        log("Phone number successefully verified", true);
        authCredential = credential;
    };

    enterPhoneNumber();
}

function enrollSecondAuthFactor(){
    var phoneNumber, displayName, credential;

    var enterPhoneNumber = function(){
        promptUserForInput("Enter phone number", "Input full phone number including international dialing code", function(_phoneNumber){
            if(!_phoneNumber) return alertUser("Invalid phone number", "Valid phone number must be entered", enterPhoneNumber);
            phoneNumber = _phoneNumber;
            enroll();
        });
    };

    var enterDisplayName = function(){
        promptUserForInput("Enter display name", "Input name for second factor e.g. \"Work phone\" (or leave blank)", function(_displayName){
            displayName = _displayName;
            enroll();
        });
    };

    var enterVerificationCode = function(){
        promptUserForInput("Enter verification code", "Input the code in the received verification SMS", function(verificationCode){
            if(!verificationCode) return alertUser("verification code", "Valid verification code must be entered", enterVerificationCode);
            credential.code = verificationCode;
            enroll();
        });
    };

    var enroll = function(){
        if(!phoneNumber) return enterPhoneNumber();
        if(typeof displayName === 'undefined') return enterDisplayName();

        var fakeVerificationCode = $('#enrollSecondAuthFactor .mockInstantVerificationInput')[0].checked ? FAKE_SMS_VERIFICATION_CODE : null,
            requireSmsValidation = $('#enrollSecondAuthFactor .requireSmsValidationInput')[0].checked;

        FirebasePlugin.enrollSecondAuthFactor(function(result) {
            if(typeof result === "object"){
                log("Received second factor credential - SMS code sent to device");
                credential = result;
                enterVerificationCode();
            }else{
                log("Second factor successfully enrolled", true);
            }
        }, function(error) {
            logError("Failed to enroll second factor", error, true);
        }, phoneNumber, {
            displayName: displayName,
            credential, credential,
            timeOutDuration: timeoutInSeconds,
            requireSmsValidation: requireSmsValidation,
            fakeVerificationCode: fakeVerificationCode
        });
    };

    enroll();
}

function verifySecondAuthFactor(){
    if(!_secondFactors) return logError("No second factors found to selected from!", true)
    var selectedIndex, credential, fakeVerificationCode, phoneNumber,  requireSmsValidation;

    var selectFactor = function(){
        var msg = "";
        for(var i=0; i<_secondFactors.length; i++){
            if(msg) msg += '\n';
            var factor = _secondFactors[i];
            msg += (factor.index+1)+": " + factor.displayName + " (" + factor.phoneNumber + ")";
        }
        promptUserForInput("Enter factor number", msg, function(enteredFactorNumber){
            if(!isNumericString(enteredFactorNumber) || !_secondFactors[enteredFactorNumber-1]) return alertUser("Invalid factor", "A factor number between 1 and "+(_secondFactors.length)+" must be entered", selectFactor);
            selectedIndex = enteredFactorNumber-1;
            verify();
        });
    };

    var enterPhoneNumber = function(){
        promptUserForInput("Enter test phone number", "Input test phone number for fake instant verification", function(_phoneNumber){
            if(!_phoneNumber) return alertUser("Invalid phone number", "Valid phone number must be entered", enterPhoneNumber);
            phoneNumber = _phoneNumber;
            verify();
        });
    };

    var enterVerificationCode = function(){
        promptUserForInput("Enter verification code", "Input the code in the received verification SMS", function(verificationCode){
            if(!verificationCode) return alertUser("verification code", "Valid verification code must be entered", enterVerificationCode);
            credential.code = verificationCode;
            verify();
        });
    };

    var confirmUseFakeVerificationCode = function(){
        promptUserForYesNoChoice("Use fake verification code?", "Test instant verification on Android using a test phone number?", function(shouldUse){
            fakeVerificationCode = shouldUse;
            if(fakeVerificationCode){
                enterPhoneNumber();
            }else{
                verify();
            }
        });
    };

    var confirmRequireSMSValidation = function(){
        promptUserForYesNoChoice("Require SMS validation code?", "Always require SMS validation on Android even if instant verification is available?", function(shouldRequire){
            requireSmsValidation = shouldRequire;
            verify();
        });
    };

    var verify = function(){
        if(typeof selectedIndex === 'undefined'){
            if(_secondFactors.length === 1){
                selectedIndex = 0; // only 1 enrolled factor so use that
            }else {
                return selectFactor();
            }
        }
        if(cordova.platformId === "android"){
            if(typeof fakeVerificationCode === 'undefined') return confirmUseFakeVerificationCode();
            if(typeof requireSmsValidation === 'undefined') return confirmRequireSMSValidation();
        }

        FirebasePlugin.verifySecondAuthFactor(function(result) {
            if(typeof result === "object"){
                log("Received second factor credential - SMS code sent to device");
                credential = result;
                enterVerificationCode();
            }else{
                log("Second factor successfully verified", true);
            }
        }, function(error) {
            logError("Failed to verify second factor", error, true);
        }, {
            selectedIndex: selectedIndex,
            credential, credential
        }, {
            timeOutDuration: timeoutInSeconds,
            requireSmsValidation: requireSmsValidation,
            fakeVerificationCode: fakeVerificationCode,
            phoneNumber: phoneNumber
        });
    };

    verify();
}

function listEnrolledSecondFactors(){
    FirebasePlugin.listEnrolledSecondAuthFactors(function(secondFactors) {
        var msg = "";
        if(secondFactors.length === 0){
            msg = "No enrolled second factors"
        }else{
            msg = "Enrolled second factors:";
            for(var i=0; i<secondFactors.length; i++){
                msg += '\n';
                var factor = secondFactors[i];
                msg += (factor.index+1)+": " + factor.displayName;
                if(factor.phoneNumber){
                    msg += " ("+factor.phoneNumber+")";
                }
            }
        }
        log(msg, true);
    }, function(error) {
        logError("Failed to list second factors", error, true);
    });
}

function unenrollSecondFactor(){
    var secondFactors;

    function selectFactor(){
        var msg = "";
        for(var i=0; i<secondFactors.length; i++){
            if(msg) msg += '\n';
            var factor = secondFactors[i];
            msg += (factor.index+1)+": " + factor.displayName;
            if(factor.phoneNumber){
                msg += " ("+factor.phoneNumber+")";
            }
        }
        promptUserForInput("Enter factor number to unenroll", msg, function(enteredFactorNumber){
            if(!isNumericString(enteredFactorNumber) || !secondFactors[enteredFactorNumber-1]) return alertUser("Invalid factor", "A factor number between 1 and "+(secondFactors.length)+" must be entered", selectFactor);
            var selectedIndex = enteredFactorNumber-1;
            unenroll(selectedIndex);
        });
    }

    function unenroll(selectedIndex){
        FirebasePlugin.unenrollSecondAuthFactor(
            function() {
                log("Successfully unenrolled selected second factor", true);
            }, function(error) {
                logError("Failed to unenroll second factor: " + JSON.stringify(error), true);
            },
            selectedIndex
        )
    }

    FirebasePlugin.listEnrolledSecondAuthFactors(function(_secondFactors) {
        if(_secondFactors.length > 0){
            secondFactors = _secondFactors;
            selectFactor();
        }else{
            logError("No second factors are enrolled", true);
        }
    }, function(error) {
        logError("Failed to list second factors", error, true);
    });
}

function authenticateUserWithGoogle(){
    FirebasePlugin.authenticateUserWithGoogle(SERVER_CLIENT_ID, function(credential) {
        authCredential = credential;
        log("Successfully authenticated with Google", true);
    }, function(error) {
        logError("Failed to authenticate with Google", error, true);
    });
}

function authenticateUserWithApple(){
    FirebasePlugin.authenticateUserWithApple(function(credential) {
        authCredential = credential;
        log("Successfully authenticated with Apple", true);
    }, function(error) {
        logError("Failed to authenticate with Apple", error, true);
    }, 'en-GB');
}

function authenticateUserWithMicrosoft(){
    FirebasePlugin.authenticateUserWithMicrosoft(function(credential) {
        authCredential = credential;
        log("Successfully authenticated with Microsoft");
    }, function(error) {
        logError("Failed to authenticate with Microsoft", error);
    }, 'en-GB');
}

function authenticateUserWithFacebook(){
    facebookConnectPlugin.login(["public_profile"],
        function(userData){
            var accessToken = userData.authResponse.accessToken;
            FirebasePlugin.authenticateUserWithFacebook(accessToken, function(credential) {
                authCredential = credential;
                log("Successfully authenticated with Facebook", true);
            }, function(error) {
                logError("Failed to authenticate with Facebook", error, true);
            });

        },
        function(error){
            logError("Failed to login to Facebook", error, true);
        }
    );
}

function signInWithCredential(){
    if(!authCredential) return logError("No auth credential exists - request a credential first");

    FirebasePlugin.signInWithCredential(authCredential, function() {
        log("Successfully signed in", true);
    }, function(error, secondFactors) {
        if(typeof secondFactors !== 'undefined'){
            return handleSecondFactorChallenge(secondFactors)
        }
        logError("Failed to sign in", error, true);
    });
}

function reauthenticateWithCredential(){
    if(!authCredential) return logError("No auth credential exists - request a credential first");

    FirebasePlugin.reauthenticateWithCredential(authCredential, function() {
        log("Successfully reauthenticated", true);
    }, function(error, secondFactors) {
        if(typeof secondFactors !== 'undefined'){
            return handleSecondFactorChallenge(secondFactors)
        }
        logError("Failed to reauthenticate", error, true);
    });
}

function linkUserWithCredential(){
    if(!authCredential) return logError("No auth credential exists - request a credential first", true);

    FirebasePlugin.linkUserWithCredential(authCredential, function() {
        log("Successfully linked user", true);
    }, function(error, secondFactors) {
        if(typeof secondFactors !== 'undefined'){
            return handleSecondFactorChallenge(secondFactors)
        }
        logError("Failed to link user", error, true);
    });
}

function isUserSignedIn(showAlert){
    FirebasePlugin.isUserSignedIn(function(isSignedIn) {
        log("User "+(isSignedIn ? "is" : "is not") + " signed in", showAlert);
    }, function(error) {
        logError("Failed to check if user is signed in", error, true);
    });
}

function signOutUser(){
    FirebasePlugin.signOutUser(function() {
        log("User signed out", true);
    }, function(error) {
        logError("Failed to sign out user", error, true);
    });
}

function getCurrentUser(){
    FirebasePlugin.getCurrentUser(function(user) {
        log("Current user info: " + JSON.stringify(user), true);
    }, function(error) {
        logError("Failed to get current user", error, true);
    });
}

function reloadCurrentUser(){
    FirebasePlugin.reloadCurrentUser(function(user) {
        log("Reloaded user info: " + JSON.stringify(user), true);
    }, function(error) {
        logError("Failed to get reload user", error, true);
    });
}

function updateUserProfile(){
    var profile = {};

    var inputName = function(){
        promptUserForInput("Enter name", "Input user display name", function(name){
            profile.name = name;
            inputPhotoUri();
        });
    };

    var inputPhotoUri = function(){
        promptUserForInput("Enter photo URL", "Input URL for user profile photo", function(url){
            profile.photoUri = url;
            updateProfile();
        });
    };

    var updateProfile = function(){
        FirebasePlugin.updateUserProfile(profile, function(){
            log("User profile successfully updated", true);
        }, function(error) {
            logError("Failed to update user profile", error, true);
        });
    };

    inputName();
}

function updateUserEmail(){
    promptUserForInput("Enter email", "Input new email address", function(email){
        FirebasePlugin.updateUserEmail(email, function(){
            log("User email successfully updated to "+email, true);
        }, function(error) {
            logError("Failed to update user email", error, true);
        });
    });
}

function verifyBeforeUpdateEmail(){
    promptUserForInput("Enter email", "Input new email address", function(email){
        FirebasePlugin.verifyBeforeUpdateEmail(email, function(){
            log("User email successfully updated to "+email, true);
        }, function(error) {
            logError("Failed to update user email", error, true);
        });
    });
}

function sendUserEmailVerification(){
    FirebasePlugin.sendUserEmailVerification(function(){
        log("Sent user email verification successfully updated", true);
    }, function(error) {
        logError("Failed to send user verification email", error, true);
    });
}

function updateUserPassword(){
    promptUserForInput("Enter password", "Input new account password", function(password){
        FirebasePlugin.updateUserPassword(password, function(){
            log("User password successfully updated", true);
        }, function(error) {
            logError("Failed to update user password", error, true);
        });
    });
}

function sendUserPasswordResetEmail(){
    promptUserForInput("Enter email", "Input user email address for reset password", function(email){
        FirebasePlugin.sendUserPasswordResetEmail(email, function(){
            log("User password reset email sent successfully", true);
        }, function(error) {
            logError("Failed to send user password reset email", error, true);
        });
    });
}

function deleteUser(){
    FirebasePlugin.deleteUser(function(){
        log("User account deleted", true);
    }, function(error) {
        logError("Failed to delete current user account", error, true);
    });
}

var _secondFactors;
function handleSecondFactorChallenge(secondFactors){
    _secondFactors = secondFactors;
    verifySecondAuthFactor();
}

function createUserWithEmailAndPassword(){
    promptUserForInput("Enter email", "Email address for new account", function(email){
        promptUserForInput("Enter password", "Password for new account", function(password){
            FirebasePlugin.createUserWithEmailAndPassword(email, password, function(){
                log("Successfully created email/password-based user account", true);
            }, function(error, secondFactors) {
                if(typeof secondFactors !== 'undefined'){
                    return handleSecondFactorChallenge(secondFactors)
                }
                logError("Failed to create email/password-based user account", error, true);
            });
        });
    });
}

function signInUserWithEmailAndPassword(){
    promptUserForInput("Enter email", "Enter email address", function(email){
        promptUserForInput("Enter password", "Enter account password", function(password){
            FirebasePlugin.signInUserWithEmailAndPassword(email, password, function(){
                log("Successfully signed in to email/password-based user account", true);
            }, function(error, secondFactors) {
                if(typeof secondFactors !== 'undefined'){
                    return handleSecondFactorChallenge(secondFactors)
                }
                logError("Failed to sign in to email/password-based user account", error, true);
            });
        });
    });
}

function authenticateUserWithEmailAndPassword(){
    promptUserForInput("Enter email", "Enter email address", function(email){
        promptUserForInput("Enter password", "Enter account password", function(password){
            FirebasePlugin.authenticateUserWithEmailAndPassword(email, password, function(credential) {
                authCredential = credential;
                log("Successfully authenticated with email/password", true);
            }, function(error, secondFactors) {
                if(typeof secondFactors !== 'undefined'){
                    return handleSecondFactorChallenge(secondFactors)
                }
                logError("Failed to authenticate with email/password", error, true);
            });
        });
    });
}


function signInUserWithCustomToken(){
    promptUserForInput("Enter token", "Enter custom token", function(token){
        FirebasePlugin.signInUserWithCustomToken(token, function(){
            log("Successfully signed in with custom token", true);
        }, function(error, secondFactors) {
            if(typeof secondFactors !== 'undefined'){
                return handleSecondFactorChallenge(secondFactors)
            }
            logError("Failed to sign in with custom token", error, true);
        });
    });
}

function signInUserAnonymously(){
    FirebasePlugin.signInUserAnonymously(function(){
        log("Successfully signed in anonymously", true);
    }, function(error) {
        logError("Failed to sign in anonymously", error, true);
    });
}

// Firestore
var firestoreCollection = "my_collection";
var firestoreDocument = {
    "a_string": "foo",
    "a_boolean": true,
    "an_integer": 1,
    "an_array": [1, 2, 3],
    "a_map": {
        "another_string": "bar",
        "another_boolean": false,
        "another_integer": 0,
        "another_array": [3, 2, 1]
    }
};
var firestoreDocumentId = 1;

function addDocumentToFirestoreCollection(){
    FirebasePlugin.addDocumentToFirestoreCollection(firestoreDocument, firestoreCollection, function(id){
        log("Successfully added document to Firestore with id="+id, true);
    }, function(error) {
        logError("Failed to add document to Firestore", error, true);
    });
}

function setDocumentInFirestoreCollection(){
    FirebasePlugin.setDocumentInFirestoreCollection(firestoreDocumentId, firestoreDocument, firestoreCollection, function(){
        log("Successfully set document in Firestore with id="+firestoreDocumentId, true);
    }, function(error) {
        logError("Failed to set document in Firestore", error, true);
    });
}

function updateDocumentInFirestoreCollection(){
    var documentFragment = {
        "an_integer": Math.round(Math.random()*100),
        "a_string": "foobar"
    };
    FirebasePlugin.updateDocumentInFirestoreCollection(firestoreDocumentId, documentFragment, firestoreCollection, function(){
        log("Successfully updated document in Firestore with id="+firestoreDocumentId, true);
    }, function(error) {
        logError("Failed to update document in Firestore", error, true);
    });
}

function deleteDocumentFromFirestoreCollection(){
    FirebasePlugin.deleteDocumentFromFirestoreCollection(firestoreDocumentId, firestoreCollection, function(){
        log("Successfully deleted document in Firestore with id="+firestoreDocumentId, true);
    }, function(error) {
        logError("Failed to delete document in Firestore", error, true);
    });
}

function documentExistsInFirestoreCollection(){
    FirebasePlugin.documentExistsInFirestoreCollection(firestoreDocumentId, firestoreCollection, function(exists){
        log("Document "+(exists ? "exists" : "doesn't exist")+" in Firestore collection", true);
    }, function(error) {
        logError("Failed to check document exists in Firestore", error, true);
    });
}

function fetchDocumentInFirestoreCollection(){
    FirebasePlugin.fetchDocumentInFirestoreCollection(firestoreDocumentId, firestoreCollection, function(document){
        log("Successfully fetched document in Firestore with id="+firestoreDocumentId+"; doc="+JSON.stringify(document), true);
        console.dir(document);
    }, function(error) {
        logError("Failed to fetch document in Firestore", error, true);
    });
}


function fetchFirestoreCollection(){
    var filters = [
        ['where', 'an_integer', '==', 1, 'integer']
    ];
    FirebasePlugin.fetchFirestoreCollection(firestoreCollection, filters, function(data){
        log("Successfully fetched Firestore collection: " + JSON.stringify(data), true);
        console.dir(data);
    }, function(error) {
        logError("Failed to fetch Firestore collection", error, true);
    });
}

var documentListenerId;
function listenToDocument(){
    if(documentListenerId){
        return logError("Document listener already exists", true);
    }

    FirebasePlugin.listenToDocumentInFirestoreCollection(function(documentEvent){
        if(documentEvent.eventType === 'id'){
            documentListenerId = documentEvent.id;
            log("Listening for document changes in Firestore with id="+documentListenerId, true);
        }else{
            log("Document change detected: document="+firestoreDocumentId+"; collection="+firestoreCollection+" changes="+JSON.stringify(documentEvent));
            console.dir(documentEvent);
        }
    }, function(error) {
        logError("Failed to listen for changes to document in Firestore", error, true);
    }, firestoreDocumentId, firestoreCollection, true);
}

function unlistenToDocument(){
    if(!documentListenerId){
        return logError("No document listener currently exists", true);
    }

    FirebasePlugin.removeFirestoreListener(function(){
        documentListenerId = null;
        log("Stopped listening for document changes in Firestore", true);
    }, function(error) {
        logError("Failed to stop listening for changes to document in Firestore", error, true);
    }, documentListenerId);
}

var collectionListenerId;
function listenToCollection(){
    if(collectionListenerId){
        return logError("Collection listener already exists", true);
    }

    FirebasePlugin.listenToFirestoreCollection(function(collectionEvent){
        if(collectionEvent.eventType === 'id'){
            collectionListenerId = collectionEvent.id;
            log("Listening for collection changes in Firestore with id="+collectionListenerId, true);
        }else{
            log("Collection change detected: collection="+firestoreCollection+" changes="+JSON.stringify(collectionEvent));
            console.dir(collectionEvent);
        }
    }, function(error) {
        logError("Failed to listen for changes to collection in Firestore", error, true);
    }, firestoreCollection, null, true);
}

function unlistenToCollection(){
    if(!collectionListenerId){
        return logError("No collection listener currently exists", true);
    }

    FirebasePlugin.removeFirestoreListener(function(){
        collectionListenerId = null;
        log("Stopped listening for collection changes in Firestore", true);
    }, function(error) {
        logError("Failed to stop listening for changes to collection in Firestore", error, true);
    }, collectionListenerId);
}

/**
 * Functions
 */
function callHttpsFunction(){
    var functionName = "multiply";
    var args = {
        a: 2,
        b: 3
    };
    FirebasePlugin.functionsHttpsCallable(functionName, args, function(result){
        log("Successfully called function - result: "+JSON.stringify(result), true);
    }, function(error){
        logError("Error calling function: "+JSON.stringify(error), true);
    });
}

/**
 * Installations
 */
function getInstallationId(){
    FirebasePlugin.getInstallationId(function(id){
        log("Got installation ID: " + id, true);
    }, function(error) {
        logError("Failed to get installation ID", error, true);
    });
}

function getInstallationToken(){
    FirebasePlugin.getInstallationToken(function(token){
        log("Got installation token: " + token);

        // Decode JWT
        try{
            var payload = parseJwt(token);
            log("Token payload: " + JSON.stringify(payload), true);
        }catch(e){
            logError("Exception in decoded installation JWT: "+e.message, true);
        }
    }, function(error) {
        logError("Failed to get installation token", error, true);
    });
}

//https://stackoverflow.com/a/38552302/777265
function parseJwt (token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

function deleteInstallationId(){
    FirebasePlugin.deleteInstallationId(function(){
        log("Deleted installation ID", true);
    }, function(error) {
        logError("Failed to delete installation ID", error, true);
    });
}
