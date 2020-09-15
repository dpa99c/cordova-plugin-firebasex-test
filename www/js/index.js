var $output, FirebasePlugin;

// Fake authentication code as defined in the Firebase Console: see https://firebase.google.com/docs/auth/android/phone-auth#integration-testing
var FAKE_SMS_VERIFICATION_CODE = '123456';

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

function logError(msg, error){
    if(typeof error === 'object'){
        msg += ': ' + JSON.stringify(error);
    }else if(typeof error === 'string'){
        msg += ': ' + error;
    }
    log(msg, {
        logLevel: "error"
    });
}

function clearLog(){
    $output.empty();
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

// Init
function onDeviceReady(){
    FirebasePlugin = window.FirebasePlugin;
    $output = $('#log-output');
    log("deviceready");


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

    checkAutoInit();
    isAnalyticsCollectionEnabled();
    isPerformanceCollectionEnabled();
    isCrashlyticsCollectionEnabled();
    isUserSignedIn();

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
            getToken();
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

var checkAutoInit = function(){
    FirebasePlugin.isAutoInitEnabled(function(enabled){
        log("Auto init is " + (enabled ? "enabled" : "disabled"));
        $('body')
            .addClass('autoinit-' + (enabled ? 'enabled' : 'disabled'))
            .removeClass('autoinit-' + (enabled ? 'disabled' : 'enabled'));
    }, function(error) {
        logError("Failed to check auto init", error);
    });
};

var enableAutoInit = function(){
    FirebasePlugin.setAutoInitEnabled(true, function(){
        log("Enabled auto init");
        checkAutoInit();
    }, function(error) {
        logError("Failed to enable auto init", error);
    });
};

var disableAutoInit = function(){
    FirebasePlugin.setAutoInitEnabled(false, function(){
        log("Disabled auto init");
        checkAutoInit();
    }, function(error) {
        logError("Failed to disable auto init", error);
    });
};

var getID = function(){
    FirebasePlugin.getId(function(id){
        log("Got FCM ID: " + id)
    }, function(error) {
        logError("Failed to get FCM ID", error);
    });
};

var getToken = function(){
    FirebasePlugin.getToken(function(token){
        log("Got FCM token: " + token)
    }, function(error) {
        logError("Failed to get FCM token", error);
    });
};

var getAPNSToken = function(){
    FirebasePlugin.getAPNSToken(function(token){
        log("Got APNS token: " + token)
    }, function(error) {
        logError("Failed to get APNS token", error);
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
        log("Cleared all notifications");
    },function(error){
        logError("Failed to clear notifications", error);
    });
}

function subscribe(){
    FirebasePlugin.subscribe("my_topic", function(){
        log("Subscribed to topic");
    },function(error){
        logError("Failed to subscribe to topic", error);
    });
}

function unsubscribe(){
    FirebasePlugin.unsubscribe("my_topic", function(){
        log("Unsubscribed from topic");
    },function(error){
        logError("Failed to unsubscribe from topic", error);
    });
}

function getBadgeNumber(){
    FirebasePlugin.getBadgeNumber(function(number){
        log("Current badge number: "+number);
    },function(error){
        logError("Failed to get badge number", error);
    });
}

function incrementBadgeNumber(){
    FirebasePlugin.getBadgeNumber(function(current){
        var number = current+1;
        FirebasePlugin.setBadgeNumber(number, function(){
            log("Set badge number to: "+number);
        },function(error){
            logError("Failed to set badge number", error);
        });
    },function(error){
        logError("Failed to get badge number", error);
    });
}

function clearBadgeNumber(){
    FirebasePlugin.setBadgeNumber(0, function(){
        log("Cleared badge number");
    },function(error){
        logError("Failed to clear badge number", error);
    });
}

function unregister(){
    FirebasePlugin.unregister(function(){
        log("Unregistered from Firebase");
    },function(error){
        logError("Failed to unregister from Firebase", error);
    });
}

// Crashlytics
function setCrashlyticsCollectionEnabled(enabled){
    FirebasePlugin.setCrashlyticsCollectionEnabled(enabled, function(){
        log("Crashlytics data collection has been " + (enabled ? "enabled" : "disabled"));
    },function(error){
        logError("Failed to enable crashlytics data collection", error);
    });
}

function isCrashlyticsCollectionEnabled(){
    FirebasePlugin.isCrashlyticsCollectionEnabled( function(enabled){
        log("Crashlytics data collection setting is " + (enabled ? "enabled" : "disabled"));
    },function(error){
        logError("Failed to fetch crashlytics data collection setting", error);
    });
}

function setCrashlyticsUserId(){
    FirebasePlugin.setCrashlyticsUserId("crashlytics_user_id", function(){
        log("Set crashlytics user ID");
    },function(error){
        logError("Failed to set crashlytics user ID", error);
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
        log("Sent non-fatal error");
    },function(error){
        logError("Failed to send non-fatal error", error);
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
        logError("Failed to log crash message", error);
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
        log("Did crash on previous execution: "+didCrashOnPreviousExecution);
    }, function(error){
        logError("Failed to check crash on previous execution:" + error);
    });
}

// Analytics
function setAnalyticsCollectionEnabled(){
    FirebasePlugin.setAnalyticsCollectionEnabled(true, function(){
        log("Enabled analytics data collection");
    },function(error){
        logError("Failed to enable analytics data collection", error);
    });
}

function isAnalyticsCollectionEnabled(){
    FirebasePlugin.isAnalyticsCollectionEnabled( function(enabled){
        log("Analytics data collection setting is " + (enabled ? "enabled" : "disabled"));
    },function(error){
        logError("Failed to fetch Analytics data collection setting", error);
    });
}

function logEvent(){
    FirebasePlugin.logEvent("my_event", {
        string: "bar",
        integer: 10,
        float: 1.234
    }, function(){
        log("Logged event");
    },function(error){
        logError("Failed to log event", error);
    });
}

function setScreenName(){
    FirebasePlugin.setScreenName("my_screen", function(){
        log("Sent screen name");
    },function(error){
        logError("Failed to send screen name", error);
    });
}

function setUserID(){
    FirebasePlugin.setUserId("user_id", function(){
        log("Set user ID");
    },function(error){
        logError("Failed to set user ID", error);
    });
}

function setUserProperty(){
    FirebasePlugin.setUserProperty("some_key", "some_value", function(){
        log("Set user property");
    },function(error){
        logError("Failed to set user property", error);
    });
}

// Performance
function setPerformanceCollectionEnabled(){
    FirebasePlugin.setPerformanceCollectionEnabled(true, function(){
        log("Enabled performance data collection");
    },function(error){
        logError("Failed to enable performance data collection", error);
    });
}

function isPerformanceCollectionEnabled(){
    FirebasePlugin.isPerformanceCollectionEnabled( function(enabled){
        log("Performance data collection setting is " + (enabled ? "enabled" : "disabled"));
    },function(error){
        logError("Failed to fetch Performance data collection setting", error);
    });
}

var traceName = "my_trace";
function startTrace(){
    FirebasePlugin.startTrace(traceName, function(){
        log("Trace started");
    },function(error){
        logError("Failed to start trace", error);
    });
}

function incrementCounter(){
    FirebasePlugin.incrementCounter(traceName, "my_counter", function(){
        log("Incremented trace counter");
    },function(error){
        logError("Failed to increment trace counter", error);
    });
}

function stopTrace(){
    FirebasePlugin.stopTrace(traceName, function(){
        log("Trace stopped");
    },function(error){
        logError("Failed to stop trace", error);
    });
}

// Remote config
function getInfo(){
    FirebasePlugin.getInfo(function(info){
        log("Got remote config info: "+JSON.stringify(info));
        console.dir(info);
    },function(error){
        logError("Failed to get remote config info", error);
    });
}

var fetchTimeout = 60;
var minimumFetchInterval = 0;
function setConfigSettings(){
    FirebasePlugin.setConfigSettings(fetchTimeout, minimumFetchInterval,function(){
        log("Set remote config settings");
    },function(error){
        logError("Failed to set remote config settings", error);
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
        log("Set remote config defaults");
    },function(error){
        logError("Failed to set remote config defaults", error);
    });
}


var cacheExpirationSeconds = 10;
function fetch(){
    FirebasePlugin.fetch(cacheExpirationSeconds, function(){
        log("Remote config fetched");
    },function(error){
        logError("Failed to fetch remote config", error);
    });
}

function activateFetched(){
    FirebasePlugin.activateFetched(function(activated){
        log("Remote config was activated: " + activated);
    },function(error){
        logError("Failed to activate remote config", error);
    });
}

function fetchAndActivate(){
    FirebasePlugin.fetchAndActivate(function(activated){
        log("Remote config was activated: " + activated);
    },function(error){
        logError("Failed to activate remote config", error);
    });
}

function resetRemoteConfig(){
    FirebasePlugin.resetRemoteConfig(function(){
        log("Successfully reset remote config");
    },function(error){
        logError("Failed to reset remote config", error);
    });
}

function getAll(){
    FirebasePlugin.getAll(function(values){
        console.dir(values);
        log("Got all values from remote config:");
        for(var key in values){
            log(key + " = " + values[key]);
        }
    },function(error){
        logError("Failed to get all values from remote config", error);
    });
}

function getStringValue(){
    FirebasePlugin.getValue("string_value", function(value){
        value = value.toString();
        console.dir(value);
        log("Got string value of type "+typeof value+ " from remote config: " + value);
    },function(error){
        logError("Failed to get string value from remote config", error);
    });
}

function getBooleanValue(){
    FirebasePlugin.getValue("boolean_value", function(value){
        value = (value === 'true');
        console.dir(value);
        log("Got boolean value of type "+typeof value+ " from remote config: " + value);
    },function(error){
        logError("Failed to get boolean value from remote config", error);
    });
}

function getIntegerValue(){
    FirebasePlugin.getValue("integer_value", function(value){
        value = parseInt(value);
        console.dir(value);
        log("Got integer value of type "+typeof value+ " from remote config: " + value);
    },function(error){
        logError("Failed to get integer value from remote config", error);
    });
}

function getFloatValue(){
    FirebasePlugin.getValue("float_value", function(value){
        value = parseFloat(value);
        console.dir(value);
        log("Got float value of type "+typeof value+ " from remote config: " + value);
    },function(error){
        logError("Failed to get float value from remote config", error);
    });
}

function getJsonValue(){
    FirebasePlugin.getValue("json_value", function(value){
        try{
            value = JSON.parse(value);
        }catch(e){
            return logError("Failed to parse JSON value from remote config", e.message);
        }
        console.dir(value);
        log("Got JSON value of type "+typeof value+ " from remote config: " + JSON.stringify(value));
    },function(error){
        logError("Failed to get JSON value from remote config", error);
    });
}


// Authentication
var authCredential;
function verifyPhoneNumber(){

    var timeoutInSeconds = 60;
    var awaitingSms = false;

    var enterPhoneNumber = function(){
        promptUserForInput("Enter phone number", "Input full phone number including international dialing code", function(phoneNumber){
            if(!phoneNumber) return logError("Valid phone number must be entered");
            verify(phoneNumber);
        });
    };

    var enterVerificationCode = function(credential){
        promptUserForInput("Enter verification code", "Input the code in the received verification SMS", function(verificationCode){
            if(!verificationCode) return logError("Valid verification code must be entered");
            credential.code = verificationCode;
            verified(credential);
        });
    };

    var dismissUserPromptForVerificationCode = function() {
        navigator.notification.dismissAll();
    };

    var verify = function(phoneNumber){
        var fakeVerificationCode = $('#mockInstantVerificationInput')[0].checked ? FAKE_SMS_VERIFICATION_CODE : null;

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
            logError("Failed to verify phone number", error);
        }, phoneNumber, timeoutInSeconds, fakeVerificationCode);
    };

    var verified = function(credential){
        authCredential = credential;
    };

    enterPhoneNumber();
}

function authenticateUserWithGoogle(){
    FirebasePlugin.authenticateUserWithGoogle(SERVER_CLIENT_ID, function(credential) {
        authCredential = credential;
        log("Successfully authenticated with Google");
    }, function(error) {
        logError("Failed to authenticate with Google", error);
    });
}

function authenticateUserWithApple(){
    FirebasePlugin.authenticateUserWithApple(function(credential) {
        authCredential = credential;
        log("Successfully authenticated with Apple");
    }, function(error) {
        logError("Failed to authenticate with Apple", error);
    }, 'en-GB');
}

function signInWithCredential(){
    if(!authCredential) return logError("No auth credential exists - request a credential first");

    FirebasePlugin.signInWithCredential(authCredential, function() {
        log("Successfully signed in");
    }, function(error) {
        logError("Failed to sign in", error);
    });
}

function reauthenticateWithCredential(){
    if(!authCredential) return logError("No auth credential exists - request a credential first");

    FirebasePlugin.reauthenticateWithCredential(authCredential, function() {
        log("Successfully reauthenticated");
    }, function(error) {
        logError("Failed to reauthenticate", error);
    });
}

function linkUserWithCredential(){
    if(!authCredential) return logError("No auth credential exists - request a credential first");

    FirebasePlugin.linkUserWithCredential(authCredential, function() {
        log("Successfully linked user");
    }, function(error) {
        logError("Failed to link user", error);
    });
}

function isUserSignedIn(){
    FirebasePlugin.isUserSignedIn(function(isSignedIn) {
        log("User "+(isSignedIn ? "is" : "is not") + " signed in");
    }, function(error) {
        logError("Failed to check if user is signed in", error);
    });
}

function signOutUser(){
    FirebasePlugin.signOutUser(function() {
        log("User signed out");
    }, function(error) {
        logError("Failed to sign out user", error);
    });
}

function getCurrentUser(){
    FirebasePlugin.getCurrentUser(function(user) {
        log("Current user info: " + JSON.stringify(user));
    }, function(error) {
        logError("Failed to get current user", error);
    });
}

function reloadCurrentUser(){
    FirebasePlugin.reloadCurrentUser(function(user) {
        log("Reloaded user info: " + JSON.stringify(user));
    }, function(error) {
        logError("Failed to get reload user", error);
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
            log("User profile successfully updated");
        }, function(error) {
            logError("Failed to update user profile", error);
        });
    };

    inputName();
}

function updateUserEmail(){
    promptUserForInput("Enter email", "Input user email address to update", function(email){
        FirebasePlugin.updateUserEmail(email, function(){
            log("User email successfully updated");
        }, function(error) {
            logError("Failed to update user email", error);
        });
    });
}

function sendUserEmailVerification(){
    FirebasePlugin.sendUserEmailVerification(function(){
        log("Sent user email verification successfully updated");
    }, function(error) {
        logError("Failed to send user verification email", error);
    });
}

function updateUserPassword(){
    promptUserForInput("Enter password", "Input new account password", function(password){
        FirebasePlugin.updateUserPassword(password, function(){
            log("User password successfully updated");
        }, function(error) {
            logError("Failed to update user password", error);
        });
    });
}

function sendUserPasswordResetEmail(){
    promptUserForInput("Enter email", "Input user email address for reset password", function(email){
        FirebasePlugin.sendUserPasswordResetEmail(email, function(){
            log("User password reset email sent successfully");
        }, function(error) {
            logError("Failed to send user password reset email", error);
        });
    });
}

function deleteUser(){
    FirebasePlugin.deleteUser(function(){
        log("User account deleted");
    }, function(error) {
        logError("Failed to delete current user account", error);
    });
}

function createUserWithEmailAndPassword(){
    promptUserForInput("Enter email", "Email address for new account", function(email){
        promptUserForInput("Enter password", "Password for new account", function(password){
            FirebasePlugin.createUserWithEmailAndPassword(email, password, function(){
                log("Successfully created email/password-based user account");
            }, function(error) {
                logError("Failed to create email/password-based user account", error);
            });
        });
    });
}

function signInUserWithEmailAndPassword(){
    promptUserForInput("Enter email", "Enter email address", function(email){
        promptUserForInput("Enter password", "Enter account password", function(password){
            FirebasePlugin.signInUserWithEmailAndPassword(email, password, function(){
                log("Successfully signed in to email/password-based user account");
            }, function(error) {
                logError("Failed to sign in to email/password-based user account", error);
            });
        });
    });
}

function authenticateUserWithEmailAndPassword(){
    promptUserForInput("Enter email", "Enter email address", function(email){
        promptUserForInput("Enter password", "Enter account password", function(password){
            FirebasePlugin.authenticateUserWithEmailAndPassword(email, password, function(credential) {
                authCredential = credential;
                log("Successfully authenticated with email/password");
            }, function(error) {
                logError("Failed to authenticate with email/password", error);
            });
        });
    });
}


function signInUserWithCustomToken(){
    promptUserForInput("Enter token", "Enter custom token", function(token){
        FirebasePlugin.signInUserWithCustomToken(token, function(){
            log("Successfully signed in with custom token");
        }, function(error) {
            logError("Failed to sign in with custom token", error);
        });
    });
}

function signInUserAnonymously(){
    FirebasePlugin.signInUserAnonymously(function(){
        log("Successfully signed in anonymously");
    }, function(error) {
        logError("Failed to sign in anonymously", error);
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
        log("Successfully added document to Firestore with id="+id);
    }, function(error) {
        logError("Failed to add document to Firestore", error);
    });
}

function setDocumentInFirestoreCollection(){
    FirebasePlugin.setDocumentInFirestoreCollection(firestoreDocumentId, firestoreDocument, firestoreCollection, function(){
        log("Successfully set document in Firestore with id="+firestoreDocumentId);
    }, function(error) {
        logError("Failed to set document in Firestore", error);
    });
}

function updateDocumentInFirestoreCollection(){
    var documentFragment = {
        "an_integer": Math.round(Math.random()*100),
        "a_string": "foobar"
    };
    FirebasePlugin.updateDocumentInFirestoreCollection(firestoreDocumentId, documentFragment, firestoreCollection, function(){
        log("Successfully updated document in Firestore with id="+firestoreDocumentId);
    }, function(error) {
        logError("Failed to update document in Firestore", error);
    });
}

function deleteDocumentFromFirestoreCollection(){
    FirebasePlugin.deleteDocumentFromFirestoreCollection(firestoreDocumentId, firestoreCollection, function(){
        log("Successfully deleted document in Firestore with id="+firestoreDocumentId);
    }, function(error) {
        logError("Failed to delete document in Firestore", error);
    });
}

function documentExistsInFirestoreCollection(){
    FirebasePlugin.documentExistsInFirestoreCollection(firestoreDocumentId, firestoreCollection, function(exists){
        log("Document "+(exists ? "exists" : "doesn't exist")+" in Firestore collection");
    }, function(error) {
        logError("Failed to check document exists in Firestore", error);
    });
}

function fetchDocumentInFirestoreCollection(){
    FirebasePlugin.fetchDocumentInFirestoreCollection(firestoreDocumentId, firestoreCollection, function(document){
        log("Successfully fetched document in Firestore with id="+firestoreDocumentId+"; doc="+JSON.stringify(document));
        console.dir(document);
    }, function(error) {
        logError("Failed to fetch document in Firestore", error);
    });
}


function fetchFirestoreCollection(){
    var filters = [
        ['where', 'an_integer', '==', 1, 'integer']
    ];
    FirebasePlugin.fetchFirestoreCollection(firestoreCollection, filters, function(data){
        log("Successfully fetched Firestore collection: " + JSON.stringify(data));
        console.dir(data);
    }, function(error) {
        logError("Failed to fetch Firestore collection", error);
    });
}

var documentListenerId;
function listenToDocument(){
    if(documentListenerId){
        return logError("Document listener already exists");
    }

    FirebasePlugin.listenToDocumentInFirestoreCollection(function(documentEvent){
        if(documentEvent.eventType === 'id'){
            documentListenerId = documentEvent.id;
            log("Listening for document changes in Firestore with id="+documentListenerId);
        }else{
            log("Document change detected: document="+firestoreDocumentId+"; collection="+firestoreCollection+" changes="+JSON.stringify(documentEvent));
            console.dir(documentEvent);
        }
    }, function(error) {
        logError("Failed to listen for changes to document in Firestore", error);
    }, firestoreDocumentId, firestoreCollection, true);
}

function unlistenToDocument(){
    if(!documentListenerId){
        return logError("No document listener currently exists");
    }

    FirebasePlugin.removeFirestoreListener(function(){
        documentListenerId = null;
        log("Stopped listening for document changes in Firestore");
    }, function(error) {
        logError("Failed to stop listening for changes to document in Firestore", error);
    }, documentListenerId);
}

var collectionListenerId;
function listenToCollection(){
    if(collectionListenerId){
        return logError("Collection listener already exists");
    }

    FirebasePlugin.listenToFirestoreCollection(function(collectionEvent){
        if(collectionEvent.eventType === 'id'){
            collectionListenerId = collectionEvent.id;
            log("Listening for collection changes in Firestore with id="+collectionListenerId);
        }else{
            log("Collection change detected: collection="+firestoreCollection+" changes="+JSON.stringify(collectionEvent));
            console.dir(collectionEvent);
        }
    }, function(error) {
        logError("Failed to listen for changes to collection in Firestore", error);
    }, firestoreCollection, null, true);
}

function unlistenToCollection(){
    if(!collectionListenerId){
        return logError("No collection listener currently exists");
    }

    FirebasePlugin.removeFirestoreListener(function(){
        collectionListenerId = null;
        log("Stopped listening for collection changes in Firestore");
    }, function(error) {
        logError("Failed to stop listening for changes to collection in Firestore", error);
    }, collectionListenerId);
}
