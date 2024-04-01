/* Magic Mirror
 * Module: MMM-Weather
 * from MMM-DarkSkyForecast (Jeff Clarke)
 * recoded for OpenWeatherMap
 *
 * @bugsounet
 * MIT Licensed.
 */

Module.register("MMM-MeteoFrance", {

  requiresVersion: "2.27.0",
  defaults: {
    debug: false,
    updateInterval: 5 * 60 * 1000,
    updateFadeSpeed: 500,
    place: "Paris",
    display: {
      CurrentConditions: true,
      ExtraCurrentConditions: true,
      Summary: true,
      ForecastTableColumnHeaderIcons: true,
      HourlyForecast: true,
      DailyForecast: true,
      Precipitation: true,
      Wind: true,
      InlineIcons: true,
      Feels: true,
      SunCondition: true,
      Humidity: true,
      UV: true,
      Beaufort: false
    },
    personalize: {
      hourlyForecastInterval: 3,
      maxHourliesToShow: 3,
      maxDailiesToShow: 3,
      concise: false,
      colored : true,
      forecastLayout: "table",
      forecastHeaderText: ""
    },
    labels: {
      high: "Max:",
      low: "Min:",
      timeFormat: "kk[h]",
    }
  },

  start: function() {
    console.log("[METEOFRANCE] Starting...")
    if (this.config.debug) this.log = (...args) => { console.log("[METEOFRANCE]", ...args) }
    else this.log = (...args) => { /* do nothing */ }
    this.error = null
    this.weatherData = null
    this.formattedWeatherData = null
  },

  getScripts: function() {
    return ["moment.js"]
  },

  getStyles: function () {
    return [
      "MMM-MeteoFrance.css",
      this.file("node_modules/weathericons/css/weather-icons.min.css")
    ]
  },

  getTemplate: function () {
    return "MMM-MeteoFrance.njk"
  },

  getTemplateData: function () {
    return {
      phrases: {
        loading: this.translate("LOADING"),
        error: this.error
      },
      loading: this.formattedWeatherData == null ? true : false,
      error: this.error ? true: false,
      config: this.config,
      forecast: this.formattedWeatherData,
      inlineIcons : {
        rain: this.file("icons/i-rain.svg"),
        wind: this.file("icons/i-wind.svg"),
        uv: this.file("icons/uv.png")
      },
      update: this.weatherData && this.weatherData.update ? this.weatherData.update : this.translate("LOADING")
    }
  },

  notificationReceived: function(notification, payload) {
    switch (notification) {
      case "ALL_MODULES_STARTED":
        this.sendSocketNotification('SET_CONFIG', this.config)
        break
    }
  },

  socketNotificationReceived: function(notification, payload) {
    switch (notification) {
      case "DATA_UPDATE":
        this.weatherData = payload
        this.error = null
        this.log("data:", this.weatherData)

        //process weather data
        this.formattedWeatherData = this.processWeatherData()
        this.updateDom(this.config.updateFadeSpeed)
        break
      case "ERROR":
        if (typeof payload == "object") {
          if (payload.code = "EAI_AGAIN") this.error = "Connection lost..."
          else this.error= payload.code
        }
        else this.error = payload
        console.error("[WEATHER] **ERROR**", this.error)
        this.updateDom(this.config.updateFadeSpeed)
        break
    }
  },

  /*
    This prepares the data to be used by the Nunjucks template.  The template does not do any logic other
    if statements to determine if a certain section should be displayed, and a simple loop to go through
    the houly / daily forecast items.
  */
  processWeatherData: function() {

    var summary = this.weatherData.nowcast.weather_description + "."

    var hourlies = []
    
    if (this.config.display.HourlyForecast) {
      var displayCounter = 0
      var currentIndex = this.config.personalize.hourlyForecastInterval
      while (displayCounter < this.config.personalize.maxHourliesToShow) {
        if (this.weatherData.forecast[currentIndex] == null) {
          break
        }
        hourlies.push(this.forecastItemFactory(this.weatherData.forecast[currentIndex], "hourly"))
        currentIndex += this.config.personalize.hourlyForecastInterval
        displayCounter++
      }
    }
    
    var dailies = [];
    
    if (this.config.display.DailyForecast) {
      /*
      for (var i = 1; i <= this.config.personalize.maxDailiesToShow; i++) {
        if (this.weatherData.daily[i] == null) {
          break;
        }
        //dailies.push(this.forecastItemFactory(this.weatherData.daily[i], "daily"))
      }
      */
      for (var i = 0 ; i < this.weatherData.forecast.length; i++) {
        var time = this.weatherData.forecast[i].time
        var test = moment(time).format(this.config.labels.timeFormat);
        console.log(time,test)
      }
    }
  
    return {
      "currently" : {
        temperature: this.weatherData.nowcast.temperature + "°",
        iconPath: this.weatherData.nowcast.weather_icon,
        tempRange: this.formatHiLowTemperature(this.weatherData.daily_forecast.T_max, this.weatherData.daily_forecast.T_min),
        precipitation: this.formatPrecipitation(this.weatherData.daily_forecast.total_precipitation_24h),
        wind: this.formatWind(this.weatherData.nowcast.wind_speed, this.weatherData.nowcast.wind_icon),
        feels: this.formatFeels(this.weatherData.nowcast.felt_temperature),
        sun: this.formatSun(this.weatherData.daily_forecast.sunrise_time, this.weatherData.daily_forecast.sunset_time),
        humidity: this.weatherData.nowcast.relative_humidity + "%",
        uv: Math.round(this.weatherData.daily_forecast.uv_index)
      },
      "summary" : summary,
      "hourly" : hourlies,
      "daily" : dailies,
    }
  },


  /*
    Hourly and Daily forecast items are very similar.  So one routine builds the data
    objects for both.
   */
  forecastItemFactory: function(fData, type) {
    var fItem = new Object();

    console.log("--->fData", fData)

    // --------- Date / Time Display ---------
    if (type == "daily") {
      //day name (e.g.: "MON")
      fItem.day = moment(fData.dt * 1000).format("ddd")
    } else { //hourly
      //time (e.g.: "5 PM")
      fItem.time = moment(fData.time).format(this.config.labels.timeFormat);
    }

    // --------- Icon ---------
    fItem.iconPath = fData.weather_icon

    // --------- Temperature ---------

    if (type == "hourly") { //just display projected temperature for that hour
      fItem.temperature = Math.round(fData.temperature) + "°";
    } else { //display High / Low temperatures
      fItem.tempRange = this.formatHiLowTemperature(fData.temp.max,fData.temp.min);
    }

    // --------- Precipitation ---------
    fItem.precipitation = this.formatPrecipitation(fData.rain["1h"]);

    // --------- Wind ---------
    fItem.wind = this.formatWind(fData.wind_speed, fData.wind_icon);

    return fItem;
  },

  formatFeels: function(feels) {
    return this.translate("FEELS", { DEGREE: Math.round(feels) + "°" })
  },

  formatSun: function(Sunrise,Sunset) {
    var now = new Date();
    var sunrise = new Date(Sunrise);
    var sunset = new Date(Sunset);

    var sunDate = sunrise < now && sunset > now ? sunset : sunrise;
    var timeString = config.timeFormat == 24 ? moment(sunDate).format("HH:mm") : moment(sunDate).format("h:mm A")

    return {
      time: timeString,
      icon: sunrise < now && sunset > now ? "wi-sunset" : "wi-sunrise"
    }
  },

  /*
    Returns a formatted data object for High / Low temperature range
   */
  formatHiLowTemperature: function(h,l) {
    return {
      high: (!this.config.personalize.concise ? this.config.labels.high + " " : "") + Math.round(h) + "°",
      low: (!this.config.personalize.concise ? this.config.labels.low + " " : "") + Math.round(l) + "°"
    };
  },

  /*
    Returns a formatted data object for precipitation
   */
  formatPrecipitation: function(precipitation) {
    return {
      accumulation: precipitation ?  precipitation + " " + this.getUnit("accumulationRain")  : "0 " +  this.getUnit("accumulationRain")
    };

  },

  /*
    Returns a formatted data object for wind conditions
   */
  formatWind: function(speed, icon) {
    var Beaufort = this.ms2Beaufort(speed)

    return {
      windSpeed: Math.round(speed) + " km/h",
      windIcon: icon
    };
  },

  /*
    Returns the units in use for the data pull
   */
  getUnit: function(metric) {
    return this.units[metric]["metric"]
  },

  /*
    Some display items need the unti beside them.  This returns the correct
    unit for the given metric based on the unit set in use.
    * standard, metric and imperial
   */
  units: {
    accumulationRain: {
      standard: "mm/h",
      metric: "mm",
      imperial: "in/h",
    },
    accumulationSnow: {
      standard: "mm/h",
      metric: "mm/h",
      imperial: "in/h",
    },
    windSpeed: {
      standard: "m/s",
      metric: "km/h",
      imperial: "mph"
    }
  },

  ms2Beaufort: function (ms) {
    if (!this.config.display.Beaufort) return 0
    var kmh = Math.round((ms * 60 * 60) / 1000)
    var speeds = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117, 1000]
    for (var beaufort in speeds) {
      var speed = speeds[beaufort]
      if (speed > kmh) {
        return beaufort
      }
    }
    return 12
  }
});
