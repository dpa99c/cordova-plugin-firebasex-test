package cordova.plugin.customfcmreceiver;

import android.app.Activity;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;

import com.google.firebase.messaging.RemoteMessage;

import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.firebase.FirebasePluginMessageReceiver;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;

public class CustomFCMReceiverPlugin extends CordovaPlugin {

    public static CustomFCMReceiverPlugin instance = null;
    static final String TAG = "CustomFCMReceiverPlugin";
    static final String javascriptNamespace = "cordova.plugin.customfcmreceiver";

    private CustomFCMReceiver customFCMReceiver;


    @Override
    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
        Log.d(TAG, "initialize");
        try {
            instance = this;
            this.webView = webView;
            customFCMReceiver = new CustomFCMReceiver();

        }catch (Exception e){
            handleException("Initializing plugin", e);
        }
        super.initialize(cordova, webView);
    }

    protected static void handleError(String errorMsg) {
        Log.e(TAG, errorMsg);
    }

    protected static void handleException(String description, Exception exception) {
        handleError(description + ": " + exception.toString());
    }

    protected static void executeGlobalJavascript(final String jsString) {
        instance.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                instance.webView.loadUrl("javascript:" + jsString);
            }
        });
    }

    protected static void jsCallback(String name, String arguments) {
        String jsStatement = String.format(javascriptNamespace+"[\"%s\"](%s);", name, arguments);
        executeGlobalJavascript(jsStatement);
    }


    protected static String jsQuoteEscape(String js) {
        js = js.replace("\"", "\\\"");
        return "\"" + js + "\"";
    }

    private Activity getActivity() {
        return this.cordova.getActivity();
    }

    private void sendMessageToJS(String message){
        jsCallback("_onMessageReceived", jsQuoteEscape(message));
    }

    private Map<String, String> bundleToMap(Bundle extras) {
        Map<String, String> map = new HashMap<String, String>();

        Set<String> ks = extras.keySet();
        Iterator<String> iterator = ks.iterator();
        while (iterator.hasNext()) {
            String key = iterator.next();
            map.put(key, extras.getString(key));
        }
        return map;
    }

    private boolean inspectAndHandleMessageData(Map<String, String> data) {
        boolean isHandled = false;
        if (data.containsKey("custom") && data.containsKey("text")) {
            isHandled = true;
            instance.sendMessageToJS(data.get("text"));
        }
        return isHandled;
    }

    private class CustomFCMReceiver extends FirebasePluginMessageReceiver {
        @Override
        public boolean onMessageReceived(RemoteMessage remoteMessage){
            Log.d("CustomFCMReceiver", "onMessageReceived");
            boolean isHandled = false;

            try {
                Map<String, String> data = remoteMessage.getData();
                isHandled = inspectAndHandleMessageData(data);
            }catch (Exception e){
                handleException("onMessageReceived", e);
            }

            return isHandled;
        }

        @Override
        public boolean sendMessage(Bundle bundle){
            Log.d("CustomFCMReceiver", "sendMessage");
            boolean isHandled = false;

            try {
                Map<String, String> data = bundleToMap(bundle);
                isHandled = inspectAndHandleMessageData(data);
            }catch (Exception e){
                handleException("onMessageReceived", e);
            }

            return isHandled;
        }
    }
}
