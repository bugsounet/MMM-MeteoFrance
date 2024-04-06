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
const { getWeather } = require("meteofrance_api");

module.exports = NodeHelper.create({

  start () {
    this.interval= null;
    this.weathers = [];
    this.weathersResult = [];
  },

  validLayouts: ["tiled", "table"],

  socketNotificationReceived (notification, payload){
    switch(notification) {
      case "SET_CONFIG":
        this.initialize(payload);
        break;
    }
  },

  initialize (config) {
    console.log("[METEOFRANCE] MMM-MeteoFrance Version:", require("./package.json").version);
    this.config = config;
    if (this.config.debug) log = (...args) => { console.log("[METEOFRANCE]", ...args); };
    if (typeof this.config.place === "object" && this.config.place.length) {
      this.weathers = this.config.place;
    }
    else if (typeof this.config.place === "string") {
      this.weathers.push(this.config.place);
    }
    else return this.sendError("'place:' nom de ville manquante!");
    if (!this.validLayouts.includes(this.config.personalize.forecastLayout)) {
      return this.sendError("'forecastLayout:' valeur incorrecte!");
    }
    /** fetch loop **/
    this.fetchData();
    this.scheduleUpdate(this.config.updateInterval);
  },

  async fetchData () {
    this.weathersResult = [];
    log("Weather Fetch all data...");
    await Promise.all(this.weathers.map(
      async (place) => {
        log("Weather Fetch data for:", place);
        let fetcher = await this.fetchWeather(place);
        if (fetcher) {
          this.weathersResult.push(fetcher);
          log("Done:", place);
        }
        else log("No Data:", place);
      }
    )).catch(() => console.error("[METEOFRANCE] **ERROR No Data**"));
    this.sendSocketNotification("DATA_UPDATE", this.weathersResult);
  },

  async fetchWeather (place) {
    return new Promise ((resolv) => {
      getWeather(place)
        .then((weather) => {
          if (!weather) {
            console.error("[METEOFRANCE] **ERROR No Data**");
            resolv(null);
            return;
          }
          if (weather.properties.country !== "FR - France") {
            this.sendError("Ce module est uniquement disponible pour les villes Française!");
            resolv(null);
            return;
          }
          let date = weather.last_update;
          let update = new Intl.DateTimeFormat("fr",
            {
              dateStyle: "long",
              timeStyle: "short"
            }).format(date);
          weather.update = update;
          if (weather.nowcast?.weather_icon) {
            weather.nowcast.weather_background = this.config.display.Background ? this.searchBackground(weather.nowcast.weather_icon) : "none";
          }
          log(`Fetched last update for ${place}:`, weather.update);
          resolv(weather);
        })
        .catch ((error) => {
          this.sendError(error);
          resolv(null);
        });
    });
  },

  searchBackground (icon) {
    const name = icon.split("https://meteofrance.com/modules/custom/mf_tools_common_theme_public/svg/weather/")[1].split(".")[0];
    var background = null;
    switch(name) {
      case "p1j":
        background = "soleil";
        break;
      case "p2j":
      case "p3j":
      case "p4j":
      case "p5j":
        background = "soleil_nuage";
        break;
      case "p6j":
      case "p7j":
      case "p8j":
      case "p6n":
      case "p7n":
      case "p8n":
        background = "brouilard";
        break;
      case "p9j":
      case "p10j":
      case "p11j":
      case "p12j":
      case "p13j":
      case "p14j":
      case "p15j":
      case "p9n":
      case "p10n":
      case "p11n":
      case "p12n":
      case "p13n":
      case "p14n":
      case "p15n":
        background = "pluie";
        break;
      case "p16j":
      case "p16n":
        background = "orage";
        break;
      case "p17j":
      case "p18j":
      case "p19j":
      case "p20j":
      case "p21j":
      case "p22j":
      case "p23j":
      case "p17n":
      case "p18n":
      case "p19n":
      case "p20n":
      case "p21n":
      case "p22n":
      case "p23n":
        background = "neige";
        break;
      case "p24j":
      case "p25j":
      case "p26j":
      case "p27j":
      case "p28j":
      case "p29j":
      case "p30j":
      case "p24n":
      case "p25n":
      case "p26n":
      case "p27n":
      case "p28n":
      case "p29n":
      case "p30n":
        background = "orage";
        break;
      case "p31j":
      case "p31n":
        background = "soleil_nuage";
        /* sable */
        break;
      case "p32j":
      case "p33j":
      case "p34j":
      case "p32n":
      case "p33n":
      case "p34n":
        background = "orage";
        break;

      case "p1n":
        background = "lune";
        break;
      case "p2n":
      case "p3n":
      case "p4n":
      case "p5n":
        background = "lune_nuage";
        break;

      default:
        background = "soleil_nuage";
        break;
    }
    return background;
  },

  /** update process **/
  scheduleUpdate (delay) {
    clearInterval(this.interval);
    this.interval = setInterval(() => {
      this.fetchData();
    }, delay);
  },

  sendError (error, message) {
    console.error(`[METEOFRANCE] **ERREUR** ${  error}`, message ? message: "");
    this.sendSocketNotification("ERROR", error.message || error);
  }
});
