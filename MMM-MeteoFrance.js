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
    rotateInterval: 30 * 1000,
    place: "Paris",
    display: {
      HeaderPlaceName: false,
      CurrentConditions: true,
      Background: true,
      ExtraCurrentConditions: true,
      Summary: true,
      HourlyForecast: true,
      DailyForecast: true,
      Precipitation: true,
      Wind: true,
      Feels: true,
      SunCondition: true,
      Humidity: true,
      UV: true
    },
    personalize: {
      hourlyForecastInterval: 3,
      maxHourliesToShow: 3,
      maxDailiesToShow: 3
    }
  },

  start () {
    console.log("[MeteoFrance] Starting...");
    if (this.config.debug) this.log = (...args) => { console.log("[MeteoFrance]", ...args); };
    else this.log = (...args) => { /* do nothing */ };
    this.error = null;
    this.weatherData = null;
    this.formattedWeatherData = null;
    this.last_update = null;
    this.weathers = [];
    this.first = true;
    this.place = 0;
    /* define rotateInterval limit */
    if (this.config.rotateInterval < 15000) {
      console.warn("[MeteoFrance] rotateInterval to low... correct to 15000 (15 secs)");
      this.config.updateInterval = 15000;
    }
    if (this.config.updateInterval > 900000) {
      console.warn("[MeteoFrance] updateInterval to high... correct to 900000 (15 mins)");
      this.config.updateInterval = 900000;
    }
  },

  getScripts () {
    return ["moment.js"];
  },

  getStyles () {
    return [
      "MMM-MeteoFrance.css",
      this.file("node_modules/weathericons/css/weather-icons.min.css")
    ];
  },

  getTemplate () {
    return "MMM-MeteoFrance.njk";
  },

  getTemplateData () {
    return {
      phrases: {
        loading: this.translate("LOADING"),
        error: this.error
      },
      loading: this.formattedWeatherData === null ? true : false,
      error: this.error ? true: false,
      config: this.config,
      forecast: this.formattedWeatherData,
      update: this.weatherData && this.weatherData.update ? this.weatherData.update : this.translate("LOADING")
    };
  },

  notificationReceived (notification, payload) {
    switch (notification) {
      case "ALL_MODULES_STARTED":
        this.sendSocketNotification("SET_CONFIG", this.config);
        break;
    }
  },

  socketNotificationReceived (notification, payload) {
    switch (notification) {
      case "DATA_UPDATE":
        this.weathers = payload;
        if (this.first) {
          this.displayWeather(0);
          this.first = false;
          if (this.weathers.length > 1) this.displayWeatherRotate();
        }
        else if (this.weathers.length === 1) this.displayWeather(0);
        break;
      case "ERROR":
        if (typeof payload === "object") {
          if (payload.code === "EAI_AGAIN") this.error = "Connection lost...";
          else this.error= payload.code;
        }
        else this.error = payload;
        console.error("[MeteoFrance] **ERROR**", this.error);
        this.updateDom(1000);
        break;
    }
  },

  displayWeather (place, force) {
    if (this.last_update === this.weathers[place].last_update && !force) return;
    this.place = place;
    this.last_update = this.weathers[place].last_update;
    this.weatherData = this.weathers[place];
    this.error = null;
    this.log("data:", this.weatherData);

    this.formattedWeatherData = this.processWeatherData();
    this.updateDom(1000);
  },

  displayWeatherRotate () {
    this.rotote = setInterval(() => {
      this.displayWeather(this.place,true);
      this.place++;
      if (this.place > this.weathers.length-1) this.place = 0;
    }, this.config.rotateInterval);
  },

  /*
    This prepares the data to be used by the Nunjucks template.  The template does not do any logic other
    if statements to determine if a certain section should be displayed, and a simple loop to go through
    the houly / daily forecast items.
  */
  processWeatherData () {
    var summary = `${this.weatherData.nowcast.weather_description}.`;
    var hourlies = [];
    var place = null;
    if (this.config.display.HeaderPlaceName || this.weathers.length > 1) {
      place = this.weatherData.properties.name;
    }

    if (this.config.display.HourlyForecast) {
      var displayCounter = 0;
      var currentIndex = this.config.personalize.hourlyForecastInterval;
      while (displayCounter < this.config.personalize.maxHourliesToShow) {
        if (this.weatherData.forecast[currentIndex] === null) {
          break;
        }
        hourlies.push(this.forecastItemFactory(this.weatherData.forecast[currentIndex], "hourly"));
        currentIndex += this.config.personalize.hourlyForecastInterval;
        displayCounter++;
      }
    }
    
    var dailies = [];
    
    if (this.config.display.DailyForecast) {
      for (var i = 1; i <= this.config.personalize.maxDailiesToShow; i++) {
        if (this.weatherData.forecast[i] === null) {
          break;
        }
        const date = this.searchDate(i);
        const dayForecast = this.weatherData.forecast.find((forecast) => forecast.time === date);
        const dayHours = this.searchDate(i, true);
        const tempRange = this.getTempMinMax(dayHours);
        dayForecast.temp = tempRange;
        dailies.push(this.forecastItemFactory(dayForecast, "daily"));
      }

    }
  
    return {
      place: place,
      currently : {
        temperature: `${this.weatherData.nowcast.temperature}°`,
        iconPath: this.weatherData.nowcast.weather_icon,
        background: this.weatherData.nowcast.weather_background,
        tempRange: this.formatHiLowTemperature(this.weatherData.daily_forecast.T_max, this.weatherData.daily_forecast.T_min),
        precipitation: this.formatPrecipitation(this.weatherData.daily_forecast.total_precipitation_24h),
        wind: this.formatWind(this.weatherData.nowcast.wind_speed, this.weatherData.nowcast.wind_speed_gust, this.weatherData.nowcast.wind_icon),
        feels: this.formatFeels(this.weatherData.nowcast.felt_temperature),
        sun: this.formatSun(this.weatherData.daily_forecast.sunrise_time, this.weatherData.daily_forecast.sunset_time),
        humidity: `${this.weatherData.nowcast.relative_humidity}%`,
        uv: Math.round(this.weatherData.daily_forecast.uv_index)
      },
      summary : summary,
      hourly : hourlies,
      daily : dailies
    };
  },

  getTempMinMax (hours) {
    var ArrayOfTemp = [];
    tempRange= {};
    for (var i = 1; i < hours.length; i++) {
      var Temperature = this.weatherData.forecast.find((forecast) => forecast.time === hours[i]);
      if (Temperature) ArrayOfTemp.push(Temperature.temperature);
    }

    tempRange.min = Math.min(...ArrayOfTemp);
    tempRange.max = Math.max(...ArrayOfTemp);
    return tempRange;
  },

  searchDate (days,array) {
    const now = new Date(Date.now());
    const day = now.getDate();
    const month = now.getMonth();
    const year = now.getFullYear();

    const now14 = new Date(year,month,day,14,0,0);
    const result14 = new Date(now14.setDate(now14.getDate() + days));
    if (array) {
      const now2 = new Date(year,month,day,2,0,0);
      const now5 = new Date(year,month,day,5,0,0);
      const now8 = new Date(year,month,day,8,0,0);
      const now11 = new Date(year,month,day,11,0,0);
      const now17 = new Date(year,month,day,17,0,0);
      const now20 = new Date(year,month,day,20,0,0);
      const now23 = new Date(year,month,day,23,0,0);

      const result2 = new Date(now2.setDate(now2.getDate() + days));
      const result5 = new Date(now5.setDate(now5.getDate() + days));
      const result8 = new Date(now8.setDate(now8.getDate() + days));
      const result11 = new Date(now11.setDate(now11.getDate() + days));
      const result17 = new Date(now17.setDate(now17.getDate() + days));
      const result20 = new Date(now20.setDate(now20.getDate() + days));
      const result23 = new Date(now23.setDate(now23.getDate() + days));
      return [
        result2.toJSON(),
        result5.toJSON(),
        result8.toJSON(),
        result11.toJSON(),
        result14.toJSON(),
        result17.toJSON(),
        result20.toJSON(),
        result23.toJSON()
      ];
    } else {
      return result14.toJSON();
    }
  },

  /*
    Hourly and Daily forecast items are very similar.  So one routine builds the data
    objects for both.
   */
  forecastItemFactory (fData, type) {
    var fItem = new Object();

    // --------- Date / Time Display ---------
    if (type === "daily") {
      //day name (e.g.: "lun.")
      fItem.day = moment(fData.time).locale("fr").format("ddd");
    } else { //hourly
      //time (e.g.: "12h")
      //fItem.time = moment(fData.time).format("k[h]");
      //time (e.g: "2")
      fItem.time = moment(fData.time).locale("fr").format("h");
    }

    // --------- Icon ---------
    fItem.iconPath = fData.weather_icon;

    // --------- Temperature ---------

    if (type === "hourly") { //just display projected temperature for that hour
      fItem.temperature = `${Math.round(fData.temperature)}°`;
    } else { //display High / Low temperatures
      fItem.tempRange = this.formatHiLowTemperature(fData.temp.max,fData.temp.min);
    }

    // --------- Wind ---------
    fItem.wind = this.formatWind(fData.wind_speed, 0, fData.wind_icon);

    return fItem;
  },

  formatFeels (feels) {
    return this.translate("FEELS", { DEGREE: `${Math.round(feels)}°` });
  },

  formatSun (Sunrise,Sunset) {
    var now = new Date();
    var sunrise = new Date(Sunrise);
    var sunset = new Date(Sunset);

    var sunDate = sunrise < now && sunset > now ? sunset : sunrise;
    var timeString = config.timeFormat === 24 ? moment(sunDate).locale("fr").format("HH:mm") : moment(sunDate).locale("fr").format("h:mm A");

    return {
      time: timeString,
      icon: sunrise < now && sunset > now ? "wi-sunset" : "wi-sunrise"
    };
  },

  /*
    Returns a formatted data object for High / Low temperature range
   */
  formatHiLowTemperature (h,l) {
    return {
      high: `${Math.round(h)}°`,
      low: `${Math.round(l)}°`
    };
  },

  /*
    Returns a formatted data object for precipitation
   */
  formatPrecipitation (precipitation) {
    return {
      accumulation: precipitation ?  `${precipitation} mm` : "0 mm"
    };

  },

  /*
    Returns a formatted data object for wind conditions
   */
  formatWind (speed, gust, icon) {
    var Beaufort = this.kmh2Beaufort(speed);

    return {
      windSpeed: `${Math.round(speed)} km/h`,
      windSpeedGust: gust ? `${Math.round(speed+gust)} km/h` : 0,
      windIcon: icon,
      Beaufort: Beaufort
    };
  },

  kmh2Beaufort (speed) {
    var kmh = Math.round(speed);
    var beaufort = 0;
    if (kmh >= 1 && kmh <= 5) beaufort = 1;
    else if (kmh >= 6 && kmh <= 11) beaufort = 2;
    else if (kmh >= 12 && kmh <= 19) beaufort = 3;
    else if (kmh >= 20 && kmh <= 28) beaufort = 4;
    else if (kmh >= 29 && kmh <= 38) beaufort = 5;
    else if (kmh >= 39 && kmh <= 49) beaufort = 6;
    else if (kmh >= 50 && kmh <= 61) beaufort = 7;
    else if (kmh >= 62 && kmh <= 74) beaufort = 8;
    else if (kmh >= 75 && kmh <= 88) beaufort = 9;
    else if (kmh >= 89 && kmh <= 102) beaufort = 10;
    else if (kmh >= 103 && kmh <= 117) beaufort = 11;
    else if (kmh >= 118) beaufort = 12;
    return beaufort;
  }
});
