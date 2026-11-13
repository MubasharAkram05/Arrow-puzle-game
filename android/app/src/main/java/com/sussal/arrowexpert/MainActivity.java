package com.sussal.arrowexpert;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // local plugins must be registered before the bridge starts
        registerPlugin(ArrowLogPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
