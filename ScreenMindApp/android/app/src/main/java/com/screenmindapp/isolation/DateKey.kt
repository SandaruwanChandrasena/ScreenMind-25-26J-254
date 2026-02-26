package com.screenmindapp.isolation

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object DateKey {
  fun today(): String {
    val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    return sdf.format(Date())
  }
}
