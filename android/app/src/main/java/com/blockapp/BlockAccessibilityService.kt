package com.blockapp

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.graphics.PixelFormat
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.ImageView
import com.bumptech.glide.Glide

class BlockAccessibilityService : AccessibilityService() {

    private val handler = Handler(Looper.getMainLooper())
    private var engelleniyor = false
    private var windowManager: WindowManager? = null

    override fun onServiceConnected() {
        val info = AccessibilityServiceInfo()
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
        info.flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
        info.packageNames = arrayOf("com.instagram.android", "com.google.android.youtube")
        serviceInfo = info
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        durumYukle(this)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (!isActive || engelleniyor) return

        val packageName = event?.packageName?.toString() ?: return
        val rootNode = rootInActiveWindow ?: return

        when (packageName) {
            "com.instagram.android" -> {
                if (reelsEngelleniyor && reelsAcikMi(rootNode)) {
                    engelleniyor = true
                    reelsSayisiArtir()
                    gifGoster {
                        val clipsTab = rootInActiveWindow?.findAccessibilityNodeInfosByViewId(
                            "com.instagram.android:id/clips_tab"
                        )
                        val tabSelected = clipsTab?.any { it.isSelected } == true
                        if (tabSelected) {
                            val feedTab = rootInActiveWindow?.findAccessibilityNodeInfosByViewId(
                                "com.instagram.android:id/feed_tab"
                            )
                            if (feedTab?.isNotEmpty() == true) {
                                feedTab[0].performAction(AccessibilityNodeInfo.ACTION_CLICK)
                            } else {
                                performGlobalAction(GLOBAL_ACTION_BACK)
                            }
                        } else {
                            performGlobalAction(GLOBAL_ACTION_BACK)
                        }
                        engelleniyor = false
                    }
                }
            }
            "com.google.android.youtube" -> {
                if (shortsEngelleniyor && shortsAcikMi(rootNode)) {
                    engelleniyor = true
                    shortsSayisiArtir()
                    gifGoster {
                        performGlobalAction(GLOBAL_ACTION_BACK)
                        engelleniyor = false
                    }
                }
            }
        }
    }

    private fun reelsSayisiArtir() {
        val prefs = getSharedPreferences("BlockPrefs", Context.MODE_PRIVATE)
        val current = prefs.getInt("reels_count", 0)
        prefs.edit().putInt("reels_count", current + 1).apply()
    }

    private fun shortsSayisiArtir() {
        val prefs = getSharedPreferences("BlockPrefs", Context.MODE_PRIVATE)
        val current = prefs.getInt("shorts_count", 0)
        prefs.edit().putInt("shorts_count", current + 1).apply()
    }

    private fun gifGoster(sonra: () -> Unit) {
        handler.post {
            val params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
                PixelFormat.TRANSLUCENT
            )
            params.gravity = Gravity.CENTER

            val imageView = ImageView(this)
            imageView.scaleType = ImageView.ScaleType.FIT_CENTER
            imageView.setBackgroundColor(android.graphics.Color.BLACK)

            Glide.with(this)
                .asGif()
                .load(R.raw.engel)
                .into(imageView)

            windowManager?.addView(imageView, params)

            handler.postDelayed({
                try {
                    windowManager?.removeView(imageView)
                } catch (e: Exception) {}
                sonra()
            }, 2000)
        }
    }

    private fun reelsAcikMi(node: AccessibilityNodeInfo): Boolean {
        val videoContainer = node.findAccessibilityNodeInfosByViewId(
            "com.instagram.android:id/clips_video_container"
        )
        if (videoContainer.isEmpty()) return false

        val clipsTab = node.findAccessibilityNodeInfosByViewId(
            "com.instagram.android:id/clips_tab"
        )
        val altMenudenAcildi = clipsTab.any { it.isSelected }

        val dmdenAcildi = node.findAccessibilityNodeInfosByViewId(
            "com.instagram.android:id/reply_bar_container_scroll_view"
        ).isNotEmpty()

        val kesfettenAcildi = node.findAccessibilityNodeInfosByViewId(
            "com.instagram.android:id/clips_viewer_action_bar_title"
        ).isNotEmpty()

        return altMenudenAcildi || dmdenAcildi || kesfettenAcildi
    }

    private fun shortsAcikMi(node: AccessibilityNodeInfo): Boolean {
        return node.findAccessibilityNodeInfosByViewId(
            "com.google.android.youtube:id/reel_player_page_container"
        ).isNotEmpty()
    }

    override fun onInterrupt() {}

    companion object {
        private const val PREFS = "BlockPrefs"
        private const val KEY_ACTIVE = "engel_aktif"
        private const val KEY_REELS = "reels_engelli"
        private const val KEY_SHORTS = "shorts_engelli"

        // RAM cache; asıl kaynak SharedPreferences. Process ölüp servis yeniden
        // bağlandığında onServiceConnected bunları diskten tekrar yükler.
        @Volatile var isActive = false
        @Volatile var reelsEngelleniyor = true
        @Volatile var shortsEngelleniyor = true

        fun durumYukle(context: Context) {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            isActive = prefs.getBoolean(KEY_ACTIVE, false)
            reelsEngelleniyor = prefs.getBoolean(KEY_REELS, true)
            shortsEngelleniyor = prefs.getBoolean(KEY_SHORTS, true)
        }

        fun durumKaydet(context: Context, aktif: Boolean, reels: Boolean, shorts: Boolean) {
            isActive = aktif
            reelsEngelleniyor = reels
            shortsEngelleniyor = shorts
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putBoolean(KEY_ACTIVE, aktif)
                .putBoolean(KEY_REELS, reels)
                .putBoolean(KEY_SHORTS, shorts)
                .apply()
        }
    }
}