package com.blockapp

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeMap

class BlockModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "BlockModule"

    @ReactMethod
    fun baslat(reels: Boolean, shorts: Boolean) {
        BlockAccessibilityService.isActive = true
        BlockAccessibilityService.reelsEngelleniyor = reels
        BlockAccessibilityService.shortsEngelleniyor = shorts
    }

    @ReactMethod
    fun durdur() {
        BlockAccessibilityService.isActive = false
    }

    @ReactMethod
    fun accessibilityAc() {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        reactContext.startActivity(intent)
    }

    @ReactMethod
    fun overlayIzniAc() {
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:${reactContext.packageName}")
        )
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        reactContext.startActivity(intent)
    }

    @ReactMethod
    fun accessibilityAcikMi(promise: Promise) {
        val service = "${reactContext.packageName}/${BlockAccessibilityService::class.java.canonicalName}"
        val enabledServices = Settings.Secure.getString(
            reactContext.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: ""
        promise.resolve(enabledServices.contains(service))
    }

    @ReactMethod
    fun istatistikleriOku(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("BlockPrefs", Context.MODE_PRIVATE)
            val reelsCount = prefs.getInt("reels_count", 0)
            val shortsCount = prefs.getInt("shorts_count", 0)

            val map = WritableNativeMap()
            map.putInt("reelsCount", reelsCount)
            map.putInt("shortsCount", shortsCount)
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun istatistikleriSifirla() {
        val prefs = reactContext.getSharedPreferences("BlockPrefs", Context.MODE_PRIVATE)
        prefs.edit().putInt("reels_count", 0).putInt("shorts_count", 0).apply()
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}