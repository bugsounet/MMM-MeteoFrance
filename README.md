# MMM-MeteoFrance
---

![](https://github.com/bugsounet/MMM-MeteoFrance/blob/dev/resources/logo.png?raw=true)

`MMM-MeteoFrance` est un module météo qui affiche des informations de prévisions actuelles, horaires et quotidiennes à l'aide des données de l'API MétéoFrance.

## Screenshot

![](https://raw.githubusercontent.com/bugsounet/MMM-MeteoFrance/dev/screenshot.png)

## Installation

Clonez le module dans le dossier modules:
```sh
cd ~/MagicMirror/modules
git clone https://github.com/bugsounet/MMM-MeteoFrance
cd MMM-MeteoFrance
npm install
```

## Configuration
Pour afficher le module, inserez ceci dans votre ficher `config.js`

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

### Caractéristiques des Options

| Option  | Description | Type | Defaut |
| ------- | --- | --- | --- |
| debug | | boolean | false |
| updateInterval | | number |  10 * 60 * 1000 |
| updateFadeSpeed | | number | 1000 |
| rotateInterval | | number | 30 * 1000 |
| place | | String ou Array of String | "Paris" |

#### Options `display`

| Option  | Description | Type | Defaut |
| ------- | --- | --- | --- |
| HeaderPlaceName | | boolean | false |
| CurrentConditions | | boolean | true |
| Backgound | | boolean |  true |
| ExtraCurrentConditions | | boolean | true |
| Summary | | boolean | true |
| HourlyForecast | | boolean | true |
| DailyForecast | | boolean | true |
| Precipitation | | boolean | true |
| Wind | | boolean | true |
| Feels | | boolean | true |
| SunCondition | | boolean | true |
| Humidity | | boolean | true |
| UV | | boolean | true |

#### Options `personalize`

| Option  | Description | Type | Defaut |
| ------- | --- | --- | --- |
| hourlyForecastInterval | | number | 3 |
| maxHourliesToShow | | number | 3 |
| maxDailiesToShow | | number |3 |

## Mise à jour

### Mise à jour manuelle

Utilisez cette commande:
```sh
cd ~/MagicMirror/modules/MMM-MeteoFrance
npm run update
```

### Mise à jour automatique depuis le module [updatenotification](https://develop.docs.magicmirror.builders/modules/updatenotification.html)

Depuis MagicMirror² v2.27.x, vous pouvez appliquer automatiquement les mises à jours des modules depuis `updatenotification`.<br>
Voici la règle a ajouter pour `MMM-MeteoFrance`

```js
  {
    module: "updatenotification",
    position: "top_center",
    config: {
      updateAutorestart: true, // restart MagicMirror automaticaly after update
      updates: [
        // MMM-MeteoFrance rule
        {
          "MMM-MeteoFrance": "npm run update"
        },
      ]
    }
  },
```

## Crédits
  * Author:
    * @bugsounet
  * License: MIT

## Ce module est en cours de developpement
