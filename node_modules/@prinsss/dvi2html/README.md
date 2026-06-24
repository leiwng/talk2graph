# DVI Parser

> This package is build on top of the work of [@artisticat1](https://github.com/artisticat1/dvi2html/tree/ww-modifications), [@drgrice1](https://github.com/drgrice1/dvi2html/tree/ww-modifications) and [@kisonecat](https://github.com/kisonecat/dvi2html). Thanks to them for their great work!
>
> What I did is to build and publish the package on npm to make it easier to use in other projects.

A live demo is available at https://people.math.osu.edu/fowler.291/latex/

Built using https://github.com/FabriceSalvaire/PyDVI and the work of @tmanderson

The goal with this project is to eventually have a complete [DVI](https://en.wikipedia.org/wiki/Device_independent_file_format) toolset
written in node. Once complete, this will hopefully be used to implement
TeX document conversions completely in node (particularly a highly configurable
HTML/CSS/JS output).

I'll also be updating the Wiki for those that are interested. Currently, I there's
a [DVI Specification Explained](https://github.com/tmanderson/dvi-parser/wiki/DVI-Specification-Explained) section that I
put together for my own benefit (sourced from a few different online pages).

### TODO

- [x] DVI Parser
- [X] TFM Parser
- [X] Metric management (right now, fonts are found using `kpsewhich`)
- [X] HTML/CSS/JS conversion

# Building

Run
```
npm install
```
Not that this will automatically run `npm run build` after all node packages are installed.
