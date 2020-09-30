/* Magic Mirror
 * Module: MMM-Weather
 * from MMM-DarkSkyForecast (Jeff Clarke)
 * recoded for OpenWeatherMap
 *
 * @bugsounet
 * MIT Licensed.
 */

Module.register("MMM-Weather", {

  requiresVersion: "2.13.0",
  defaults: {
    debug: true,
    updateInterval: "15m", // 15 minutes
    updateFadeSpeed: 500,
    api: {
      key: "",
      latitude: "",
      longitude: "",
      units: "metric", //Units of measurement. standard, metric and imperial units are available. If you do not use the units parameter, standard units will be applied by default
      language: config.language
    },
    display: {
      CurrentConditions: true,
      ExtraCurrentConditions: true,
      Summary: true,
      ForecastTableColumnHeaderIcons: true,
      HourlyForecast: true,
      DailyForecast: true,
      Precipitation: true,
      Wind: true,
      InlineIcons: true
    },
    personalize: {
      hourlyForecastInterval: 3,
      maxHourliesToShow: 3,
      maxDailiesToShow: 3,
      concise: false,
      colored : true,
      forecastLayout: "table", //"tiled",
      forecastHeaderText: ""
    },
    labels: {
      maximum: "max",
      high: "H",
      low: "L",
      timeFormat: "h a",
      days: ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"],
      ordinals: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    }
  },

  start: function() {
    console.log("[WEATHER] Starting...")
    if (this.config.debug) this.log = (...args) => { console.log("[WEATHER]", ...args) }
    else this.log = (...args) => { /* do nothing */ }
    this.error = null
    this.weatherData = null
    this.formattedWeatherData = null
  },

  getScripts: function() {
    return ["moment.js"]
  },

  getStyles: function () {
    return ["MMM-Weather.css"]
  },

  getTemplate: function () {
    return "MMM-Weather.njk"
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
        wind: this.file("icons/i-wind.svg")
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
        this.error = payload
        console.error("[WEATHER] **ERROR**", payload)
        this.updateDom(this.config.updateFadeSpeed)
    }
  },

  /*
    This prepares the data to be used by the Nunjucks template.  The template does not do any logic other
    if statements to determine if a certain section should be displayed, and a simple loop to go through
    the houly / daily forecast items.
  */
  processWeatherData: function() {

    var summary = this.weatherData.current.weather[0].description + "."

    var hourlies = []
    if (this.config.display.HourlyForecast) {
      var displayCounter = 0
      var currentIndex = this.config.personalize.hourlyForecastInterval
      while (displayCounter < this.config.personalize.maxHourliesToShow) {
        if (this.weatherData.hourly[currentIndex] == null) {
          break
        }
        hourlies.push(this.forecastItemFactory(this.weatherData.hourly[currentIndex], "hourly"))
        currentIndex += this.config.personalize.hourlyForecastInterval
        displayCounter++
      }
    }

    var dailies = [];
    if (this.config.display.DailyForecast) {
      for (var i = 1; i <= this.config.personalize.maxDailiesToShow; i++) {
        if (this.weatherData.daily[i] == null) {
          break;
        }
        dailies.push(this.forecastItemFactory(this.weatherData.daily[i], "daily"))
      }
    }

    return {
      "currently" : {
        temperature: Math.round(this.weatherData.current.temp) + "°",
        iconPath: "http://openweathermap.org/img/wn/" + this.weatherData.current.weather[0].icon + "@2x.png",
        tempRange: this.formatHiLowTemperature(this.weatherData.daily[0].temp.max, this.weatherData.daily[0].temp.min),
        precipitation: this.formatPrecipitation(this.weatherData.daily[0].pop, this.weatherData.daily[0].rain),
        wind: this.formatWind(this.weatherData.hourly[0].wind_speed, this.weatherData.current.wind_deg, this.weatherData.current.wind_gust)
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

    // --------- Date / Time Display ---------
    if (type == "daily") {
      //day name (e.g.: "MON")
      fItem.day = this.config.labels.days[moment(fData.dt * 1000).format("d")];
    } else { //hourly
      //time (e.g.: "5 PM")
      fItem.time = moment(fData.dt * 1000).format(this.config.labels.timeFormat);
    }

    // --------- Icon ---------
    fItem.iconPath = "http://openweathermap.org/img/wn/" + fData.weather[0].icon + "@2x.png"

    // --------- Temperature ---------

    if (type == "hourly") { //just display projected temperature for that hour
      fItem.temperature = Math.round(fData.temp) + "°";
    } else { //display High / Low temperatures
      fItem.tempRange = this.formatHiLowTemperature(fData.temp.max,fData.temp.min);
    }

    // --------- Precipitation ---------
    fItem.precipitation = this.formatPrecipitation(fData.pop,fData.rain);

    // --------- Wind ---------
    fItem.wind = (this.formatWind(fData.wind_speed, fData.wind_deg, fData.wind_gust));

    return fItem;
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
  formatPrecipitation: function(pop, precipitation) {
    return {
      pop: pop ? (pop*100).toFixed(0) + "%": "0%",
      accumulation: precipitation ? "(" + precipitation + " " + this.getUnit("accumulationRain") + ")" : ""
    };

  },

  /*
    Returns a formatted data object for wind conditions
   */
  formatWind: function(speed, bearing, gust) {
    //wind gust
    var windGust = null;
    if (!this.config.personalize.concise && gust) {
      windGust = " (" + this.config.labels.maximum + " " + Math.round(gust) + " " + this.getUnit("windSpeed") + ")";
    }
    if (this.config.api.units == "metric") speed = speed * 3,6

    return {
      windSpeed: Math.round(speed) + " " + this.getUnit("windSpeed") + (!this.config.personalize.concise ? " " + this.getOrdinal(bearing) : ""),
      windGust: windGust
    };
  },

  /*
    Returns the units in use for the data pull
   */
  getUnit: function(metric) {
    return this.units[metric][this.config.api.units];
  },

  /*
    Formats the wind direction into common ordinals (e.g.: NE, WSW, etc.)
    Wind direction is provided in degress from North in the data feed.
   */
  getOrdinal: function(bearing) {
    return this.config.labels.ordinals[Math.round(bearing * 16 / 360) % 16];
  },

  /*
    Some display items need the unti beside them.  This returns the correct
    unit for the given metric based on the unit set in use.
    * standard, metric and imperial
   */
  units: {
    accumulationRain: {
      standard: "mm/h",
      metric: "mm/h",
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
  }
});
