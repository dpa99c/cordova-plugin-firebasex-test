#import "CustomFCMReceiver.h"
#import "CustomFCMReceiverPlugin.h"

@implementation CustomFCMReceiver

static NSString*const javascriptNamespace = @"cordova.plugin.customfcmreceiver";

- (bool) sendNotification:(NSDictionary *)userInfo {
    bool isHandled = false;
    if([userInfo objectForKey:@"custom"] != nil && [userInfo objectForKey:@"text"] != nil){
        isHandled = true;
        [CustomFCMReceiverPlugin executeGlobalJavascript:[NSString stringWithFormat:@"%@._onMessageReceived(\"%@\")", javascriptNamespace, [self escapeDoubleQuotes:[userInfo objectForKey:@"text"]]]];
    }
    return isHandled;
}

- (NSString*)escapeDoubleQuotes: (NSString*)str {
    NSString *result =[str stringByReplacingOccurrencesOfString: @"\"" withString: @"\\\""];
    return result;
}

@end
