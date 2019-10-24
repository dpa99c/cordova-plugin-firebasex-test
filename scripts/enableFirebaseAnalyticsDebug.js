var minimist = require('minimist');
var exec = require('child_process').execSync;

var APP_ID = "uk.co.workingedge.firebase.test";
var XCODE_PROJECT_NAME = "FirebaseTest";

try{
    var args = minimist(process.argv.slice(2));
    var platform = args["platform"];
    var command;
    if(platform === "android"){
        command = "adb shell setprop debug.firebase.analytics.app " + APP_ID;
    }else if(platform === "ios"){
        command = "node scripts/enableFirebaseAnalyticsDebugiOS.js --projectName="+XCODE_PROJECT_NAME;
    }else{
        throw new Error("Please specify --platform=ios|android");
    }

    var result = exec(command);
    if(result.error){
        throw new Error(JSON.stringify(result));
    }

    console.log("Firebase Analytics debug logging successfully enabled for platform="+platform);

}catch(e){
    console.error("ERROR: " + e.message);
}
