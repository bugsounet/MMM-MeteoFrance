/*
 * Module: MMM-MeteoFrance
 * from MMM-DarkSkyForecast (Jeff Clarke)
 * recoded for MeteoFrance
 *
 * @bugsounet
 * MIT Licensed.
 */

var NodeHelper = require("node_helper");
var log = (...args) => { /* do nothing */ };
const {getWeather} = require('meteofrance_api')

module.exports = NodeHelper.create({

  start: function() {
    this.interval= null
    this.first = true
  },

  validLayouts: ["tiled", "table"],

  socketNotificationReceived: function(notification, payload){
    switch(notification) {
      case 'SET_CONFIG':
        this.initialize(payload)
        break
    }
  },

  initialize: function(config) {
    console.log("[METEOFRANCE] MMM-MeteoFrance Version:", require('./package.json').version)
    this.config = config
    if (this.config.debug) log = (...args) => { console.log("[METEOFRANCE]", ...args) }
    if (!this.validLayouts.includes(this.config.personalize.forecastLayout)) {
      return this.sendError("'forecastLayout:' value is incorrect!")
    }
    /** fetch loop **/
    this.fetchData()
    this.scheduleUpdate(this.config.updateInterval)
  },

  fetchData: async function() {
    if (this.first) log("Loading data from meteofrance...")
    else log("Weather Fetch data.")
    await getWeather(this.config.place)
      .then(weather => {
        this.makeData(weather)
      })
      .catch (error => {
        this.sendError(error)
      })
  },

  makeData: function(weather) {
    if (!weather) return console.error("[METEOFRANCE] **ERROR No Data**")
    if (weather.properties.country !== "FR - France") {
      this.sendError("Ce module est uniquement disponible pour les villes Française!")
      return
    }
    //log("Result:", weather)
    let date = weather.last_update
    let update = new Intl.DateTimeFormat('fr',
      {
        dateStyle: 'long',
        timeStyle: 'short',
      }
    ).format(date)
    weather.update = update

    this.sendSocketNotification("DATA_UPDATE", weather)
    if (!this.first) log("Weather data updated.")
    this.first = false
  },

  /** update process **/
  scheduleUpdate: function(delay) {
    clearInterval(this.interval)
    this.interval = setInterval(() => {
      this.fetchData()
    }, delay)
  },

  sendError: function(error, message) {
     console.error("[METEOFRANCE] **ERREUR** " + error, message ? message: "")
     this.sendSocketNotification("ERROR", error.message || error)
  }
});
