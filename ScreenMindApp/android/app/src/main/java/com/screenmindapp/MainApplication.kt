package com.screenmindapp

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative

// ✅ Manual packages (Isolation native modules)
import com.screenmindapp.isolation.UsageStatsPackage
import com.screenmindapp.isolation.ServiceStarterPackage
import com.screenmindapp.isolation.IsolationMetricsPackage
import com.screenmindapp.isolation.BehaviourMetricsPackage
import com.screenmindapp.isolation.CommunicationStatsPackage
import com.screenmindapp.sleep.SleepEventPackage

// ✅ Social Media native modules
import com.screenmindapp.socialmedia.DeviceControlPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {

          // ✅ Register Isolation native packages
          add(UsageStatsPackage())
          add(ServiceStarterPackage())
          add(IsolationMetricsPackage())
          add(BehaviourMetricsPackage())
          add(CommunicationStatsPackage())
          add(SleepEventPackage())

          // ✅ Social Media native packages
          add(DeviceControlPackage())

        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}