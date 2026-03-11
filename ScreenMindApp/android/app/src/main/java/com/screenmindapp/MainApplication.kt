package com.screenmindapp

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative

// ✅ Isolation native modules
import com.screenmindapp.isolation.UsageStatsPackage as IsolationUsageStatsPackage
import com.screenmindapp.isolation.ServiceStarterPackage
import com.screenmindapp.isolation.IsolationMetricsPackage
import com.screenmindapp.isolation.BehaviourMetricsPackage
import com.screenmindapp.isolation.CommunicationStatsPackage
import com.screenmindapp.isolation.WifiMetricsPackage

// ✅ Sleep native modules
import com.screenmindapp.sleep.SleepEventPackage
import com.screenmindapp.sleep.SettingsAccessPackage

// ✅ Social Media native modules
import com.screenmindapp.socialmedia.DeviceControlPackage
import com.screenmindapp.socialmedia.OverlayPackage

// ✅ Screen Usage native module
import com.screenmindapp.screenUsage.UsageStatsPackage as ScreenUsageUsageStatsPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {

          // ✅ Isolation packages
          add(IsolationUsageStatsPackage())
          add(ServiceStarterPackage())
          add(IsolationMetricsPackage())
          add(BehaviourMetricsPackage())
          add(CommunicationStatsPackage())
          add(WifiMetricsPackage())

          // ✅ Sleep packages
          add(SleepEventPackage())
          add(SettingsAccessPackage())

          // ✅ Social Media packages
          add(DeviceControlPackage())
          add(OverlayPackage())

          // ✅ Screen Usage package
          add(ScreenUsageUsageStatsPackage())

        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}