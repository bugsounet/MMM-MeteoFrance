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
    rotateInterval: 30 * 1000,
    place: "Paris",
    display: {
      HeaderPlaceName: false,
      Background: true,
      CurrentConditions: true,
      ExtraCurrentConditions: true,
      Precipitation: true,
      Wind: true,
      Feels: true,
      SunCondition: true,
      Humidity: true,
      UV: true,
      Summary: true,
      HourlyForecast: true,
      DailyForecast: true
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
| debug | Active le mode debug. | boolean | false |
| updateInterval | Intervalle entre chaque mise à jour.<br>**Note:** Méteo-France mets à jours son API toutes les 15 mins.| number |  10 * 60 * 1000 |
| rotateInterval | Intervalle affichage entre chaque d'une ville<br>**Note:** Cette option est inactive lorqu'une unique ville est utilisée. | number | 30 * 1000 |
| place | Nom de la ville à afficher<br>**Note:** il est possible d'afficher plusieures villes avec ce format:<br>`place: [ "Paris", "Marseille", "Lille" ]` | String ou Array of String | "Paris" |

#### Options `display`

| Option  | Description | Type | Defaut |
| ------- | --- | --- | --- |
| HeaderPlaceName | Affiche le nom de la ville<br>**Note:** Cette option est activée automatiquement en cas d'utilisation de plusieures villes. | boolean | false |
| Backgound | Affiche le font météo dynamique. | boolean |  true |
| CurrentConditions | Affiche l'icône des conditions actuelles et la température.| boolean | true |
| ExtraCurrentConditions | Afficher les conditions actuelles supplémentaires telles que les températures élevées/basses, les précipitations, la vitesse du vent, ... | boolean | true |
| Precipitation | Affiche les précipitations prévu pour la journée. | boolean | true |
| Wind | Affiche la vitesse du vent, sa direction ainsi que les rafales. | boolean | true |
| Feels | Affiche la température ressentie. | boolean | true |
| SunCondition | Affiche l'heure du levé ou du couché de soleil. | boolean | true |
| Humidity | Affiche le pourcentage d'humidité. | boolean | true |
| UV | Affiche l'indice d'Ultra-Violet.| boolean | true |
| Summary | Affiche une courte description du temps actuel. | boolean | true |
| HourlyForecast | Affiche les prévisions des heures à venir. | boolean | true |
| DailyForecast | Affiche les prévisions des jours suivants. | boolean | true |

#### Options `personalize`

| Option  | Description | Type | Defaut |
| ------- | --- | --- | --- |
| hourlyForecastInterval | Intervalle entre chaque heures de prévision.| number | 3 |
| maxHourliesToShow | Nombre de previsions horaires à afficher.| number | 3 |
| maxDailiesToShow | Nombre de prévisions journalières à afficher.| number | 3 |

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

## Donation
 Si vous aimez ce module, un petit café est bien sympatique :)
 
 [Donation](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=TTHRH94Y4KL36&source=url)
