#import <Cordova/CDV.h>

@interface CustomFCMReceiverPlugin : CDVPlugin
+ (CustomFCMReceiverPlugin *) customFCMReceiverPlugin;
+ (void)executeGlobalJavascript: (NSString*)jsString;
@end
