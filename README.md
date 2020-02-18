cordova-plugin-firebasex-test
============================
This repo contains a [Cordova](http://cordova.apache.org/) project which builds a test app for [cordova-plugin-firebasex](https://github.com/dpa99c/cordova-plugin-firebasex) which is a fork of [cordova-plugin-firebase](https://github.com/arnesson/cordova-plugin-firebase) that has been updated to fix several issues.

# CLI build instructions

    git clone https://github.com/dpa99c/cordova-plugin-firebasex-test.git && cd cordova-plugin-firebasex-test
    npm install
    
    cordova platform add ios
    cordova run ios
    
    cordova platform add android
    cordova run android
    
## iOS build notes

### iOS package ID
The [configured package ID](https://github.com/dpa99c/cordova-plugin-firebasex-test/blob/master/config.xml#L2) for this test project is `uk.co.workingedge.firebase.test` which I have registered with my Apple Developer Team in order to create an iOS provisioning profile with appropriate permissions.

Therefore in order to test this project on iOS, you will need to change the package ID to one which is associated with your Apple Developer Team and for which you have set appropriate capabilities.

### Cocopods
[cordova-plugin-firebasex](https://github.com/dpa99c/cordova-plugin-firebasex) relies on `cordova@9`/`cordova-ios@5` support for the [CocoaPods dependency manager]( https://cocoapods.org/) in order to satify the iOS Firebase SDK library dependencies.

Therefore please make sure you have Cocoapods installed in your iOS build environment - setup instructions can be found [here](https://cocoapods.org/).
Also make sure your local Cocoapods repo is up-to-date by running `pod repo update`.

### Building in Xcode
If building your project in Xcode, you need to open `YourProject.xcworkspace` (not `YourProject.xcodeproj`) so both your Cordova app project and the Pods project will be loaded into Xcode.

## Testing Cloud Messaging
If you want to test FCM using this project, you'll need to do the following:

### iOS
- Change the package ID in the [config.xml](https://github.com/dpa99c/cordova-plugin-firebasex-test/blob/master/config.xml#L2) to a package ID which is associated with your Apple Developer Team and for which you have set appropriate capabilities (i.e. enabled Push Notifications).
- Set up a Firebase project and add an iOS app which is configured for your package ID.
- Upload an auth key or APNS certificate for the package ID to the Firebase project
- Download the `GoogleService-Info.plist` for your app and overwrite the [one bundled with this project](https://github.com/dpa99c/cordova-plugin-firebasex-test/blob/master/www/GoogleService-Info.plist).
- Build and run your project on an iOS device (iOS Simulator cannot receive push notifications).

### Android
- Change the package ID in the [config.xml](https://github.com/dpa99c/cordova-plugin-firebasex-test/blob/master/config.xml#L2) to another package ID.
- Set up a Firebase project and add an Android app which is configured for your package ID.
- Download the `google-services.json` for your app and overwrite the [one bundled with this project](https://github.com/dpa99c/cordova-plugin-firebasex-test/blob/master/www/google-services.json).
- Build and run your project on an Android device.

You can send notification (but not data) messages using the Firebase Console.

### Messaging client
In order to send both data and notification messages for testing, this repo includes a messaging client written in nodejs to send predefined messages via the FCM v1 HTTP API for testing.

#### Setup messaging client
In order to setup the messaging client, you first need to download a "service account" private key file from your Firebase project and save it into the root of this repo:

- Open your Firebase project in the Firebase Console
- Go to "Project settings" > "Service accounts" tab
- Press "Generate new private key" and save the file as `service-account.json` in the root of this cloned project repo.

#### Send test messages

- In order to send test messages to your device, you first need to find the Firebase token for the app on the device.
- To do this, build and run this app on the device and it should display the token.
- Copy the token value (e.g. connect Safari Web Inspector/Chrome Dev Tools to the Webview)
- You can then send the messages defined in the `messages/` directory of this repo using the CLI in the root of the repo

Use the following syntax:
```
npm run-script send -- --token="<your_device_token>" --message=<message_name>.json
```
where `<your_device_token>` is the token you noted down and `<message_name>` is the name of a message file in the `messages/` directory, for example:

```    
npm run-script send -- --message=notification.json --token="cJlSa4UjtO0:APA91bFNDPVnHaS1__UTdNc8kt3uplnxBOcPGBbEO37J0FU3vFgGyud7gWDT2RJ5VmSJ68qFyiCu0y-WWcur7hE8RelRkzlS3RK6edFycpvm4K2szsMqMXOxEy72V9a41u6kaVh7U4nz"
```

## Testing authentication
To test the authentication methods, you must configure each method for the target mobile platform as outlined in the plugin documentation for that method.

## Android
Set your server client ID in `www/js/config.js` - see the [Firebase documentation](https://firebase.google.com/docs/auth/android/google-signin#authenticate_with_firebase) for where to find this. This is used for Google Sign In on Android.

# Analytics DebugView
See [this page](https://support.google.com/firebase/answer/7201382?hl=en&utm_id=ad&authuser=1) for how to manually enable Firebase Analytics DebugView.
