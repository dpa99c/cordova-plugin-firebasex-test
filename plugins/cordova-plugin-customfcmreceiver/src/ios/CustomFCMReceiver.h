#import "FirebasePluginMessageReceiver.h"

@interface CustomFCMReceiver : FirebasePluginMessageReceiver
- (bool) sendNotification:(NSDictionary *)userInfo;
@end
