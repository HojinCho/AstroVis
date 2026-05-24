# AstroVis
Prompted by Hojin Cho in 2026, using Claude.

An attempt to make a very lightweight visualizer for FITS and CSV/TSV. Uses [Plotly.js (3.5.1)](https://github.com/plotly/plotly.js) and [fits.js](https://github.com/astrojs/fitsjs). More complicated tasks should be done using a more proper tool.

Use at your own risk. 

### How to use
Download all files and open `index.html` via a web browser. Open a file using the button or drag-and-drop it onto the window.

### Features
- Simple scatter plot, step-like plot, 1d and 2d histograms.
- Able to select points and examine them.
- Able to display image files with minimal functionality.

### TODO
- Add support for other file formats: ecsv, asdf, parquet, hdf5, ...
- Make it run on Safari without problem.