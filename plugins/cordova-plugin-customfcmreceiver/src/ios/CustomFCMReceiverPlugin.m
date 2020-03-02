#import "CustomFCMReceiverPlugin.h"
#import "CustomFCMReceiver.h"

@implementation CustomFCMReceiverPlugin

static CustomFCMReceiverPlugin* customFCMReceiverPlugin;
static CustomFCMReceiver* customFCMReceiver;

+ (CustomFCMReceiverPlugin*) customFCMReceiverPlugin {
    return customFCMReceiverPlugin;
}

- (void)pluginInitialize {
    customFCMReceiverPlugin = self;
    customFCMReceiver = [[CustomFCMReceiver alloc] init];
}

+ (void)executeGlobalJavascript: (NSString*)jsString{
    [customFCMReceiverPlugin.commandDelegate evalJs:jsString];
}
@end
