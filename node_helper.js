/* Magic Mirror
 * Module: MMM-Weather
 * from MMM-DarkSkyForecast (Jeff Clarke)
 * recoded for OpenWeatherMap
 *
 * @bugsounet
 * MIT Licensed.
 */

var NodeHelper = require("node_helper");
const fetch = require("node-fetch");
var moment = require("moment");
var log = (...args) => { /* do nothing */ };

module.exports = NodeHelper.create({

  start: function() {
    this.interval= null
    this.first = true
  },

  validUnits: ["standard", "metric", "imperial"],
  validLayouts: ["tiled", "table"],

  socketNotificationReceived: function(notification, payload){
    switch(notification) {
      case 'SET_CONFIG':
        this.initialize(payload)
        break
    }
  },

  initialize: function(config) {
    console.log("[WEATHER] MMM-WEATHER Version:", require('./package.json').version)
    this.config = config
    if (this.config.debug) log = (...args) => { console.log("[WEATHER]", ...args) }
    this.updateIntervalMilliseconds = this.getUpdateIntervalMillisecondFromString(this.config.updateInterval)
    if (this.config.api.key == null || this.config.api.key == "") {
      return this.sendError("No API key configured.", "Get an API key at https://openweathermap.org/")
    }
    if (this.config.api.latitude == null || this.config.api.latitude == "" || this.config.api.longitude == null || this.config.api.longitude == "") {
      return this.sendError("'latitude:' and/or 'longitude:' not provided.")
    }
    if (!this.validUnits.includes(this.config.api.units)) {
      return this.sendError("'units:' value is incorrect!")
    }
    if (!this.validLayouts.includes(this.config.personalize.forecastLayout)) {
      return this.sendError("'forecastLayout:' value is incorrect!")
    }
    /** fetch loop **/
    this.fetchData()
    this.scheduleUpdate(this.updateIntervalMilliseconds)
  },

  fetchData: function() {
    let versionAPI = this.config.newAccount ? "3.0" : "2.5"
    var url= "https://api.openweathermap.org/data/"+versionAPI+ "/onecall?"+
      "lat=" + this.config.api.latitude + "&lon=" + this.config.api.longitude +
      "&appid=" + this.config.api.key +
      "&units=" + this.config.api.units +
      "&lang=" + this.config.api.language

    if (this.first) log("Fetch data from:", url)
    else log("Weather Fetch data.")

    fetch(url)
      .then(NodeHelper.checkFetchStatus)
      .then(async (response) => {
        const jsonResponse = await response.json()
        this.makeData(jsonResponse)
      })
      .catch((error) => {
        this.sendError(error)
      });
  },

  makeData: function(weather) {
    if (!weather) return console.error("[WEATHER] **ERROR No Data**")
    var updated = new Date().toLocaleDateString(this.config.api.language, {year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    weather.update= updated
    //log("Result:", weather)
    this.sendSocketNotification("DATA_UPDATE", weather)
    if (!this.first) log("Weather data updated.")
    this.first = false
  },

  /** update process **/
  scheduleUpdate: function(delay) {
    let nextLoad = this.updateIntervalMilliseconds
    if (typeof delay !== "undefined" && delay >= 0) {
      nextLoad = delay
    }
    else console.error("[Weather] Delay Update error")
    clearInterval(this.interval)
    this.interval = setInterval(() => {
      this.fetchData()
    }, nextLoad)
  },

  sendError: function(error, message) {
     console.error("[WEATHER] **ERROR** " + error, message ? message: "")
     this.sendSocketNotification("ERROR", error)
  },

  /** ***** **/
  /** Tools **/
  /** ***** **/

  getUpdateIntervalMillisecondFromString: function(intervalString) {
   let regexString = new RegExp("^\\d+[smhd]{1}$")
   let updateIntervalMillisecond = 0

   if (regexString.test(intervalString)){
     let regexInteger = "^\\d+"
     let integer = intervalString.match(regexInteger)
     let regexLetter = "[smhd]{1}$"
     let letter = intervalString.match(regexLetter)

     let millisecondsMultiplier = 1000
      switch (String(letter)) {
        case "s":
          millisecondsMultiplier = 1000
          break
        case "m":
          millisecondsMultiplier = 1000 * 60
          break
        case "h":
          millisecondsMultiplier = 1000 * 60 * 60
          break
        case "d":
          millisecondsMultiplier = 1000 * 60 * 60 * 24
          break
      }
      // convert the string into seconds
      updateIntervalMillisecond = millisecondsMultiplier * integer
    } else {
      updateIntervalMillisecond = 1000 * 60 * 60 * 24
    }
    return updateIntervalMillisecond
  },
});
