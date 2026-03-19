package org.sunbird.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Prevent WebView from reloading the app when network connectivity changes
        this.bridge.getWebView().setNetworkAvailable(true);
    }
}
