# uat-chooser

A widget for choosing concepts from the
[Unified Astronomy Thesaurus](http://astrothesaurus.org/) (UAT). It currently
looks like this:

![Simple example screenshot](img/screenshot.png)

We host a live version of the widget on the UAT website:

http://astrothesaurus.org/concept-select/

The original code was donated by [eJournalPress](https://ejpress.com/). This
module is maintained by the [American Astronomical Society](https://aas.org/).


## Usage

See [dist/index.html](dist/index.html) for a minimal example webpage that will
demonstrate the concept chooser.

We don’t currently host a world-accessible version of the UAT chooser, so if
you want to embed it in your own website, you must build and upload it
yourself. To do so, run

```
$ npm install
$ npm run build
```

and then copy the contents of the `dist/` directory, minus `index.html`, to
your web server. Tweak the sample HTML and embed it in your webpage as
appropriate.

To test the local code in a web browser, you can launch a webserver that
serves static files from the `dist/` directory. There are
[many ways to do this](https://gist.github.com/willurd/5720255). We suggest:

```
$ npx http-server -p 8000 dist
```

Then navigate your browser to <http://localhost:8000/>.

**TODO**: show how to extract the list of selected keywords!


## Deployment

AAS hosts a static deployment of the chooser at:

#### https://aasjournals.github.io/uat-chooser/

This static deployment is hosted through [GitHub Pages][ghpages] from the
`gh-pages` branch of this repo.

[ghpages]: https://pages.github.com/

We should really automate deployment on merges to master, and we used to do so,
but the automation was based on Travis CI which is now basically nonfunctional.
To deploy manually:

```sh
$ git clean -fxd
$ npm install
$ npm run build
$ git switch gh-pages
$ rm -rf node_modules dist/.gitignore dist/combined.js *.png *.gif *.js
$ mv dist/* .
$ git add .
$ git ci -m "Deploy updates"
$ git push
$ git switch master
```

## Technical details

The widget is based on the [script.aculo.us](https://script.aculo.us/)
library, which in turn is built on the [Prototype](http://prototypejs.org/)
framework. These are both rather out-of-date compared to current JavaScript
trends.

In a perhaps vain effort to adapt the code to a more modern JavaScript style,
I ([@pkgw](https://github.com/pkgw)) have made some efforts toward wrapping
the widget in a standard [npm](https://www.npmjs.com/) package using
[webpack](https://webpack.js.org/). However, the Prototype library makes
various modifications to the global JavaScript interpreter namespace, so (as
far as I can tell) this package can’t be transparently integrated into a
regular Web dependency stack so long as it remains built on script.aculo.us.
(Prototype makes some gnarly use of
[arguments.callee](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments/callee)
that further mean that we can’t run in Strict mode.)

What I’ve set up here is an `npm run build` command that will combine the
widget code with the script.aculo.us modules that it uses. That way, the only
special thing you need to do is to make sure to load `prototype.js` before
loading this package.

The main output file created by the `npm run build` command is
`dist/uat-chooser.js`. This module is built in Webpack’s
[library mode](https://webpack.js.org/configuration/output/#output-librarytarget),
so that if you load it in a webpage it will create a global variable named
`uat_chooser` that represents the module. That module currently has one API
entry point, `uat_chooser.default.ejpUatAutocompleterInit(divid)`. This
function takes the ID of a `<div class="uat-widget">` element that will be
set up with the UAT concept-choosing interface.


## Legalities

The original code was donated by Precision Computer Works, Inc. /
eJournalPress to the American Astronomical Society. Licensed under the MIT
License.
