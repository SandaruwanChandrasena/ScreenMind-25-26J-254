package com.screenmindapp

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative

// ✅ Manual packages
import com.screenmindapp.isolation.UsageStatsPackage
import com.screenmindapp.isolation.ServiceStarterPackage
import com.screenmindapp.isolation.IsolationMetricsPackage
import com.screenmindapp.isolation.BehaviourMetricsPackage   // ✅ NEW
import com.screenmindapp.isolation.CommunicationStatsPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {

          // ✅ Add your manual packages here
          add(UsageStatsPackage())
          add(ServiceStarterPackage())
          add(IsolationMetricsPackage())
          add(BehaviourMetricsPackage()) // ✅ NEW
          add(CommunicationStatsPackage())

          // Packages that cannot be autolinked yet can be added manually here
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
