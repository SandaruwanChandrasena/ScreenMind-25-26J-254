package com.screenmindapp

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative

// ✅ ADD THIS IMPORT (YOU NEED TO EDIT THIS)
import com.screenmindapp.isolation.UsageStatsPackage
import com.screenmindapp.isolation.ServiceStarterPackage
import com.screenmindapp.isolation.IsolationMetricsPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {

          // ✅ ADD THIS LINE (YOU NEED TO EDIT THIS)
          add(UsageStatsPackage())
          add(ServiceStarterPackage())
          add(IsolationMetricsPackage())

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
