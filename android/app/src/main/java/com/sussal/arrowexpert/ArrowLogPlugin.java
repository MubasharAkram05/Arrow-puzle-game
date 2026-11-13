package com.sussal.arrowexpert;

import android.util.Log;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Writes the game's ad log to logcat with the tag "ArrowAds" (src/ads/status.js adLog), so it can be read with
 * `adb logcat -s ArrowAds`. The JS side only calls it in debug builds.
 */
@CapacitorPlugin(name = "ArrowLog")
public class ArrowLogPlugin extends Plugin {

    @PluginMethod
    public void log(PluginCall call) {
        Log.i("ArrowAds", call.getString("message", ""));
        call.resolve();
    }
}
