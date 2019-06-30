cordova-plugin-firebase-test
============================

This repo contains a [Cordova](http://cordova.apache.org/) project which builds a test app for [cordova-plugin-firebasex](https://github.com/dpa99c/cordova-plugin-firebase) which is a fork of [cordova-plugin-firebase](https://github.com/arnesson/cordova-plugin-firebase) that has been updated to fix several issues.


# CLI build instructions

    git clone https://github.com/dpa99c/cordova-plugin-firebase-test.git && cd cordova-plugin-firebase-test
    
    cordova platform add ios
    cordova run ios
    
    cordova platform add android
    cordova run android
    
## iOS build notes

### iOS package ID
The [configured package ID](https://github.com/dpa99c/cordova-plugin-firebase-test/blob/master/config.xml#L2) for this test project is `uk.co.workingedge.firebase.test` which I have registered with my Apple Developer Team in order to create an iOS provisioning profile APNS certificate for it in order to test iOS Push Notifications via the Firebase Console.

Therefore in order to build this project for iOS, you may need to change the package ID to one which is associated with your Apple Developer Team and for which you have set appropriate capabilities (i.e. enabled Push Notifications). 

### Cocopods
[cordova-plugin-firebasex](https://github.com/dpa99c/cordova-plugin-firebase) depends on [cordova-plugin-cocoapod-supportx](https://github.com/dpa99c/cordova-plugin-cocoapods-support) which adds Cordova support for the [CocoaPods dependency manager]( https://cocoapods.org/) in order to satify the iOS Firebase SDK library dependencies.

Therefore please make sure you have Cocopods installed in your iOS build environemnt - setup instructions can be found [here](https://cocoapods.org/).
Also make sure your local Cocoapods repo is up-to-date by running `pod repo update`.

### Building in Xcode

If building your project in Xcode, you need to open `YourProject.xcworkspace` (not `YourProject.xcodeproj`) so both your Cordova app project and the Pods project will be loaded into Xcode.

## Testing Push Notifications
If you want to test Push Notifications using this project, you'll need to do the following:

### iOS
- Change the package ID in the [config.xml](https://github.com/dpa99c/cordova-plugin-firebase-test/blob/master/config.xml#L2) to a package ID which is associated with your Apple Developer Team and for which you have set appropriate capabilities (i.e. enabled Push Notifications).
- Set up a Firebase project and add an iOS app which is configured for your package ID.
- Upload an auth key or APNS certificate for the package ID to the Firebase project
- Download the `GoogleService-Info.plist` for your app and overwrite the [one bundled with this project](https://github.com/dpa99c/cordova-plugin-firebase-test/blob/master/www/GoogleService-Info.plist).
- Build and run your project on an iOS device (iOS Simulator cannot receive push notifications).
- Use the Firebase Console to send a Push Notification to your app.

### Android
- Change the package ID in the [config.xml](https://github.com/dpa99c/cordova-plugin-firebase-test/blob/master/config.xml#L2) to another package ID.
- Set up a Firebase project and add an Android app which is configured for your package ID.
- Download the `google-services.json` for your app and overwrite the [one bundled with this project](https://github.com/dpa99c/cordova-plugin-firebase-test/blob/master/www/google-services.json).
- Build and run your project on an Android device.
- Use the Firebase Console to send a Push Notification to your app.
