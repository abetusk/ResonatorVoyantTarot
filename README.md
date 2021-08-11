<br />

<p align="center">

  <h3 align="center">
    <a href='https://abetusk.github.io/ResonatorVoyantTarot'>Resonator Voyant Tarot</a>
  </h3>

  <p align="center">
    <a href='https://abetusk.github.io/ResonatorVoyantTarot'><img src="images/rvt_hdr.gif" alt="Resonator Voyant Tarot" ></a>
  </p>


  <p align="center">
    An experiment in creating generative tarot cards.
  </p>

</p>


## Table Of Contents

- [Table Of Contents](#table-of-contents)
- [Overview](#overview)
- [Quick Start](#quick-start)
- [License](#license)
- [Acknowledgements](#acknowledgements)
- [TODO](#todo)

## Overview

![tarot reading screenshot](images/rvt_screenshot.png)

Resonator Voyant Tarot is an experiment in creating generative tarot cards.

Though steeped in spirituality, the reasons for doing a tarot reading need
not be mystical as it can be a source of creativity and help with
imaginative problem solving.

Each deck is created from a "vocabulary" of images with predefined rules
for joining them together.
Each card has a template with some fixed
elements and other random elements put together.

For example, a major arcana card of "The Fool" would have a fixed "fool"
image with randomly chosen elements coming out of the base. Another
 example is a minor arcana card that has the suite graphic (e.g.
"swords") positioned in a pattern appropriate for the numbered card
with a random "creature" created in the center.

Color palettes are also chosen randomly, with a consistent color
palette chosen for each suite. 

## Quick Start

[Live Demo](https://abetusk.github.io/ResonatorVoyantTarot/)

To run locally:

```
git clone https://github.com/abetusk/ResonatorVoyantTarot
cd ResonatorVoyantTarot
python3 -m http.server
```

```
firefox 'http://localhost:8000'
```

### Building

Building the main Javascript file, `browser-sibyl.js`, is pretty ad-hoc but
via:

```
cd scripts ; ./build.sh
```

This will create the `js/browser-sibyl.js` used as the engine to create the SVG
cards and has the data for SVG graphics and tarot reading.


## License

Unless otherwise specified, all original code and other artwork
is [CC0](https://creativecommons.org/publicdomain/zero/1.0/) licensed.

![cc0](images/cc0_88x31.png)

Artwork in the `_svg-vocabulary-pretty-printed.json` file is copyright Nina Paley and is
used by permission under a [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/) license.

Check for third party libraries to see individual licenses.

All third party libraries were chosen to be under a free/libre license, so please
check the individual libraries for their respective licenses.

## Acknowledgements

* Artwork in the `_svg-vocabulary-pretty-printed.json` file is copyright Nina Paley and is used by permission under a [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/) license.
* `alea.js` is copyright Johannes Baagø and is MIT licensed
* `jszip.js` is copyright Stuart Knightley and is dual licensed under the MIT license and GPLv3
* `pixi.js` is licensed under the MIT License
* `jquery.js` is copyright OpenJS Foundation and other contributors and is released under the MIT license
* `canvg` is copyright Gabe Lerner and is MIT licensed
* `skeleton.css` is copyright Dave Gamache and is MIT licensed
* `normalize.css` is MIT licensed

The above is a non-exhaustive list of software used.
Please see individual source files for their individual copyright.


## TODO

* Show card interpretations for the 'full deck' view
* Allow for suite elements to be rotated. Sword suites can have some 'texture' added to them with a little rotation.
* Allow for different suites other than the "default" four (swords, keys, pentacles, cups)
* Rotate cups (and maybe others) under Queen and King cards (or allow option to do so)
* Fix some of the color scheme where the background images appear indistinguishable from the background color
* Provide script to render SVG deck large enough for print
* Print a custom deck (one possibility is [makeplayingcards.com](https://www.makeplayingcards.com/promotional/personalized-tarot-cards.html))
