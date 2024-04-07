# MMM-MeteoFrance
---

![](https://github.com/bugsounet/MMM-MeteoFrance/blob/dev/resources/logo.png?raw=true)

`MMM-MeteoFrance` est un module météo qui affiche des informations de prévisions actuelles, horaires et quotidiennes à l'aide des données de l'API MétéoFrance.

## Screenshot

![](https://raw.githubusercontent.com/bugsounet/MMM-MeteoFrance/dev/screenshot.png)

## Configuration

### Minimale

```js
{
  module: 'MMM-MeteoFrance',
  position: "top_right",
  animateIn: "fadeInRight",
  animateOut: "fadeOutRight",
  configDeepMerge: true,
  config: {
    place: "Paris"
    // place: [ "Paris", "Marseille", "Lille" ]
  }
},
```

### Personalisée

```js
{
  module: 'MMM-MeteoFrance',
  position: "top_right",
  animateIn: "fadeInRight",
  animateOut: "fadeOutRight",
  configDeepMerge: true,
  config: {
    debug: false,
    updateInterval: 10 * 60 * 1000,
    updateFadeSpeed: 1000,
    rotateInterval: 30 * 1000,
    place: "Paris",
    display: {
      HeaderPlaceName: false,
      CurrentConditions: true,
      Backgound: true,
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
  }
},
```

## Crédits
  * Author:
    * @bugsounet
  * License: MIT

## Ce module est en cours de developpement
