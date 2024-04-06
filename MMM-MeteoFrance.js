/*
 * Module: MMM-MeteoFrance
 * from MMM-DarkSkyForecast (Jeff Clarke)
 * from MMM-Weather (bugsounet)
 * recoded for MeteoFrance
 *
 * @bugsounet
 * MIT Licensed.
 */

Module.register("MMM-MeteoFrance", {

  requiresVersion: "2.27.0",
  defaults: {
    debug: false,
    updateInterval: 10 * 60 * 1000,
    updateFadeSpeed: 1000,
    rotateInterval: 30 * 1000,
    place: "Paris",
    display: {
      HeaderPlaceName: false,
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
      Beaufort: true
    },
    personalize: {
      hourlyForecastInterval: 3,
      maxHourliesToShow: 3,
      maxDailiesToShow: 3,
      forecastLayout: "table",
      forecastHeaderText: ""
    }
  },

  start: function() {
    console.log("[METEOFRANCE] Starting...")
    if (this.config.debug) this.log = (...args) => { console.log("[METEOFRANCE]", ...args) }
    else this.log = (...args) => { /* do nothing */ }
    this.error = null
    this.weatherData = null
    this.formattedWeatherData = null
    this.last_update = null
    this.weathers = []
    this.first = true
    this.place = 0
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
        rain: this.file("resources/i-rain.svg"),
        wind: this.file("resources/i-wind.svg"),
        uv: this.file("resources/uv.png")
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
        this.weathers = payload
        if (this.first) {
          this.displayWeather(0)
          this.first = false
          if (this.weathers.length > 1) this.displayWeatherRotate()
        }
        else if (this.weathers.length === 1) this.displayWeather(0)
        break
      case "ERROR":
        if (typeof payload === "object") {
          if (payload.code === "EAI_AGAIN") this.error = "Connection lost..."
          else this.error= payload.code
        }
        else this.error = payload
        console.error("[WEATHER] **ERROR**", this.error)
        this.updateDom(this.config.updateFadeSpeed)
        break
    }
  },

  displayWeather: function(place, force) {
    if (this.last_update === this.weathers[place].last_update && !force) return
    this.place = place
    this.last_update = this.weathers[place].last_update
    this.weatherData = this.weathers[place]
    if (this.config.display.HeaderPlaceName || this.weathers.length > 1) this.data.header = this.weatherData.properties.name
    this.error = null
    this.log("data:", this.weatherData)

    //process weather data
    this.formattedWeatherData = this.processWeatherData()
    this.updateDom(this.config.updateFadeSpeed)
  },

  displayWeatherRotate: function () {
    this.rotote = setInterval(() => {
      this.displayWeather(this.place,true)
      this.place++
      if (this.place > this.weathers.length-1) this.place = 0
    }, this.config.rotateInterval)
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
      for (var i = 1; i <= this.config.personalize.maxDailiesToShow; i++) {
        if (this.weatherData.forecast[i] == null) {
          break;
        }
        const date = this.searchDate(i)
        //console.log("-->", date, this.weatherData.forecast[i].time)
        const dayForecast = this.weatherData.forecast.find((forecast) => forecast.time === date)
        //console.log(dayForecast)
        const dayHours = this.searchDate(i, true)
        //console.log("dayHours ----->", dayHours)
        const tempRange = this.getTempMinMax(dayHours)
        dayForecast.temp = tempRange
        //console.log("dayForecast", dayForecast)
        dailies.push(this.forecastItemFactory(dayForecast, "daily"))
      }

    }
  
    return {
      "currently" : {
        temperature: this.weatherData.nowcast.temperature + "°",
        iconPath: this.weatherData.nowcast.weather_icon,
        background: this.weatherData.nowcast.weather_background,
        tempRange: this.formatHiLowTemperature(this.weatherData.daily_forecast.T_max, this.weatherData.daily_forecast.T_min),
        precipitation: this.formatPrecipitation(this.weatherData.daily_forecast.total_precipitation_24h),
        wind: this.formatWind(this.weatherData.nowcast.wind_speed, this.weatherData.nowcast.wind_speed_gust, this.weatherData.nowcast.wind_icon),
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

  getTempMinMax(hours) {
    var ArrayOfTemp = []
    tempRange= {}
    for (var i = 1; i < hours.length; i++) {
      var Temperature = this.weatherData.forecast.find((forecast) => forecast.time === hours[i])
      if (Temperature) ArrayOfTemp.push(Temperature.temperature)
    }

    tempRange.min = Math.min(...ArrayOfTemp)
    tempRange.max = Math.max(...ArrayOfTemp)
    //console.log("tempRange", tempRange)
    return tempRange
  },

  searchDate(days,array) {
    const now = new Date(Date.now())
    const day = now.getDate()
    const month = now.getMonth()
    const year = now.getFullYear()

    const now14 = new Date(year,month,day,14,0,0)
    const result14 = new Date(now14.setDate(now14.getDate() + days))
    if (array) {
      const now2 = new Date(year,month,day,2,0,0)
      const now5 = new Date(year,month,day,5,0,0)
      const now8 = new Date(year,month,day,8,0,0)
      const now11 = new Date(year,month,day,11,0,0)
      const now17 = new Date(year,month,day,17,0,0)
      const now20 = new Date(year,month,day,20,0,0)
      const now23 = new Date(year,month,day,23,0,0)

      const result2 = new Date(now2.setDate(now2.getDate() + days))
      const result5 = new Date(now5.setDate(now5.getDate() + days))
      const result8 = new Date(now8.setDate(now8.getDate() + days))
      const result11 = new Date(now11.setDate(now11.getDate() + days))
      const result17 = new Date(now17.setDate(now17.getDate() + days))
      const result20 = new Date(now20.setDate(now20.getDate() + days))
      const result23 = new Date(now23.setDate(now23.getDate() + days))
      return [
        result2.toJSON(),
        result5.toJSON(),
        result8.toJSON(),
        result11.toJSON(),
        result14.toJSON(),
        result17.toJSON(),
        result20.toJSON(),
        result23.toJSON()
      ]
    } else {
      return result14.toJSON();
    }
  },

  /*
    Hourly and Daily forecast items are very similar.  So one routine builds the data
    objects for both.
   */
  forecastItemFactory: function(fData, type) {
    var fItem = new Object();

    //console.log("--->fData", fData)

    // --------- Date / Time Display ---------
    if (type == "daily") {
      //day name (e.g.: "MON")
      fItem.day = moment(fData.time).format("ddd")
    } else { //hourly
      //time (e.g.: "5 PM")
      fItem.time = moment(fData.time).format("kk[h]");
    }

    // --------- Icon ---------
    fItem.iconPath = fData.weather_icon

    // --------- Temperature ---------

    if (type == "hourly") { //just display projected temperature for that hour
      fItem.temperature = Math.round(fData.temperature) + "°";
    } else { //display High / Low temperatures
      fItem.tempRange = this.formatHiLowTemperature(fData.temp.max,fData.temp.min);
    }

    // --------- Wind ---------
    fItem.wind = this.formatWind(fData.wind_speed, 0, fData.wind_icon);

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
      high: Math.round(h) + "°",
      low: Math.round(l) + "°"
    };
  },

  /*
    Returns a formatted data object for precipitation
   */
  formatPrecipitation: function(precipitation) {
    return {
      accumulation: precipitation ?  precipitation + " mm" : "0 mm"
    };

  },

  /*
    Returns a formatted data object for wind conditions
   */
  formatWind: function(speed, gust, icon) {
    var Beaufort = this.kmh2Beaufort(speed)

    return {
      windSpeed: Math.round(speed) + " km/h",
      windSpeedGust: gust ? Math.round(speed+gust) + " km/h" : 0,
      windIcon: icon,
      Beaufort: "Beaufort"+Beaufort
    };
  },

  kmh2Beaufort: function (speed) {
    if (!this.config.display.Beaufort) return 0
    var kmh = Math.round(speed)
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