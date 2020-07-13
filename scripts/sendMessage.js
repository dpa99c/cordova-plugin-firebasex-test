#!/usr/bin/env node

let message, messageFileName, _projectId, _jwtClient, serviceAccount, args, deviceToken;

var init = function() {
    return new Promise(function(resolve, reject) {
        try{
            serviceAccount = require('../service-account.json');
        }catch(e){
            reject('service-account.json not found - please generate new private key file in your Firebase project > Settings > Service accounts > Generate new private key and save as service-account.json to project root');
            return;
        }

        args = getArgs();

        messageFileName = args['message'];
        if(!messageFileName){
            reject('--message argument not found - please specify as --message={message_file_name.json}');
            return
        }

        try{
            message = require('../messages/'+messageFileName);
        }catch(e){
            reject(messageFileName+'  not found in messages/ - please use the --message parameter to specify a message file in the messages/ directory');
            return;
        }

        var isTopicMessage = JSON.stringify(message).match('topic');

        deviceToken = args['token'];
        if(!deviceToken && !isTopicMessage){
            reject('--token argument not found - please specify as --token={device_token}');
            return;
        }

        if(!isTopicMessage){
            message.token = deviceToken;
        }
        message = {
            message: message,
            validate_only: false
        };

        const googleAuth = require('google-auth-library');

        _projectId = serviceAccount.project_id;
        _jwtClient = new googleAuth.JWT(
            serviceAccount.client_email,
            null,
            serviceAccount.private_key,
            ['https://www.googleapis.com/auth/firebase.messaging'],
            null
        );

        _jwtClient.authorize(function(error, tokens) {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
};

var sendMessage = function() {

    return _jwtClient.request({
        method: 'post',
        url: 'https://fcm.googleapis.com/v1/projects/' + _projectId + '/messages:send',
        data: message
    });
};

var getArgs = function() {
    const args = {};
    process.argv
        .slice(2, process.argv.length)
        .forEach( arg => {
            // long arg
            if (arg.slice(0,2) === '--') {
                const longArg = arg.split('=');
                const longArgFlag = longArg[0].slice(2,longArg[0].length);
                const longArgValue = longArg.length > 1 ? longArg[1] : true;
                args[longArgFlag] = longArgValue;
            }
            // flags
            else if (arg[0] === '-') {
                const flags = arg.slice(1,arg.length).split('');
                flags.forEach(flag => {
                    args[flag] = true;
                });
            }
        });
    return args;
};

init().then(sendMessage)
    .then(() => {
        console.log("Message sent successfully: " + messageFileName);
    })
    .catch((err) => console.error("ERROR: "+ err));
