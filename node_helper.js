/*
 * Module: MMM-MeteoFrance
 * from MMM-DarkSkyForecast (Jeff Clarke)
 * from MMM-Weather (bugsounet)
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
    this.weathers = []
    this.weathersResult = []
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
    if (typeof this.config.place === "object" && this.config.place.length) {
      this.weathers = this.config.place
    }
    else if (typeof this.config.place === "string") {
      this.weathers.push(this.config.place)
    }
    else return this.sendError("'place:' nom de ville manquante!")
    if (!this.validLayouts.includes(this.config.personalize.forecastLayout)) {
      return this.sendError("'forecastLayout:' valeur incorrecte!")
    }
    /** fetch loop **/
    this.fetchData()
    this.scheduleUpdate(this.config.updateInterval)
  },

  fetchData: async function() {
    this.weathersResult = []
    log("Weather Fetch all data...")
    await Promise.all(this.weathers.map(
      async place => {
        log("Weather Fetch data for:", place)
        let fetcher = await this.fetchWeather(place)
        if (fetcher) {
          this.weathersResult.push(fetcher);
          log("Done:", place)
        }
        else log("No Data:", place)
      })
    ).catch(() => console.error("[METEOFRANCE] **ERROR No Data**"));
    this.sendSocketNotification("DATA_UPDATE", this.weathersResult)
  },

  fetchWeather: async function(place) {
    return new Promise (resolv => {
      getWeather(place)
        .then(weather => {
          if (!weather) {
            console.error("[METEOFRANCE] **ERROR No Data**")
            resolv(null)
            return
          }
          if (weather.properties.country !== "FR - France") {
            this.sendError("Ce module est uniquement disponible pour les villes Française!")
            resolv(null)
            return
          }
          let date = weather.last_update
          let update = new Intl.DateTimeFormat('fr',
            {
              dateStyle: 'long',
              timeStyle: 'short',
            }
          ).format(date)
          weather.update = update
          log(`Fetched last update for ${place}:`, weather.update)
          resolv(weather)
        })
        .catch (error => {
          this.sendError(error)
          resolv(null)
        })
    })
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
