(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Global UI state
  // ---------------------------------------------------------------------------

  const state = {
    tabs: [],
    activeTabId: null,
    nextTabId: 1,
    plotEventsBound: false,
    suppressBackgroundClick: false,
    darkMode: false,
    dragMode: 'pan',
    examineMode: false
  };

  // Shift-key state tracked globally for examine lasso/click
  let _shiftKeyDown = false;

  const TABLE_TYPES = new Set(['BinaryTable', 'Table']);

  // ---------------------------------------------------------------------------
  // DOM element references (gathered once after DOMContentLoaded)
  // ---------------------------------------------------------------------------

  let elements = {};

  function gatherElements() {
    elements = {
      openFileBtn:       document.getElementById('openFileBtn'),
      fileMenu:          document.getElementById('fileMenu'),
      fitsInput:         document.getElementById('fitsInput'),
      csvInput:          document.getElementById('csvInput'),
      themeToggle:       document.getElementById('themeToggle'),
      tabs:              document.getElementById('tabs'),
      hduSelect:         document.getElementById('hduSelect'),
      xSelect:           document.getElementById('xSelect'),
      ySelect:           document.getElementById('ySelect'),
      yerrSelect:        document.getElementById('yerrSelect'),
      yerrTypeSelect:    document.getElementById('yerrTypeSelect'),
      yerrStyleSelect:   document.getElementById('yerrStyleSelect'),
      yerrStyleContainer: document.getElementById('yerrStyleContainer'),
      plotTypeSelect:    document.getElementById('plotTypeSelect'),
      xScaleSelect:      document.getElementById('xScaleSelect'),
      yScaleSelect:      document.getElementById('yScaleSelect'),
      xerrSelect:        document.getElementById('xerrSelect'),
      xerrTypeSelect:    document.getElementById('xerrTypeSelect'),
      autoscaleXYBtn:    document.getElementById('autoscaleXYBtn'),
      autoscaleXYErrBtn: document.getElementById('autoscaleXYErrBtn'),
      floorXYBtn:        document.getElementById('floorXYBtn'),
      autoscaleXBtn:     document.getElementById('autoscaleXBtn'),
      autoscaleXErrBtn:  document.getElementById('autoscaleXErrBtn'),
      floorXBtn:         document.getElementById('floorXBtn'),
      autoscaleYBtn:     document.getElementById('autoscaleYBtn'),
      autoscaleYErrBtn:  document.getElementById('autoscaleYErrBtn'),
      floorYBtn:         document.getElementById('floorYBtn'),
      zoomModeBtn:       document.getElementById('zoomModeBtn'),
      panModeBtn:        document.getElementById('panModeBtn'),
      zoomInBtn:         document.getElementById('zoomInBtn'),
      zoomOutBtn:        document.getElementById('zoomOutBtn'),
      saveImageBtn:      document.getElementById('saveImageBtn'),
      customXLabel:      document.getElementById('customXLabel'),
      customYLabel:      document.getElementById('customYLabel'),
      customTitle:       document.getElementById('customTitle'),
      crosshairToggle:   document.getElementById('crosshairToggle'),
      clearCrosshairBtn: document.getElementById('clearCrosshairBtn'),
      crosshairReadout:  document.getElementById('crosshairReadout'),
      yerrAsymToggle:    document.getElementById('yerrAsymToggle'),
      yerrLowerSelect:   document.getElementById('yerrLowerSelect'),
      yerrUpperSelect:   document.getElementById('yerrUpperSelect'),
      yerrAsymCols:      document.getElementById('yerrAsymCols'),
      xerrAsymToggle:    document.getElementById('xerrAsymToggle'),
      xerrLowerSelect:   document.getElementById('xerrLowerSelect'),
      xerrUpperSelect:   document.getElementById('xerrUpperSelect'),
      xerrAsymCols:      document.getElementById('xerrAsymCols'),
      histNBinsInput:         document.getElementById('histNBinsInput'),
      histNBinsYInput:        document.getElementById('histNBinsYInput'),
      histDensityScaleSelect: document.getElementById('histDensityScaleSelect'),
      histMarginalToggle:     document.getElementById('histMarginalToggle'),
      histOptionsRow:         document.getElementById('histOptionsRow'),
      examineToggle:     document.getElementById('examineToggle'),
      selectAllBtn:      document.getElementById('selectAllBtn'),
      deselectAllBtn:    document.getElementById('deselectAllBtn'),
      examineReadout:    document.getElementById('examineReadout'),
      examinePanel:      document.getElementById('examinePanel'),
      examineExportBtn:  document.getElementById('examineExportBtn'),
      examineTableHead:  document.getElementById('examineTableHead'),
      examineTableBody:  document.getElementById('examineTableBody'),
      examineEmpty:      document.getElementById('examineEmpty'),
      headerHduSelect:   document.getElementById('headerHduSelect'),
      headerTableBody:   document.getElementById('headerTableBody'),
      headerEmpty:       document.getElementById('headerEmpty'),
      status:            document.getElementById('status'),
      plot:              document.getElementById('plot'),
      emptyState:        document.getElementById('emptyState'),
      controls:          document.getElementById('controls'),
      plotResizeHandle:  document.getElementById('plotResizeHandle')
    };
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  function init() {
    gatherElements();

    if (!window.Plotly) {
      setGlobalStatus('Plotly failed to load. Check network access.', 'error');
      return;
    }
    if (!window.astro || !window.astro.FITS) {
      setGlobalStatus('fitsjs failed to load. Check network access.', 'error');
      return;
    }

    // Restore dark mode preference
    try {
      const saved = localStorage.getItem('astrovis-dark');
      if (saved === 'true') {
        state.darkMode = true;
        document.body.classList.add('dark-mode');
        elements.themeToggle.checked = true;
      }
    } catch (_) { /* ignore */ }

    // Event listeners
    elements.openFileBtn.addEventListener('click', onOpenFileBtnClick);
    elements.fitsInput.addEventListener('change', onFitsInput);
    elements.csvInput.addEventListener('change', onCsvInput);
    // Close the file-type dropdown when clicking anywhere outside it
    document.addEventListener('click', () => elements.fileMenu.classList.remove('open'));
    // Prevent clicks inside the menu from immediately closing it
    elements.fileMenu.addEventListener('click', (e) => e.stopPropagation());
    // Close and trigger file input when a menu item is chosen
    document.querySelectorAll('.file-menu-item').forEach((item) =>
      item.addEventListener('click', () => elements.fileMenu.classList.remove('open'))
    );
    elements.themeToggle.addEventListener('change', onThemeToggle);
    elements.tabs.addEventListener('click', onTabClick);
    elements.hduSelect.addEventListener('change', onHduChange);
    elements.plotTypeSelect.addEventListener('change', onPlotTypeChange);
    elements.xSelect.addEventListener('change', onColumnChange);
    elements.ySelect.addEventListener('change', onColumnChange);
    elements.yerrSelect.addEventListener('change', onColumnChange);
    elements.xerrSelect.addEventListener('change', onColumnChange);
    elements.yerrTypeSelect.addEventListener('change', onErrorOptionsChange);
    elements.yerrStyleSelect.addEventListener('change', onErrorOptionsChange);
    elements.xerrTypeSelect.addEventListener('change', onErrorOptionsChange);
    elements.xScaleSelect.addEventListener('change', onScaleChange);
    elements.yScaleSelect.addEventListener('change', onScaleChange);
    elements.autoscaleXYBtn.addEventListener('click', onAutoscaleXY);
    elements.autoscaleXYErrBtn.addEventListener('click', onAutoscaleXYErr);
    elements.floorXYBtn.addEventListener('click', onFloorXY);
    elements.autoscaleXBtn.addEventListener('click', onAutoscaleX);
    elements.autoscaleXErrBtn.addEventListener('click', onAutoscaleXErr);
    elements.floorXBtn.addEventListener('click', onFloorX);
    elements.autoscaleYBtn.addEventListener('click', onAutoscaleY);
    elements.autoscaleYErrBtn.addEventListener('click', onAutoscaleYErr);
    elements.floorYBtn.addEventListener('click', onFloorY);
    elements.zoomModeBtn.addEventListener('click', onZoomMode);
    elements.panModeBtn.addEventListener('click', onPanMode);
    elements.zoomInBtn.addEventListener('click', onZoomIn);
    elements.zoomOutBtn.addEventListener('click', onZoomOut);
    elements.saveImageBtn.addEventListener('click', onSaveImage);
    elements.customXLabel.addEventListener('input', onCustomLabelChange);
    elements.customYLabel.addEventListener('input', onCustomLabelChange);
    elements.customTitle.addEventListener('input', onCustomLabelChange);
    elements.crosshairToggle.addEventListener('click', onCrosshairToggle);
    elements.clearCrosshairBtn.addEventListener('click', onClearCrosshair);
    elements.yerrAsymToggle.addEventListener('change', onYerrAsymChange);
    elements.xerrAsymToggle.addEventListener('change', onXerrAsymChange);
    elements.yerrLowerSelect.addEventListener('change', onColumnChange);
    elements.yerrUpperSelect.addEventListener('change', onColumnChange);
    elements.xerrLowerSelect.addEventListener('change', onColumnChange);
    elements.xerrUpperSelect.addEventListener('change', onColumnChange);
    elements.histNBinsInput.addEventListener('change', onHistOptionsChange);
    elements.histNBinsYInput.addEventListener('change', onHistOptionsChange);
    elements.histDensityScaleSelect.addEventListener('change', onHistOptionsChange);
    elements.histMarginalToggle.addEventListener('change', onHistOptionsChange);
    elements.examineToggle.addEventListener('click', onExamineToggle);
    elements.selectAllBtn.addEventListener('click', onSelectAll);
    elements.deselectAllBtn.addEventListener('click', onDeselectAll);
    elements.examineExportBtn.addEventListener('click', onExamineExportCSV);
    elements.headerHduSelect.addEventListener('change', onHeaderHduChange);

    // Track shift key globally for examine additive/subtractive selection
    document.addEventListener('keydown', (e) => { if (e.key === 'Shift') _shiftKeyDown = true; });
    document.addEventListener('keyup',   (e) => { if (e.key === 'Shift') _shiftKeyDown = false; });
    window.addEventListener('blur', () => { _shiftKeyDown = false; });

    // Drag-and-drop file opening
    const FITS_EXTS = new Set(['fits', 'fit', 'fts']);
    const CSV_EXTS  = new Set(['csv', 'tsv', 'txt']);
    let _dragCount = 0;
    document.addEventListener('dragenter', (e) => {
      e.preventDefault();
      if (++_dragCount === 1) document.body.classList.add('drag-over');
    });
    document.addEventListener('dragleave', () => {
      if (--_dragCount <= 0) { _dragCount = 0; document.body.classList.remove('drag-over'); }
    });
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });
    document.addEventListener('drop', (e) => {
      e.preventDefault();
      _dragCount = 0;
      document.body.classList.remove('drag-over');
      Array.from(e.dataTransfer.files || [])
        .filter((f) => {
          const ext = f.name.split('.').pop().toLowerCase();
          return FITS_EXTS.has(ext) || CSV_EXTS.has(ext);
        })
        .forEach(createTabForFile);
    });

    initResizeHandle();

    updateEmptyState();
    syncControlsForActiveTab();
  }

  // ---------------------------------------------------------------------------
  // Dark mode
  // ---------------------------------------------------------------------------

  function onThemeToggle() {
    state.darkMode = elements.themeToggle.checked;
    document.body.classList.toggle('dark-mode', state.darkMode);
    try { localStorage.setItem('astrovis-dark', String(state.darkMode)); } catch (_) { /* ignore */ }

    // Re-render the plot with the new colour scheme
    const tab = getActiveTab();
    if (tab && tab.lastSeries) {
      plotFromSelections(tab, { useCache: false });
    }
  }

  // Return a colour palette that matches the current light/dark theme.
  function getThemeColors() {
    if (state.darkMode) {
      return {
        plotBg:      'rgba(7, 8, 14, 0.97)',
        paperBg:     'rgba(0,0,0,0)',
        gridColor:   'rgba(255,255,255,0.05)',
        fontColor:   '#dde5f2',
        axisColor:   '#6b7a9a',
        lineColor:   '#3ec8c2',
        markerColor: '#3ec8c2',
        errStepColor: '#e07855',          // coral in step+bars mode
        errScatterColor: 'rgba(62,200,194,0.36)',
        shadeColor:  'rgba(62,200,194,0.09)',
        shadeLine:   'rgba(62,200,194,0.17)',
        tickColor:              'rgba(255,255,255,0.08)',
        tickMarkerColor:        '#72d4cf',
        tickMarkerInvalidColor: '#e07070'
      };
    }
    return {
      plotBg:      'rgba(255,255,255,0.92)',
      paperBg:     'rgba(0,0,0,0)',
      gridColor:   'rgba(26,27,30,0.1)',
      fontColor:   '#1a1b1e',
      axisColor:   '#4e5561',
      lineColor:   '#0a6f6d',
      markerColor: '#0a6f6d',
      errStepColor: '#c8553d',
      errScatterColor: 'rgba(10,111,109,0.4)',   // scatter error bars: thin + translucent
      shadeColor:  'rgba(10,111,109,0.15)',
      shadeLine:   'rgba(10,111,109,0.20)',
      tickColor:              'rgba(26,27,30,0.1)',
      tickMarkerColor:        '#3a9c9a',
      tickMarkerInvalidColor: '#c85252'
    };
  }

  // ---------------------------------------------------------------------------
  // Resize handle
  // ---------------------------------------------------------------------------

  function initResizeHandle() {
    if (!elements.plotResizeHandle || !elements.plot) return;

    let dragging  = false;
    let startY    = 0;
    let startH    = 0;

    elements.plotResizeHandle.addEventListener('mousedown', (e) => {
      dragging = true;
      startY   = e.clientY;
      startH   = elements.plot.getBoundingClientRect().height;
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const newH = Math.max(180, startH + (e.clientY - startY));
      elements.plot.style.minHeight = newH + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      document.body.style.userSelect = '';
      if (window.Plotly) {
        // Let Plotly re-fit after the resize
        window.Plotly.Plots.resize(elements.plot);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Status helpers
  // ---------------------------------------------------------------------------

  function setGlobalStatus(message, type) {
    elements.status.textContent = message;
    elements.status.className   = `status ${type || 'info'}`;
  }

  function setTabStatus(tab, type, message) {
    tab.status = { type, message };
    if (tab.id === state.activeTabId) updateStatus(tab);
  }

  function updateStatus(tab) {
    if (!tab || !tab.status) {
      elements.status.textContent = '';
      elements.status.className   = 'status';
      return;
    }
    elements.status.textContent = tab.status.message || '';
    elements.status.className   = `status ${tab.status.type || 'info'}`;
  }

  // ---------------------------------------------------------------------------
  // File loading
  // ---------------------------------------------------------------------------

  function onOpenFileBtnClick(e) {
    e.stopPropagation();   // prevent the document click handler from closing immediately
    elements.fileMenu.classList.toggle('open');
  }

  function onFitsInput(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    files.forEach(createTabForFile);
    event.target.value = '';
  }

  function onCsvInput(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    files.forEach(createTabForFile);
    event.target.value = '';
  }

  function createTabForFile(file) {
    const ext      = file.name.split('.').pop().toLowerCase();
    const fileType = ['csv', 'tsv', 'txt'].includes(ext) ? 'csv' : 'fits';

    const tab = {
      id:               state.nextTabId++,
      file,
      name:             file.name,
      fileType,
      fits:             null,
      hdus:             [],
      tableHdus:        [],
      selectedHduIndex: null,
      columns:     { x: null, y: null, yerr: null, xerr: null,
                     yerrLower: null, yerrUpper: null, xerrLower: null, xerrUpper: null },
      yerrType:    'sigma',
      yerrStyle:   'shade',
      xScale:      'linear',
      yScale:      'linear',
      xerrType:    'sigma',
      yerrAsym:    false,
      xerrAsym:    false,
      plotType:    'scatter',
      histNBins:         50,
      histNBinsY:        50,
      histDensityScale:  'linear',
      histShowMarginal:  false,
      customXLabel: '',
      customYLabel: '',
      customTitle:  '',
      headerHduIndex: null,
      columnCache: {},
      lastPlotKey: null,
      lastPlot:    null,
      lastSeries:  null,
      crosshair:   { enabled: false, x: null, y: null },
      selectedIndices: new Set(),
      examineLoading:  false,
      plotToken:   0,
      status:      { type: 'info', message: fileType === 'csv' ? 'Waiting to parse CSV file.' : 'Waiting to parse FITS file.' }
    };

    state.tabs.push(tab);
    renderTabs();
    setActiveTab(tab.id);
    if (fileType === 'csv') {
      parseCsvForTab(tab);
    } else {
      parseFitsForTab(tab);
    }
  }

  function parseFitsForTab(tab) {
    setTabStatus(tab, 'info', 'Reading FITS data...');
    try {
      new window.astro.FITS(tab.file, function (fits) {
        try {
          if (!fits || !Array.isArray(fits.hdus)) {
            setTabStatus(tab, 'error', 'No HDUs were parsed from this file.');
            syncControlsForActiveTab();
            return;
          }

          tab.fits = fits;
          tab.hdus = fits.hdus.map((hdu, index) => {
            const header   = hdu.header;
            const dataUnit = hdu.data;
            const dataType =
              header && typeof header.getDataType === 'function'
                ? header.getDataType()
                : null;
            const extName  =
              header && typeof header.get === 'function' ? header.get('EXTNAME') : null;
            const columns  =
              dataUnit && Array.isArray(dataUnit.columns) ? dataUnit.columns : null;
            return { index, header, dataUnit, dataType, extName, columns };
          });

          tab.tableHdus = tab.hdus.filter(
            (h) => TABLE_TYPES.has(h.dataType) && h.columns && h.columns.length
          );

          if (!tab.tableHdus.length) {
            setTabStatus(tab, 'error', 'No table HDU with columns was found.');
          } else if (tab.selectedHduIndex === null) {
            tab.selectedHduIndex = tab.tableHdus[0].index;
            autoSelectColumns(tab);
            setTabStatus(tab, 'ok', `Found ${tab.tableHdus.length} table HDU(s).`);
          }

          if (tab.id === state.activeTabId) {
            syncControlsForActiveTab();
            plotFromSelections(tab, { useCache: true });
            syncHeaderPane(tab);
          }
        } catch (_) {
          setTabStatus(tab, 'error', 'Failed to interpret FITS content.');
        }
      });
    } catch (_) {
      setTabStatus(tab, 'error', 'Failed to read this FITS file.');
    }
  }

  // ---------------------------------------------------------------------------
  // CSV loading
  // ---------------------------------------------------------------------------

  function parseCsvForTab(tab) {
    setTabStatus(tab, 'info', 'Reading CSV data...');
    const reader = new FileReader();
    reader.onerror = () => {
      setTabStatus(tab, 'error', 'Failed to read CSV file.');
      syncControlsForActiveTab();
    };
    reader.onload = (e) => {
      try {
        const result = parseCsvText(e.target.result);
        if (!result) {
          setTabStatus(tab, 'error', 'Could not parse CSV — expected a header row and at least one data row.');
          syncControlsForActiveTab();
          return;
        }

        // Build a synthetic HDU object that looks like a FITS BinaryTable so the
        // existing plotting pipeline works without modification.
        const csvData = result.columns;   // { colName: ['1', '2.5', …], … }
        const syntheticHdu = {
          index:    0,
          header:   null,
          dataType: 'CSVTable',
          extName:  null,
          columns:  result.headers,
          dataUnit: {
            columns:     result.headers,
            descriptors: [],
            getColumn(name, callback) { callback(csvData[name] || []); }
          }
        };

        tab.hdus         = [syntheticHdu];
        tab.tableHdus    = [syntheticHdu];
        tab.selectedHduIndex = 0;

        autoSelectColumns(tab);

        const nRows = (result.headers.length ? (csvData[result.headers[0]] || []).length : 0);
        setTabStatus(tab, 'ok', `CSV loaded: ${result.headers.length} columns, ${nRows} rows.`);

        if (tab.id === state.activeTabId) {
          syncControlsForActiveTab();
          plotFromSelections(tab, { useCache: true });
          syncHeaderPane(tab);
        }
      } catch (_) {
        setTabStatus(tab, 'error', 'Failed to interpret CSV content.');
        syncControlsForActiveTab();
      }
    };
    reader.readAsText(tab.file);
  }

  // Parse CSV/TSV text into { headers: string[], columns: { [name]: string[] } }.
  // Returns null if the text has fewer than two non-empty lines.
  function parseCsvText(text) {
    // Normalise line endings and split
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    if (lines.length < 2) return null;

    // Detect delimiter: whichever of tab / comma appears more in the first line
    const first = lines[0];
    const sep   = (first.match(/\t/g) || []).length > (first.match(/,/g) || []).length
      ? '\t' : ',';

    // Parse one line into fields, honouring RFC 4180 double-quoted fields
    function parseLine(line) {
      const fields = [];
      let i = 0;
      while (i <= line.length) {
        if (i === line.length) { fields.push(''); break; }
        if (line[i] === '"') {
          // Quoted field
          let val = '';
          i++;
          while (i < line.length) {
            if (line[i] === '"') {
              if (line[i + 1] === '"') { val += '"'; i += 2; }
              else { i++; break; }
            } else { val += line[i++]; }
          }
          // Advance past separator (or accept end-of-line)
          if (i < line.length && line[i] === sep) i++;
          fields.push(val);
        } else {
          // Unquoted field
          const end = line.indexOf(sep, i);
          if (end === -1) { fields.push(line.slice(i)); break; }
          fields.push(line.slice(i, end));
          i = end + 1;
          if (i === line.length) { fields.push(''); break; } // trailing sep → empty last field
        }
      }
      return fields;
    }

    // Build headers, deduplicating blank or repeated names
    const rawHeaders = parseLine(lines[0]).map((h) => h.trim());
    const seen = {};
    const headers = rawHeaders.map((h) => {
      const base = h || 'column';
      if (seen[base] === undefined) { seen[base] = 0; return base; }
      seen[base]++;
      return `${base}_${seen[base]}`;
    });

    if (!headers.length || headers.every((h) => !h)) return null;

    // Collect column data
    const columns = {};
    headers.forEach((h) => { columns[h] = []; });
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const row = parseLine(lines[i]);
      headers.forEach((h, j) => columns[h].push(j < row.length ? row[j] : ''));
    }

    return { headers, columns };
  }

  // ---------------------------------------------------------------------------
  // Tab management
  // ---------------------------------------------------------------------------

  function onTabClick(event) {
    const tabButton = event.target.closest('.tab');
    if (!tabButton) return;
    const tabId = Number(tabButton.dataset.tabId);
    if (event.target.closest('.tab-close')) {
      closeTab(tabId);
      return;
    }
    setActiveTab(tabId);
  }

  function renderTabs() {
    elements.tabs.innerHTML = '';
    state.tabs.forEach((tab) => {
      const button = document.createElement('button');
      button.type      = 'button';
      button.className = `tab${tab.id === state.activeTabId ? ' active' : ''}`;
      button.dataset.tabId = String(tab.id);

      const title   = document.createElement('span');
      title.className   = 'tab-title';
      title.textContent = tab.name;

      const close   = document.createElement('span');
      close.className = 'tab-close';
      close.setAttribute('aria-label', 'Close tab');
      close.textContent = '×';

      button.append(title, close);
      elements.tabs.appendChild(button);
    });
    updateEmptyState();
  }

  function setActiveTab(tabId) {
    const tab = state.tabs.find((t) => t.id === tabId);
    if (!tab) return;
    state.activeTabId = tabId;
    renderTabs();
    syncControlsForActiveTab();
    if (tab.lastPlot && tab.lastPlotKey) {
      renderPlot(tab, tab.lastPlot);
      updateStatus(tab);
    } else {
      plotFromSelections(tab, { useCache: true });
    }
  }

  function closeTab(tabId) {
    const index = state.tabs.findIndex((t) => t.id === tabId);
    if (index === -1) return;
    state.tabs.splice(index, 1);
    if (state.activeTabId === tabId) {
      state.activeTabId = state.tabs.length ? state.tabs[0].id : null;
    }
    renderTabs();
    syncControlsForActiveTab();
    if (!state.activeTabId) clearPlot();
  }

  function getActiveTab() {
    return state.tabs.find((t) => t.id === state.activeTabId) || null;
  }

  function updateEmptyState() {
    elements.emptyState.classList.toggle('hidden', state.tabs.length > 0);
  }

  // ---------------------------------------------------------------------------
  // Control synchronisation
  // ---------------------------------------------------------------------------

  function syncControlsForActiveTab() {
    const tab = getActiveTab();
    if (!tab) {
      disableControls(true);
      populateHduSelect([]);
      populateColumnSelects([]);
      updateStatus(null);
      clearHeaderPane();
      disablePlotControls();
      return;
    }

    populateHduSelect(tab.tableHdus, tab.selectedHduIndex);

    const selectedHdu = getSelectedHdu(tab);
    const columns     = selectedHdu && selectedHdu.columns ? selectedHdu.columns : [];
    populateColumnSelects(columns, tab.columns, tab.plotType || 'scatter');

    elements.plotTypeSelect.value   = tab.plotType  || 'scatter';
    elements.yerrTypeSelect.value   = tab.yerrType  || 'sigma';
    elements.yerrStyleSelect.value  = tab.yerrStyle || 'shade';
    elements.xScaleSelect.value     = tab.xScale    || 'linear';
    elements.yScaleSelect.value     = tab.yScale    || 'linear';
    elements.xerrTypeSelect.value   = tab.xerrType  || 'sigma';
    elements.customXLabel.value     = tab.customXLabel || '';
    elements.customYLabel.value     = tab.customYLabel || '';
    elements.customTitle.value      = tab.customTitle  || '';
    elements.yerrAsymToggle.checked = Boolean(tab.yerrAsym);
    elements.xerrAsymToggle.checked = Boolean(tab.xerrAsym);
    elements.histNBinsInput.value         = tab.histNBins  || 50;
    elements.histNBinsYInput.value        = tab.histNBinsY || 50;
    elements.histDensityScaleSelect.value = tab.histDensityScale || 'linear';
    elements.histMarginalToggle.checked   = Boolean(tab.histShowMarginal);

    // Sync tab state from UI (in case populate changed values)
    tab.plotType          = elements.plotTypeSelect.value  || 'scatter';
    tab.columns.x         = elements.xSelect.value         || null;
    tab.columns.y         = elements.ySelect.value         || null;
    tab.columns.yerr      = elements.yerrSelect.value      || null;
    tab.columns.xerr      = elements.xerrSelect.value      || null;
    tab.columns.yerrLower = elements.yerrLowerSelect.value || null;
    tab.columns.yerrUpper = elements.yerrUpperSelect.value || null;
    tab.columns.xerrLower = elements.xerrLowerSelect.value || null;
    tab.columns.xerrUpper = elements.xerrUpperSelect.value || null;
    tab.yerrType  = elements.yerrTypeSelect.value  || 'sigma';
    tab.yerrStyle = elements.yerrStyleSelect.value || 'shade';
    tab.xScale    = elements.xScaleSelect.value    || 'linear';
    tab.yScale    = elements.yScaleSelect.value    || 'linear';
    tab.xerrType  = elements.xerrTypeSelect.value  || 'sigma';
    tab.yerrAsym  = elements.yerrAsymToggle.checked;
    tab.xerrAsym  = elements.xerrAsymToggle.checked;
    tab.histNBins        = parseInt(elements.histNBinsInput.value,  10) || 50;
    tab.histNBinsY       = parseInt(elements.histNBinsYInput.value, 10) || 50;
    tab.histDensityScale = elements.histDensityScaleSelect.value || 'linear';
    tab.histShowMarginal = elements.histMarginalToggle.checked;

    updateStatus(tab);
    const controlsDisabled = !tab.tableHdus || !tab.tableHdus.length;
    disableControls(controlsDisabled);
    if (!controlsDisabled) {
      updateScatterControls(tab);
      updateErrorOptionControls(tab);
      updateYerrAsymUI(tab);
      updateXerrAsymUI(tab);
    }
    syncHeaderPane(tab);
    syncPlotControls(tab);
    updateExamineTable(tab);
    // If examine mode is on when switching to this tab, resume column loading
    if (state.examineMode && tab && !tab.examineLoading) examineLoadAllColumns(tab);
  }

  function disableControls(disabled) {
    elements.hduSelect.disabled      = disabled;
    elements.plotTypeSelect.disabled = disabled;
    elements.xSelect.disabled        = disabled;
    elements.ySelect.disabled        = disabled;
    elements.yerrSelect.disabled     = disabled;
    elements.xerrSelect.disabled     = disabled;
    elements.xScaleSelect.disabled   = disabled;
    elements.yScaleSelect.disabled   = disabled;
    elements.customXLabel.disabled   = disabled;
    elements.customYLabel.disabled   = disabled;
    elements.customTitle.disabled    = disabled;
    if (disabled) {
      elements.yerrTypeSelect.disabled  = true;
      elements.yerrStyleSelect.disabled = true;
      elements.xerrTypeSelect.disabled  = true;
      elements.yerrAsymToggle.disabled  = true;
      elements.xerrAsymToggle.disabled  = true;
      elements.yerrLowerSelect.disabled = true;
      elements.yerrUpperSelect.disabled = true;
      elements.xerrLowerSelect.disabled = true;
      elements.xerrUpperSelect.disabled = true;
      elements.histNBinsInput.disabled         = true;
      elements.histNBinsYInput.disabled        = true;
      elements.histDensityScaleSelect.disabled = true;
      elements.histMarginalToggle.disabled     = true;
      elements.controls.classList.remove('is-scatter', 'is-hist1d', 'is-hist2d');
    }
  }

  // ---------------------------------------------------------------------------
  // Column selects
  // ---------------------------------------------------------------------------

  function populateHduSelect(tableHdus, selectedIndex) {
    elements.hduSelect.innerHTML = '';
    if (!tableHdus || !tableHdus.length) {
      const p = new Option('No table HDU available', '', true, true);
      p.disabled = true;
      elements.hduSelect.appendChild(p);
      elements.hduSelect.disabled = true;
      return;
    }
    tableHdus.forEach((hdu) => {
      let label;
      if (hdu.dataType === 'CSVTable') {
        label = hdu.extName ? `CSV - ${hdu.extName}` : 'CSV Table';
      } else {
        const parts = [`HDU ${hdu.index}`, hdu.dataType];
        if (hdu.extName) parts.push(hdu.extName);
        label = parts.join(' - ');
      }
      elements.hduSelect.appendChild(new Option(label, String(hdu.index)));
    });
    elements.hduSelect.disabled = false;
    if (selectedIndex !== null && tableHdus.some((h) => h.index === selectedIndex)) {
      elements.hduSelect.value = String(selectedIndex);
    } else {
      elements.hduSelect.value = String(tableHdus[0].index);
    }
  }

  function populateColumnSelects(columns, selections = {}, plotType = 'scatter') {
    const xAllowNone = plotType === 'spec';
    populateSelect(elements.xSelect,    columns, selections.x,    xAllowNone);
    populateSelect(elements.ySelect,    columns, selections.y,    false);
    // FIX #6: uncertainty always defaults to None (allowNone=true, no forced selection)
    populateSelect(elements.yerrSelect,      columns, selections.yerr,       true);
    populateSelect(elements.xerrSelect,      columns, selections.xerr,       true);
    populateSelect(elements.yerrLowerSelect, columns, selections.yerrLower,  true);
    populateSelect(elements.yerrUpperSelect, columns, selections.yerrUpper,  true);
    populateSelect(elements.xerrLowerSelect, columns, selections.xerrLower,  true);
    populateSelect(elements.xerrUpperSelect, columns, selections.xerrUpper,  true);
  }

  function populateSelect(select, columns, selectedValue, allowNone) {
    select.innerHTML = '';
    if (allowNone) select.appendChild(new Option('None', ''));

    if (!columns || !columns.length) {
      const p = new Option('No columns', '', true, true);
      p.disabled = true;
      select.appendChild(p);
      select.disabled = true;
      return;
    }

    columns.forEach((col) => select.appendChild(new Option(col, col)));
    select.disabled = false;

    if (selectedValue && columns.includes(selectedValue)) {
      select.value = selectedValue;
    } else {
      // Default: always None for uncertainty selects, first column for x/y
      select.value = allowNone ? '' : columns[0];
    }
  }

  // ---------------------------------------------------------------------------
  // Scatter / error-option controls
  // ---------------------------------------------------------------------------

  // FIX #2: toggle is-scatter on the controls div so .scatter-only CSS works
  // FIX #3: hide yerrStyleContainer (step-only) in scatter mode
  function updateScatterControls(tab) {
    const isScatter = tab.plotType === 'scatter';
    const isHist1d  = tab.plotType === 'hist1d';
    const isHist2d  = tab.plotType === 'hist2d';
    const isHist    = isHist1d || isHist2d;
    elements.controls.classList.toggle('is-scatter', isScatter);
    elements.controls.classList.toggle('is-hist1d',  isHist1d);
    elements.controls.classList.toggle('is-hist2d',  isHist2d);

    if (isHist) {
      // All X error controls are unconditionally disabled in hist modes
      elements.xerrSelect.disabled      = true;
      elements.xerrAsymToggle.disabled  = true;
      elements.xerrLowerSelect.disabled = true;
      elements.xerrUpperSelect.disabled = true;
      elements.xerrTypeSelect.disabled  = true;
      elements.xerrTypeSelect.value     = 'sigma';
      // Hist-specific input controls
      elements.histNBinsInput.disabled         = false;
      elements.histNBinsYInput.disabled        = !isHist2d;
      elements.histDensityScaleSelect.disabled = !isHist2d;
      elements.histMarginalToggle.disabled     = !isHist2d;
      return;
    }

    // ── Scatter / Step modes ─────────────────────────────────────────
    const hasXerr = isScatter && (
      tab.xerrAsym
        ? Boolean(tab.columns && (tab.columns.xerrLower || tab.columns.xerrUpper))
        : Boolean(tab.columns && tab.columns.xerr)
    );
    elements.xerrSelect.disabled      = !isScatter || Boolean(tab.xerrAsym);
    elements.xerrAsymToggle.disabled  = !isScatter;
    elements.xerrLowerSelect.disabled = !isScatter || !tab.xerrAsym;
    elements.xerrUpperSelect.disabled = !isScatter || !tab.xerrAsym;
    elements.xerrTypeSelect.disabled  = !hasXerr;
    if (!hasXerr) elements.xerrTypeSelect.value = 'sigma';
    // Hist-specific controls disabled outside hist modes
    elements.histNBinsInput.disabled         = true;
    elements.histNBinsYInput.disabled        = true;
    elements.histDensityScaleSelect.disabled = true;
    elements.histMarginalToggle.disabled     = true;
  }

  // FIX #3: in scatter mode the Style sub-control disappears (handled via CSS
  //         .step-only / .controls.is-scatter .step-only { display: none })
  function updateErrorOptionControls(tab) {
    // Hist modes have no error controls at all
    const isHist = tab.plotType === 'hist1d' || tab.plotType === 'hist2d';
    if (isHist) {
      elements.yerrAsymToggle.disabled  = true;
      elements.yerrSelect.disabled      = true;
      elements.yerrLowerSelect.disabled = true;
      elements.yerrUpperSelect.disabled = true;
      elements.yerrTypeSelect.disabled  = true;
      elements.yerrStyleSelect.disabled = true;
      return;
    }

    const hasYerr = tab.yerrAsym
      ? Boolean(tab.columns && (tab.columns.yerrLower || tab.columns.yerrUpper))
      : Boolean(tab.columns && tab.columns.yerr);
    const isScatter = tab.plotType === 'scatter';

    elements.yerrAsymToggle.disabled  = false;
    elements.yerrSelect.disabled      = Boolean(tab.yerrAsym);
    elements.yerrLowerSelect.disabled = !tab.yerrAsym;
    elements.yerrUpperSelect.disabled = !tab.yerrAsym;
    elements.yerrTypeSelect.disabled  = !hasYerr;

    if (isScatter) {
      // In scatter, style is hidden and always treated as bars
      tab.yerrStyle = 'bars';
    } else {
      elements.yerrStyleSelect.disabled = !hasYerr;
      if (!hasYerr) {
        // Reset style to shade when there is no uncertainty
        elements.yerrStyleSelect.value = 'shade';
        tab.yerrStyle = 'shade';
      }
    }

    if (!hasYerr) elements.yerrTypeSelect.value = 'sigma';
  }

  // Show/hide symmetric vs asymmetric Y-error controls
  function updateYerrAsymUI(tab) {
    const isAsym = Boolean(tab && tab.yerrAsym);
    elements.yerrSelect.classList.toggle('hidden', isAsym);
    elements.yerrAsymCols.classList.toggle('hidden', !isAsym);
  }

  // Show/hide symmetric vs asymmetric X-error controls
  function updateXerrAsymUI(tab) {
    const isAsym = Boolean(tab && tab.xerrAsym);
    elements.xerrSelect.classList.toggle('hidden', isAsym);
    elements.xerrAsymCols.classList.toggle('hidden', !isAsym);
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  function onHduChange() {
    const tab = getActiveTab();
    if (!tab) return;
    const idx = Number(elements.hduSelect.value);
    tab.selectedHduIndex = Number.isNaN(idx) ? null : idx;
    tab.columnCache = {};
    tab.lastPlot    = null;
    tab.lastPlotKey = null;
    autoSelectColumns(tab);
    syncControlsForActiveTab();
    plotFromSelections(tab, { useCache: false });
  }

  function onPlotTypeChange() {
    const tab = getActiveTab();
    if (!tab) return;
    const newType = elements.plotTypeSelect.value || 'scatter';

    // FIX #5: when leaving scatter, reset xerr so colour/state doesn't bleed through
    if (newType !== 'scatter') {
      tab.columns.xerr      = null;
      tab.columns.xerrLower = null;
      tab.columns.xerrUpper = null;
      tab.xerrAsym = false;
      elements.xerrSelect.value       = '';
      elements.xerrAsymToggle.checked = false;
      updateXerrAsymUI(tab);
      // Also restore yerrStyle to whatever the select says (shade or bars)
      tab.yerrStyle = elements.yerrStyleSelect.value || 'shade';
    }

    // When entering hist modes, also clear y-error columns
    if (newType === 'hist1d' || newType === 'hist2d') {
      tab.columns.yerr      = null;
      tab.columns.yerrLower = null;
      tab.columns.yerrUpper = null;
      tab.yerrAsym = false;
      elements.yerrSelect.value       = '';
      elements.yerrAsymToggle.checked = false;
      updateYerrAsymUI(tab);
    }

    // When leaving step mode with X = None, auto-select the first numeric X column
    if (tab.plotType === 'spec' && newType !== 'spec' && !tab.columns.x) {
      const hdu = getSelectedHdu(tab);
      if (hdu && hdu.columns && hdu.columns.length) {
        const meta    = getColumnMeta(hdu);
        const numeric = meta.filter((m) => isNumericDescriptor(m.descriptor));
        tab.columns.x = (numeric.length > 0 ? numeric[0].name : hdu.columns[0]) || null;
      }
    }

    tab.plotType = newType;
    updateScatterControls(tab);
    updateErrorOptionControls(tab);
    syncControlsForActiveTab();
    plotFromSelections(tab, { useCache: false });
  }

  function onColumnChange() {
    const tab = getActiveTab();
    if (!tab) return;
    tab.columns = {
      x:         elements.xSelect.value         || null,
      y:         elements.ySelect.value         || null,
      yerr:      elements.yerrSelect.value      || null,
      xerr:      elements.xerrSelect.value      || null,
      yerrLower: elements.yerrLowerSelect.value || null,
      yerrUpper: elements.yerrUpperSelect.value || null,
      xerrLower: elements.xerrLowerSelect.value || null,
      xerrUpper: elements.xerrUpperSelect.value || null
    };
    tab.yerrType  = elements.yerrTypeSelect.value  || 'sigma';
    tab.yerrStyle = elements.yerrStyleSelect.value || 'shade';
    tab.xerrType  = elements.xerrTypeSelect.value  || 'sigma';
    updateErrorOptionControls(tab);
    updateScatterControls(tab);
    plotFromSelections(tab, { useCache: false });
  }

  function onErrorOptionsChange() {
    const tab = getActiveTab();
    if (!tab) return;
    tab.yerrType  = elements.yerrTypeSelect.value  || 'sigma';
    tab.yerrStyle = elements.yerrStyleSelect.value || 'shade';
    tab.xerrType  = elements.xerrTypeSelect.value  || 'sigma';
    plotFromSelections(tab, { useCache: false });
  }

  function onYerrAsymChange() {
    const tab = getActiveTab();
    if (!tab) return;
    tab.yerrAsym = elements.yerrAsymToggle.checked;
    updateYerrAsymUI(tab);
    updateErrorOptionControls(tab);
    plotFromSelections(tab, { useCache: false });
  }

  function onXerrAsymChange() {
    const tab = getActiveTab();
    if (!tab) return;
    tab.xerrAsym = elements.xerrAsymToggle.checked;
    updateXerrAsymUI(tab);
    updateScatterControls(tab);
    plotFromSelections(tab, { useCache: false });
  }

  function onHistOptionsChange() {
    const tab = getActiveTab();
    if (!tab) return;
    tab.histNBins        = parseInt(elements.histNBinsInput.value,  10) || 50;
    tab.histNBinsY       = parseInt(elements.histNBinsYInput.value, 10) || 50;
    tab.histDensityScale = elements.histDensityScaleSelect.value || 'linear';
    tab.histShowMarginal = elements.histMarginalToggle.checked;
    plotFromSelections(tab, { useCache: false });
  }

  function onScaleChange() {
    const tab = getActiveTab();
    if (!tab) return;
    tab.xScale = elements.xScaleSelect.value || 'linear';
    tab.yScale = elements.yScaleSelect.value || 'linear';
    if (tab.crosshair) { tab.crosshair.x = null; tab.crosshair.y = null; }
    plotFromSelections(tab, { useCache: false });
  }

  // ---------------------------------------------------------------------------
  // Examine mode
  // ---------------------------------------------------------------------------

  function onExamineToggle() {
    const tab = getActiveTab();
    state.examineMode = !state.examineMode;
    if (state.examineMode) {
      // Deactivate crosshair when entering examine mode
      if (tab && tab.crosshair) tab.crosshair.enabled = false;
      if (window.Plotly) window.Plotly.relayout(elements.plot,
        { dragmode: 'lasso', clickmode: 'event+select' });
      // Start background loading of all HDU columns for the examine table
      if (tab) examineLoadAllColumns(tab);
    } else {
      // Return to previous pan/zoom dragmode; clear selection visual
      if (window.Plotly) window.Plotly.relayout(elements.plot,
        { dragmode: state.dragMode, clickmode: 'event' });
      if (tab) updateExamineVisuals(tab);
    }
    syncPlotControls(tab);
  }

  function onSelectAll() {
    const tab = getActiveTab();
    if (!tab || !tab.lastSeries || !tab.lastSeries.origIndices) return;
    tab.lastSeries.origIndices.forEach((i) => tab.selectedIndices.add(i));
    updateExamineVisuals(tab);
    updateExamineTable(tab);
    syncPlotControls(tab);
  }

  function onDeselectAll() {
    const tab = getActiveTab();
    if (!tab) return;
    tab.selectedIndices.clear();
    updateExamineVisuals(tab);
    updateExamineTable(tab);
    syncPlotControls(tab);
  }

  function onExamineExportCSV() {
    const tab = getActiveTab();
    if (!tab || !tab.selectedIndices || tab.selectedIndices.size === 0) return;
    const hdu = getSelectedHdu(tab);
    if (!hdu || !hdu.columns || !hdu.columns.length) return;

    const allCols   = hdu.columns;
    const hduIdx    = tab.selectedHduIndex;
    const prefix    = `${hduIdx}:`;
    const selectedArr = Array.from(tab.selectedIndices).sort((a, b) => a - b);

    // Check if any columns still loading — warn but proceed with whatever is cached
    const hasUncached = allCols.some((c) => !tab.columnCache[prefix + c]);
    if (hasUncached) {
      setTabStatus(tab, 'warn', 'Some columns are still loading — export may contain blank values.');
    }

    // RFC 4180 CSV: quote fields that contain comma, double-quote, or newline
    function csvField(val) {
      const s = (val === null || val === undefined) ? '' : String(val);
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }

    const rows = [];

    // Header row: Row, col1, col2, …
    rows.push(['Row', ...allCols].map(csvField).join(','));

    // Data rows
    selectedArr.forEach((origIdx) => {
      const fields = [origIdx];
      allCols.forEach((c) => {
        const data = tab.columnCache[prefix + c];
        fields.push(data ? formatTableValue(data[origIdx]) : '');
      });
      rows.push(fields.map(csvField).join(','));
    });

    const csvText = rows.join('\r\n');
    const blob    = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    const stem    = (tab.name || 'examine').replace(/\.[^.]+$/, '');
    a.href     = url;
    a.download = `${stem}_selected.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);

    if (!hasUncached) {
      setTabStatus(tab, 'ok', `Exported ${selectedArr.length} row${selectedArr.length === 1 ? '' : 's'} to CSV.`);
    }
  }

  function onPlotSelected(event) {
    if (!state.examineMode) return;
    const tab = getActiveTab();
    if (!tab || !tab.lastSeries || tab.lastSeries._histMode) return;
    if (!event || !event.points || !event.points.length) return;

    const origIndices = tab.lastSeries.origIndices;
    if (!origIndices) return;

    // Collect unique trace-point-indices from all lassoed/clicked points.
    // Multiple traces (shade band, main, tick-markers) may contribute the same pointIndex.
    const traceSet = new Set(event.points.map((p) => p.pointIndex));
    traceSet.forEach((ti) => {
      const origIdx = origIndices[ti];
      if (origIdx === undefined) return;
      if (_shiftKeyDown) {
        tab.selectedIndices.delete(origIdx);
      } else {
        tab.selectedIndices.add(origIdx);
      }
    });

    updateExamineTable(tab);
    syncPlotControls(tab);
    // Defer Plotly.react until Plotly has fully resolved the lasso event internals.
    // This single re-render clears the lasso outline and paints our overlay atomically.
    requestAnimationFrame(() => updateExamineVisuals(tab));
  }

  function onPlotDeselect() {
    // With the overlay-trace approach our highlight is immune to Plotly's deselect.
    // Still call updateExamineVisuals so the overlay re-renders cleanly if needed.
    const tab = getActiveTab();
    if (tab && state.examineMode) updateExamineVisuals(tab);
  }

  // Build a single "circle-open" scatter trace that marks selected points.
  // Returns null when there is nothing to show (no selection, hist mode, etc.).
  function buildExamineOverlayTrace(tab) {
    if (!state.examineMode) return null;
    if (!tab || !tab.selectedIndices || tab.selectedIndices.size === 0) return null;
    if (!tab.lastSeries || tab.lastSeries._histMode || !tab.lastSeries.origIndices) return null;

    const origIndices = tab.lastSeries.origIndices;
    const selX = [], selY = [];
    for (let ti = 0; ti < origIndices.length; ti++) {
      if (tab.selectedIndices.has(origIndices[ti])) {
        selX.push(tab.lastSeries.x[ti]);
        selY.push(tab.lastSeries.y[ti]);
      }
    }
    if (!selX.length) return null;

    // Use a warm accent colour that pops in both light and dark themes.
    const accent = state.darkMode ? '#f5c542' : '#e07b1e';
    return {
      type:            'scatter',
      mode:            'markers',
      x:               selX,
      y:               selY,
      xaxis:           'x',
      yaxis:           'y',
      marker: {
        symbol: 'circle-open',
        size:   10,
        color:  accent,
        line:   { width: 2, color: accent }
      },
      hoverinfo:       'skip',
      showlegend:      false,
      _examineOverlay: true   // private flag so we can remove it before re-renders
    };
  }

  // Apply (or clear) the selection highlight overlay on the plot.
  // Uses a dedicated overlay trace + Plotly.react so our highlight survives Plotly's
  // internal selectedpoints resets that occur when a new lasso drag starts/ends.
  function updateExamineVisuals(tab) {
    if (!window.Plotly || !tab || !tab.lastPlot || !tab.lastSeries) return;
    if (tab.lastSeries._histMode) return;

    // Remove any previous overlay trace from lastPlot.data
    tab.lastPlot.data = tab.lastPlot.data.filter((tr) => !tr._examineOverlay);

    // After a lasso, Plotly writes selectedpoints in-place onto gd.data[i] (same reference
    // as tab.lastPlot.data[i]).  Deleting it here removes the "unselected points dimmed"
    // effect.  Also bump selectionrevision so the _tracePreGUI restore mechanism does not
    // re-apply the stored indices when Plotly.react runs.
    tab.lastPlot.data.forEach((tr) => { delete tr.selectedpoints; });
    tab.lastPlot.layout.selectionrevision = Date.now();

    // Build a fresh overlay trace (or nothing if selection is empty / mode is off)
    const overlayTrace = buildExamineOverlayTrace(tab);
    if (overlayTrace) tab.lastPlot.data.push(overlayTrace);

    // Keep layout dragmode/clickmode in sync
    tab.lastPlot.layout.dragmode  = tab.crosshair && tab.crosshair.enabled ? false
                                   : state.examineMode ? 'lasso'
                                   : state.dragMode;
    tab.lastPlot.layout.clickmode = state.examineMode ? 'event+select' : 'event';

    // Plotly stores gd.layout as the same object reference we pass in, so any lasso
    // interaction mutates tab.lastPlot.layout.selections = [polygon] in place.
    // Clearing it here forces Plotly to diff [] vs [polygon] and redraw the selections
    // layer, which removes the lasso outline.
    tab.lastPlot.layout.selections = [];

    // Re-render — clears the lasso outline and paints our overlay trace atomically
    window.Plotly.react(elements.plot, tab.lastPlot.data, tab.lastPlot.layout, tab.lastPlot.config)
      .then(() => bindPlotEvents());
  }

  // Rebuild the examine table for the active tab.
  // Header row always shows ALL columns from hdu.columns.
  // Uncached column cells show "…" until the background loader fills them in.
  // Data rows are populated only when points are selected.
  function updateExamineTable(tab) {
    const thead = elements.examineTableHead;
    const tbody = elements.examineTableBody;
    const empty = elements.examineEmpty;

    // No tab or no table HDUs — clear everything
    if (!tab || !tab.tableHdus || !tab.tableHdus.length) {
      thead.innerHTML = '';
      tbody.innerHTML = '';
      empty.textContent = 'No file loaded.';
      empty.classList.remove('hidden');
      return;
    }

    const hdu    = getSelectedHdu(tab);
    const hduIdx = tab.selectedHduIndex;
    const prefix = `${hduIdx}:`;

    // ALL column names from the HDU (not just those already cached)
    const allCols = (hdu && hdu.columns) ? hdu.columns : [];

    // Build column header row (always shown)
    thead.innerHTML = '';
    const hr = thead.insertRow();
    const thRow = document.createElement('th');
    thRow.textContent = 'Row';
    hr.appendChild(thRow);
    allCols.forEach((c) => {
      const th = document.createElement('th');
      th.textContent = c;
      hr.appendChild(th);
    });

    // Trigger background loading of any uncached columns so cells fill in progressively
    const hasUncached = allCols.some((c) => !tab.columnCache[prefix + c]);
    if (hasUncached && !tab.examineLoading) examineLoadAllColumns(tab);

    // If no selection, show empty state below the headers
    const nSelected = tab.selectedIndices ? tab.selectedIndices.size : 0;
    if (nSelected === 0) {
      tbody.innerHTML = '';
      empty.textContent = 'No points selected. Use Examine mode to select points on the plot.';
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');

    // Sort selected original-row indices ascending
    const selectedArr = Array.from(tab.selectedIndices).sort((a, b) => a - b);
    const MAX_ROWS    = 500;
    const rowsToShow  = selectedArr.slice(0, MAX_ROWS);

    const fragment = document.createDocumentFragment();
    rowsToShow.forEach((origIdx) => {
      const tr = document.createElement('tr');
      const tdIdx = document.createElement('td');
      tdIdx.textContent = origIdx;
      tr.appendChild(tdIdx);
      allCols.forEach((c) => {
        const td   = document.createElement('td');
        const data = tab.columnCache[prefix + c];
        if (!data) {
          td.textContent = '…';
          td.style.color = 'var(--muted)';
        } else {
          td.textContent = formatTableValue(data[origIdx]);
        }
        tr.appendChild(td);
      });
      fragment.appendChild(tr);
    });

    if (selectedArr.length > MAX_ROWS) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = allCols.length + 1;
      td.style.cssText = 'text-align:center;color:var(--muted);padding:10px';
      td.textContent = `… and ${selectedArr.length - MAX_ROWS} more rows (showing first ${MAX_ROWS})`;
      tr.appendChild(td);
      fragment.appendChild(tr);
    }

    tbody.innerHTML = '';
    tbody.appendChild(fragment);
  }

  // Background-load all HDU columns not yet in the cache, refreshing the examine
  // table after each one so cells fill in progressively.
  // Uses tab.examineLoading as a mutex so only one sequence runs per tab at a time.
  function examineLoadAllColumns(tab) {
    if (tab.examineLoading) return;
    const hdu = getSelectedHdu(tab);
    if (!hdu || !hdu.columns || !hdu.columns.length) return;

    tab.examineLoading = true;

    (async () => {
      try {
        for (const colName of hdu.columns) {
          const cacheKey = `${tab.selectedHduIndex}:${colName}`;
          if (!tab.columnCache[cacheKey]) {
            try { await getColumnValues(tab, hdu, colName); } catch (_) { /* skip */ }
          }
          // Refresh table after each newly-loaded column if this tab is still active
          if (getActiveTab() === tab) updateExamineTable(tab);
        }
      } finally {
        tab.examineLoading = false;
        // Final refresh to clear any remaining "…" cells
        if (getActiveTab() === tab) updateExamineTable(tab);
      }
    })();
  }

  // Format a data value for display in the examine table (more precision than axis labels).
  function formatTableValue(val) {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'string') return val;
    if (!Number.isFinite(val)) return String(val);
    if (val === 0) return '0';
    // 6 significant figures, strip trailing zeros
    const s = parseFloat(val.toPrecision(6)).toString();
    return s;
  }

  // ---------------------------------------------------------------------------
  // Column auto-selection
  // ---------------------------------------------------------------------------

  // FIX #6: never auto-select uncertainty columns – they default to None
  function autoSelectColumns(tab) {
    const hdu = getSelectedHdu(tab);
    if (!hdu || !hdu.columns || !hdu.columns.length) {
      tab.columns = { x: null, y: null, yerr: null, xerr: null,
                      yerrLower: null, yerrUpper: null, xerrLower: null, xerrUpper: null };
      return;
    }
    const meta    = getColumnMeta(hdu);
    const numeric = meta.filter((m) => isNumericDescriptor(m.descriptor));

    tab.columns.yerr      = null;   // always None by default
    tab.columns.xerr      = null;
    tab.columns.yerrLower = null;
    tab.columns.yerrUpper = null;
    tab.columns.xerrLower = null;
    tab.columns.xerrUpper = null;

    if (numeric.length >= 2) {
      tab.columns.x = numeric[0].name;
      tab.columns.y = numeric[1].name;
      return;
    }
    tab.columns.x = hdu.columns[0];
    tab.columns.y = hdu.columns[1] || hdu.columns[0];
  }

  function getSelectedHdu(tab) {
    if (!tab || tab.selectedHduIndex === null) return null;
    return tab.tableHdus.find((h) => h.index === tab.selectedHduIndex) || null;
  }

  // ---------------------------------------------------------------------------
  // Plotting pipeline
  // ---------------------------------------------------------------------------

  async function plotFromSelections(tab, options = {}) {
    if (!tab || tab.id !== state.activeTabId) return;

    if (!tab.tableHdus.length) {
      tab.lastSeries = null;
      clearPlot();
      return;
    }
    const isHist1d = tab.plotType === 'hist1d';
    const isHist2d = tab.plotType === 'hist2d';
    const isHist   = isHist1d || isHist2d;
    const needsY   = !isHist1d;

    const isStepSpec   = tab.plotType === 'spec';
    const xRequired    = !isStepSpec;   // step mode allows X = None (use row index)

    if ((xRequired && !tab.columns.x) || (needsY && !tab.columns.y)) {
      const msg = isHist1d
        ? 'Select a data column to plot.'
        : isStepSpec
          ? 'Select a Y column to plot.'
          : 'Select X and Y columns to plot.';
      setTabStatus(tab, 'warn', msg);
      tab.lastSeries = null;
      clearPlot();
      return;
    }

    // FIX #5: include plotType and yerrStyle in the cache key so switching modes
    // never re-uses a stale plot that would carry over colour state.
    const plotKey = [
      tab.selectedHduIndex,
      tab.columns.x,
      isHist1d ? '' : (tab.columns.y || ''),
      isHist ? '' : (tab.yerrAsym ? 'ya' : ''),
      isHist ? '' : (tab.yerrAsym ? (tab.columns.yerrLower || '') : (tab.columns.yerr || '')),
      isHist ? '' : (tab.yerrAsym ? (tab.columns.yerrUpper || '') : ''),
      isHist ? '' : (tab.xerrAsym ? 'xa' : ''),
      isHist ? '' : (tab.xerrAsym ? (tab.columns.xerrLower || '') : (tab.columns.xerr || '')),
      isHist ? '' : (tab.xerrAsym ? (tab.columns.xerrUpper || '') : ''),
      isHist ? '' : tab.yerrType,
      isHist ? '' : tab.xerrType,
      isHist ? '' : tab.yerrStyle,
      tab.xScale,
      isHist1d ? '' : tab.yScale,
      tab.plotType,
      isHist ? (tab.histNBins || 50) : '',
      isHist2d ? (tab.histNBinsY || 50) : '',
      isHist2d ? (tab.histDensityScale || 'linear') : '',
      isHist2d ? (tab.histShowMarginal ? 'marg' : '') : '',
      tab.customXLabel || '',
      isHist1d ? '' : (tab.customYLabel || ''),
      tab.customTitle  || '',
      state.darkMode ? 'dark' : 'light'
    ].join('|');

    if (options.useCache && tab.lastPlotKey === plotKey && tab.lastPlot) {
      renderPlot(tab, tab.lastPlot);
      return;
    }

    const token = ++tab.plotToken;
    setTabStatus(tab, 'info', 'Loading columns for plot...');

    try {
      const hdu = getSelectedHdu(tab);
      if (!hdu || !hdu.dataUnit || typeof hdu.dataUnit.getColumn !== 'function') {
        setTabStatus(tab, 'error', 'Selected HDU is not a table.');
        clearPlot();
        return;
      }

      // In step mode with X = None, defer index generation until Y length is known.
      let xColumn = null;
      if (tab.columns.x) {
        xColumn = await getColumnValues(tab, hdu, tab.columns.x);
        if (token !== tab.plotToken) return;
      }

      let yColumn = null;
      if (!isHist1d && tab.columns.y) {
        yColumn = await getColumnValues(tab, hdu, tab.columns.y);
        if (token !== tab.plotToken) return;
      }

      // ── Histogram pipeline ───────────────────────────────────────────
      if (isHist) {
        const xRaw = makeNumericArray(toArray(xColumn));
        const yRaw = yColumn ? makeNumericArray(toArray(yColumn)) : null;

        const plotSpec = isHist1d
          ? buildHist1dSpec(tab, xRaw)
          : buildHist2dSpec(tab, xRaw, yRaw);

        if (!plotSpec) {
          setTabStatus(tab, 'warn', 'Not enough valid data to build histogram.');
          tab.lastSeries = null;
          clearPlot();
          return;
        }

        const xFiltered = xRaw.filter((v) => Number.isFinite(v));
        const yFiltered = (!isHist1d && yRaw) ? yRaw.filter((v) => Number.isFinite(v)) : null;
        tab.lastSeries = {
          x: xFiltered,
          y: yFiltered,
          xLower: null, xUpper: null, yLower: null, yUpper: null,
          xerrPlus: null, yerrPlus: null,
          validYerr: 0, dropped: xRaw.length - xFiltered.length,
          _histMode: true,
          _hist1d:   isHist1d
        };
        tab.lastPlotKey = plotKey;
        tab.lastPlot    = plotSpec;

        renderPlot(tab, plotSpec);
        syncPlotControls(tab);
        const binStr = isHist2d
          ? `${tab.histNBins || 50}×${tab.histNBinsY || 50}`
          : String(tab.histNBins || 50);
        setTabStatus(tab, 'ok',
          `Histogram: ${xFiltered.length} points, ${binStr} bins.`);
        return;
      }

      // Y-error columns — symmetric or asymmetric
      let yerrColumn = null, yerrLowerColumn = null, yerrUpperColumn = null;
      if (tab.yerrAsym) {
        if (tab.columns.yerrLower) yerrLowerColumn = await getColumnValues(tab, hdu, tab.columns.yerrLower);
        if (tab.columns.yerrUpper) yerrUpperColumn = await getColumnValues(tab, hdu, tab.columns.yerrUpper);
      } else if (tab.columns.yerr) {
        yerrColumn = await getColumnValues(tab, hdu, tab.columns.yerr);
      }

      // X-error columns — scatter only; symmetric or asymmetric
      let xerrColumn = null, xerrLowerColumn = null, xerrUpperColumn = null;
      if (tab.plotType === 'scatter') {
        if (tab.xerrAsym) {
          if (tab.columns.xerrLower) xerrLowerColumn = await getColumnValues(tab, hdu, tab.columns.xerrLower);
          if (tab.columns.xerrUpper) xerrUpperColumn = await getColumnValues(tab, hdu, tab.columns.xerrUpper);
        } else if (tab.columns.xerr) {
          xerrColumn = await getColumnValues(tab, hdu, tab.columns.xerr);
        }
      }

      if (token !== tab.plotToken) return;   // superseded by a newer call

      // Step mode with X = None: generate row-index array [0, 1, …, N-1]
      if (!xColumn && isStepSpec) {
        const nRows = yColumn
          ? toArray(yColumn).length
          : (hdu.dataUnit && hdu.dataUnit.rows != null ? hdu.dataUnit.rows : 0);
        xColumn = Array.from({ length: nRows }, (_, i) => i);
      }

      const xRaw = makeNumericArray(toArray(xColumn));
      const yRaw = makeNumericArray(toArray(yColumn));

      const xScaled = prepareAxisValues(xRaw, tab.xScale);
      const yScaled = prepareAxisValues(yRaw, tab.yScale);

      // Y bounds — asymmetric allows one column to be absent (treat missing side as σ=0)
      let yBounds = { lower: null, upper: null };
      if (tab.yerrAsym && (yerrLowerColumn || yerrUpperColumn)) {
        const nY = yRaw.length;
        const yerrLow  = yerrLowerColumn
          ? normalizeErrorValues(makeNumericArray(toArray(yerrLowerColumn)), tab.yerrType)
          : new Array(nY).fill(0);
        const yerrHigh = yerrUpperColumn
          ? normalizeErrorValues(makeNumericArray(toArray(yerrUpperColumn)), tab.yerrType)
          : new Array(nY).fill(0);
        yBounds = prepareAsymBounds(yRaw, yerrLow, yerrHigh, tab.yScale);
      } else if (!tab.yerrAsym && yerrColumn) {
        const yerrValues = normalizeErrorValues(makeNumericArray(toArray(yerrColumn)), tab.yerrType);
        yBounds = prepareBounds(yRaw, yerrValues, tab.yScale);
      }

      // X bounds — same one-sided tolerance as Y
      let xBounds = { lower: null, upper: null };
      if (tab.xerrAsym && (xerrLowerColumn || xerrUpperColumn)) {
        const nX = xRaw.length;
        const xerrLow  = xerrLowerColumn
          ? normalizeErrorValues(makeNumericArray(toArray(xerrLowerColumn)), tab.xerrType)
          : new Array(nX).fill(0);
        const xerrHigh = xerrUpperColumn
          ? normalizeErrorValues(makeNumericArray(toArray(xerrUpperColumn)), tab.xerrType)
          : new Array(nX).fill(0);
        xBounds = prepareAsymBounds(xRaw, xerrLow, xerrHigh, tab.xScale);
      } else if (!tab.xerrAsym && xerrColumn) {
        const xerrValues = normalizeErrorValues(makeNumericArray(toArray(xerrColumn)), tab.xerrType);
        xBounds = prepareBounds(xRaw, xerrValues, tab.xScale);
      }

      const series = buildSeries(
        xScaled, yScaled,
        yBounds.lower, yBounds.upper,
        xBounds.lower, xBounds.upper,
        tab.plotType === 'scatter'
      );

      if (!series.x.length) {
        setTabStatus(tab, 'warn', 'No valid numeric points to plot.');
        tab.lastSeries = null;
        clearPlot();
        return;
      }

      const plotSpec   = buildPlotSpec(tab, series);
      tab.lastPlotKey  = plotKey;
      tab.lastPlot     = plotSpec;
      // Compute which trace index is the main data trace (used by examine selection overlay)
      const _isShade = (series.validYerr > 0) && (tab.yerrStyle || 'shade') === 'shade' && tab.plotType !== 'scatter';
      tab.lastSeries   = { ...series, mainTraceIdx: _isShade ? 2 : 0 };

      renderPlot(tab, plotSpec);
      syncPlotControls(tab);

      const notes = [];
      if (series.dropped)      notes.push(`Dropped ${series.dropped} invalid rows.`);
      if (series.droppedYerr)  notes.push(`Ignored ${series.droppedYerr} invalid error values.`);
      setTabStatus(tab, notes.length ? 'warn' : 'ok',
        `Plotted ${series.x.length} points.${notes.length ? ' ' + notes.join(' ') : ''}`);
    } catch (_) {
      setTabStatus(tab, 'error', 'Failed to render the plot.');
      tab.lastSeries = null;
      clearPlot();
    }
  }

  // ---------------------------------------------------------------------------
  // Plot spec builder
  // ---------------------------------------------------------------------------

  function buildPlotSpec(tab, series) {
    const plotType    = tab.plotType || 'spec';
    const isScatter   = plotType === 'scatter';
    const useStep     = !isScatter;
    const lineShape   = useStep ? 'hvh' : 'linear';
    const mode        = isScatter ? 'markers' : 'lines';
    const showTicks   = useStep && series.x.length <= 20000;
    const hasYerr     = Boolean(series.yLower && series.yUpper && series.validYerr > 0);
    const hasXerr     = Boolean(isScatter && series.xLower && series.xUpper);
    const useGl       = series.x.length > 50000 && !hasYerr && !useStep;

    const theme = getThemeColors();

    // FIX #5: include plotType in uirevision so Plotly doesn't bleed styles across type switches
    const uirevision = `${tab.id}-${plotType}`;

    const traces = [];

    // Shaded uncertainty band (step mode only)
    if (hasYerr && tab.yerrStyle === 'shade' && !isScatter) {
      // Null slots mean the error is invalid at that point. Replace them with the
      // corresponding y value so the band collapses to zero width there instead of
      // letting Plotly's fill:tonexty bridge across the gap and fill the wrong region.
      const shadeUpper = series.yUpper.map((v, i) => (v === null ? series.y[i] : v));
      const shadeLower = series.yLower.map((v, i) => (v === null ? series.y[i] : v));
      traces.push(
        {
          x: series.x, y: shadeUpper,
          type: 'scatter', mode: 'lines',
          line: { color: theme.shadeLine, width: 0, shape: lineShape },
          hoverinfo: 'skip', showlegend: false
        },
        {
          x: series.x, y: shadeLower,
          type: 'scatter', mode: 'lines',
          line: { color: theme.shadeLine, width: 0, shape: lineShape },
          fill: 'tonexty',
          fillcolor: theme.shadeColor,
          hoverinfo: 'skip', showlegend: false
        }
      );
    }

    // Main trace
    const trace = {
      x: series.x,
      y: series.y,
      type:   useGl ? 'scattergl' : 'scatter',
      mode,
      // FIX #4 / #5: always set explicit colours so nothing carries over
      line:   { color: theme.lineColor,   width: 2, shape: lineShape },
      marker: { color: theme.markerColor, size: 5,  opacity: 0.80 }
    };

    if (hasYerr && (tab.yerrStyle === 'bars' || isScatter)) {
      const errColor = isScatter ? theme.errScatterColor : theme.errStepColor;
      trace.error_y = {
        type:        'data',
        array:       series.yerrPlus,
        arrayminus:  series.yerrMinus,
        symmetric:   false,
        visible:     true,
        color:       errColor,
        thickness:   isScatter ? 1 : 1.5,
        width:       isScatter ? 0 : undefined   // 0 = no caps in scatter
      };
    }

    if (hasXerr) {
      trace.error_x = {
        type:       'data',
        array:      series.xerrPlus,
        arrayminus: series.xerrMinus,
        symmetric:  false,
        visible:    true,
        color:      theme.errScatterColor,
        thickness:  1,
        width:      0   // no caps in scatter
      };
    }

    traces.push(trace);

    // Tick marks at data points (step mode with few points).
    // Circles are used instead of vertical bars so they can't be confused with error caps.
    // When an error column is selected, points with invalid error values turn red.
    if (showTicks) {
      const markerColors = hasYerr
        ? series.yerrPlus.map((v) => (v === null ? theme.tickMarkerInvalidColor : theme.tickMarkerColor))
        : null;
      traces.push({
        x: series.x, y: series.y,
        type: 'scatter', mode: 'markers',
        marker: {
          symbol: 'circle', size: 6,
          color: markerColors || theme.tickMarkerColor,
          line: { width: 0 }
        },
        hoverinfo: 'skip', showlegend: false
      });
    }

    const layout = {
      uirevision,
      title:  { text: (tab.customTitle || '').trim() || tab.name, font: { size: 20, color: theme.fontColor } },
      margin: { l: 64, r: 24, t: 52, b: 56 },
      paper_bgcolor: theme.paperBg,
      plot_bgcolor:  theme.plotBg,
      font:   { size: 13, color: theme.fontColor, family: '"Space Grotesk", sans-serif' },
      xaxis: {
        title:     { text: resolveAxisLabel(tab, 'x'), font: { size: 14 } },
        gridcolor: theme.gridColor,
        linecolor: theme.gridColor,
        tickcolor: theme.axisColor,
        color:     theme.axisColor,
        tickfont:  { size: 13 },
        zeroline:  false,
        type:      tab.xScale === 'log10' ? 'log' : 'linear',
        uirevision: `${tab.columns.x || 'x'}|${tab.xScale || 'linear'}`,
        ...buildAxisFormat(tab.xScale)
      },
      yaxis: {
        title:     { text: resolveAxisLabel(tab, 'y'), font: { size: 14 } },
        gridcolor: theme.gridColor,
        linecolor: theme.gridColor,
        tickcolor: theme.axisColor,
        color:     theme.axisColor,
        tickfont:  { size: 13 },
        zeroline:  false,
        type:      tab.yScale === 'log10' ? 'log' : 'linear',
        uirevision: `${tab.columns.y || 'y'}|${tab.yScale || 'linear'}`,
        ...buildAxisFormat(tab.yScale)
      },
      showlegend: false,
      dragmode:   tab.crosshair && tab.crosshair.enabled ? false
                : state.examineMode ? 'lasso'
                : state.dragMode
    };

    if (
      tab.crosshair &&
      Number.isFinite(tab.crosshair.x) && Number.isFinite(tab.crosshair.y)
    ) {
      layout.shapes      = buildCrosshairShapes(tab.crosshair.x, tab.crosshair.y, theme);
      layout.annotations = [buildCrosshairAnnotation(tab, tab.crosshair.x, tab.crosshair.y, theme)];
    } else {
      layout.shapes      = [];
      layout.annotations = [];
    }

    const config = {
      responsive:      true,
      displaylogo:     false,
      displayModeBar:  false   // modebar replaced by toolbar buttons
    };

    return { data: traces, layout, config };
  }

  // ---------------------------------------------------------------------------
  // Axis helpers
  // ---------------------------------------------------------------------------

  // Resolve the effective axis label: custom input if set, otherwise the column name.
  // Scale transformations are intentionally NOT appended to the label.
  function resolveAxisLabel(tab, axis) {
    if (axis === 'x') {
      const custom = (tab.customXLabel || '').trim();
      if (custom) return custom;
      if (!tab.columns.x && tab.plotType === 'spec') return 'Row Number';
      return tab.columns.x || 'X';
    }
    return (tab.customYLabel || '').trim() || tab.columns.y || 'Y';
  }

  // Legacy shim — callers that still pass (label, scale) just get the label back.
  function formatAxisTitle(label) { return label; }

  function buildAxisFormat(scale) {
    if (scale === 'log10') {
      // Do NOT set tickformat here — '.0f' or similar rounds small values to "0".
      // Let Plotly format log-axis ticks naturally; exponentformat ensures clean notation.
      return { exponentformat: 'e' };
    }
    return {
      exponentformat:    'e',
      separatethousands: false,
      tickformatstops: [
        { dtickrange: [null,  0.001], value: '.2~e' },  // very small spacing → sci notation
        { dtickrange: [0.001, 0.1  ], value: '.3~f' },  // three decimal places
        { dtickrange: [0.1,   10   ], value: '.2~f' },  // two decimal places
        { dtickrange: [10,    1e5  ], value: '.0f'  },  // integers
        { dtickrange: [1e5,   null ], value: '.3~e' },  // large spacing → sci notation
      ]
    };
  }

  // ---------------------------------------------------------------------------
  // Crosshair
  // ---------------------------------------------------------------------------

  function buildCrosshairShapes(xValue, yValue, theme) {
    const col = theme ? theme.axisColor : 'rgba(26,27,30,0.5)';
    return [
      {
        type: 'line', x0: xValue, x1: xValue, y0: 0, y1: 1,
        xref: 'x', yref: 'paper',
        line: { color: col, width: 1, dash: 'dot' }
      },
      {
        type: 'line', x0: 0, x1: 1, y0: yValue, y1: yValue,
        xref: 'paper', yref: 'y',
        line: { color: col, width: 1, dash: 'dot' }
      }
    ];
  }

  function buildCrosshairAnnotation(tab, xValue, yValue, theme) {
    const xLabel = resolveAxisLabel(tab, 'x');
    const yLabel = resolveAxisLabel(tab, 'y');
    const text   = `${xLabel}: ${formatAxisValue(xValue)}<br>${yLabel}: ${formatAxisValue(yValue)}`;
    const bg     = state.darkMode ? 'rgba(8,10,18,0.96)'   : 'rgba(255,255,255,0.92)';
    const border = state.darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(26,27,30,0.2)';
    return {
      x: xValue, y: yValue, xref: 'x', yref: 'y',
      text, showarrow: true, arrowhead: 4, ax: 20, ay: -30,
      bgcolor: bg, bordercolor: border, borderwidth: 1,
      font: { size: 11, color: theme ? theme.fontColor : '#1a1b1e' }
    };
  }

  function onCrosshairToggle() {
    const tab = getActiveTab();
    if (!tab) return;
    tab.crosshair.enabled = !tab.crosshair.enabled;
    if (!tab.crosshair.enabled) {
      // Exit crosshair mode — keep the overlay, restore drag (examine or pan/zoom)
      const dm = state.examineMode ? 'lasso' : state.dragMode;
      const cm = state.examineMode ? 'event+select' : 'event';
      if (window.Plotly) window.Plotly.relayout(elements.plot, { dragmode: dm, clickmode: cm });
    } else {
      // Enter crosshair mode — deactivate examine, disable drag
      state.examineMode = false;
      if (window.Plotly) window.Plotly.relayout(elements.plot, { dragmode: false, clickmode: 'event' });
      if (Number.isFinite(tab.crosshair.x) && Number.isFinite(tab.crosshair.y)) {
        applyCrosshair(tab);
      }
    }
    syncPlotControls(tab);
  }

  function setCrosshair(tab, x, y) {
    tab.crosshair.x = x;
    tab.crosshair.y = y;
    applyCrosshair(tab);
    updateCrosshairReadout(tab);
    // Keep the cached plot spec in sync so tab switching restores the overlay
    if (tab.lastPlot && tab.lastPlot.layout) {
      const theme = getThemeColors();
      tab.lastPlot.layout.shapes      = buildCrosshairShapes(x, y, theme);
      tab.lastPlot.layout.annotations = [buildCrosshairAnnotation(tab, x, y, theme)];
    }
  }

  function onClearCrosshair() {
    const tab = getActiveTab();
    if (!tab) return;
    tab.crosshair.x = null;
    tab.crosshair.y = null;
    clearCrosshair();
    if (tab.lastPlot && tab.lastPlot.layout) {
      tab.lastPlot.layout.shapes      = [];
      tab.lastPlot.layout.annotations = [];
    }
    syncPlotControls(tab);
  }

  function applyCrosshair(tab) {
    if (!window.Plotly || !tab || !tab.crosshair || !tab.crosshair.enabled) return;
    if (!Number.isFinite(tab.crosshair.x) || !Number.isFinite(tab.crosshair.y)) return;
    const theme = getThemeColors();
    window.Plotly.relayout(elements.plot, {
      shapes:      buildCrosshairShapes(tab.crosshair.x, tab.crosshair.y, theme),
      annotations: [buildCrosshairAnnotation(tab, tab.crosshair.x, tab.crosshair.y, theme)]
    });
  }

  function clearCrosshair() {
    if (!window.Plotly) return;
    window.Plotly.relayout(elements.plot, { shapes: [], annotations: [] });
  }

  function updateCrosshairReadout(tab) {
    if (!elements.crosshairReadout) return;
    if (!tab || !tab.crosshair) {
      elements.crosshairReadout.textContent = 'Crosshair off';
      return;
    }
    if (Number.isFinite(tab.crosshair.x) && Number.isFinite(tab.crosshair.y)) {
      // Show coordinates whenever a crosshair is placed, regardless of mode
      const xLabel = resolveAxisLabel(tab, 'x');
      const yLabel = resolveAxisLabel(tab, 'y');
      elements.crosshairReadout.textContent =
        `${xLabel}: ${formatAxisValue(tab.crosshair.x)}  |  ${yLabel}: ${formatAxisValue(tab.crosshair.y)}`;
      return;
    }
    elements.crosshairReadout.textContent =
      tab.crosshair.enabled ? 'Click to place crosshair' : 'Crosshair off';
  }

  // ---------------------------------------------------------------------------
  // Plot render / clear
  // ---------------------------------------------------------------------------

  function renderPlot(tab, plotSpec) {
    if (!window.Plotly) return;
    // Sync dragmode and crosshair overlay from live tab state into the spec before
    // every render — this makes cached renders correct on tab switching too.
    if (tab && plotSpec && plotSpec.layout) {
      plotSpec.layout.dragmode  = tab.crosshair && tab.crosshair.enabled ? false
                               : state.examineMode ? 'lasso'
                               : state.dragMode;
      plotSpec.layout.clickmode = state.examineMode ? 'event+select' : 'event';
      if (tab.crosshair && Number.isFinite(tab.crosshair.x) && Number.isFinite(tab.crosshair.y)) {
        const theme = getThemeColors();
        plotSpec.layout.shapes      = buildCrosshairShapes(tab.crosshair.x, tab.crosshair.y, theme);
        plotSpec.layout.annotations = [buildCrosshairAnnotation(tab, tab.crosshair.x, tab.crosshair.y, theme)];
      } else {
        plotSpec.layout.shapes      = [];
        plotSpec.layout.annotations = [];
      }
    }
    // Inject examine overlay trace so the selection highlight is part of this single
    // Plotly.react call (avoids a second Plotly.react that would reset the zoom state).
    // Also clear any lasso polygon that Plotly may have written back onto plotSpec.layout.
    plotSpec.data = plotSpec.data.filter((tr) => !tr._examineOverlay);
    if (plotSpec.layout) plotSpec.layout.selections = [];
    if (tab) {
      const overlayTrace = buildExamineOverlayTrace(tab);
      if (overlayTrace) plotSpec.data.push(overlayTrace);
    }

    window.Plotly.react(elements.plot, plotSpec.data, plotSpec.layout, plotSpec.config)
      .then(() => {
        bindPlotEvents();
        if (tab) {
          syncPlotControls(tab);
          updateCrosshairReadout(tab);
          updateExamineTable(tab);
        }
      });
  }

  function clearPlot() {
    if (!window.Plotly) { elements.plot.innerHTML = ''; disablePlotControls(); return; }
    window.Plotly.purge(elements.plot);
    disablePlotControls();
  }

  // ---------------------------------------------------------------------------
  // Plot event binding
  // ---------------------------------------------------------------------------

  function bindPlotEvents() {
    if (!elements.plot) return;
    if (typeof elements.plot.removeAllListeners === 'function') {
      elements.plot.removeAllListeners('plotly_click');
      elements.plot.removeAllListeners('plotly_selected');
      elements.plot.removeAllListeners('plotly_deselect');
    }
    elements.plot.on('plotly_click',    onPlotClick);
    elements.plot.on('plotly_selected', onPlotSelected);
    elements.plot.on('plotly_deselect', onPlotDeselect);

    if (!state.plotEventsBound) {
      elements.plot.addEventListener('click', onPlotBackgroundClick);
      state.plotEventsBound = true;
    }
  }

  function onPlotClick(event) {
    const tab = getActiveTab();
    if (!tab) return;

    const point = event && event.points ? event.points[0] : null;

    // Examine mode: click a data point to add/remove it from the selection.
    // Works only in scatter and step modes (not histograms).
    if (state.examineMode && tab.lastSeries && !tab.lastSeries._histMode && point) {
      const pt = tab.plotType === 'scatter' || tab.plotType === 'spec' ? point : null;
      if (pt) {
        const origIdx = tab.lastSeries.origIndices
          ? tab.lastSeries.origIndices[pt.pointIndex]
          : undefined;
        if (origIdx !== undefined) {
          state.suppressBackgroundClick = true;
          if (_shiftKeyDown) {
            tab.selectedIndices.delete(origIdx);
          } else {
            tab.selectedIndices.add(origIdx);
          }
          updateExamineTable(tab);
          syncPlotControls(tab);
          requestAnimationFrame(() => {
            updateExamineVisuals(tab);
            state.suppressBackgroundClick = false;
          });
          return;
        }
      }
    }

    // Crosshair mode: click a data point to place the crosshair there.
    if (!tab.crosshair || !tab.crosshair.enabled) return;
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    state.suppressBackgroundClick = true;
    setCrosshair(tab, point.x, point.y);
    requestAnimationFrame(() => { state.suppressBackgroundClick = false; });
  }

  function onPlotBackgroundClick(event) {
    if (state.suppressBackgroundClick) { state.suppressBackgroundClick = false; return; }
    const tab = getActiveTab();
    if (!tab || !tab.crosshair || !tab.crosshair.enabled) return;
    const coords = getPlotCoordinates(event);
    if (coords) setCrosshair(tab, coords.x, coords.y);
  }

  function getPlotCoordinates(event) {
    if (!elements.plot || !elements.plot._fullLayout) return null;
    const fl = elements.plot._fullLayout;
    const xa = fl.xaxis;
    const ya = fl.yaxis;
    if (!xa || !ya || !fl._size) return null;

    const rect   = elements.plot.getBoundingClientRect();
    const xPixel = event.clientX - rect.left - fl._size.l;
    const yPixel = event.clientY - rect.top  - fl._size.t;
    if (xPixel < 0 || yPixel < 0 || xPixel > fl._size.w || yPixel > fl._size.h) return null;

    const xToData = typeof xa.p2d === 'function' ? xa.p2d.bind(xa) : xa.p2c;
    const yToData = typeof ya.p2d === 'function' ? ya.p2d.bind(ya) : ya.p2c;
    if (typeof xToData !== 'function' || typeof yToData !== 'function') return null;

    const xValue = xToData(xPixel);
    const yValue = yToData(yPixel);
    if (!Number.isFinite(xValue) || !Number.isFinite(yValue)) return null;
    return { x: xValue, y: yValue };
  }

  // ---------------------------------------------------------------------------
  // Plot controls sync
  // ---------------------------------------------------------------------------

  function disablePlotControls() {
    elements.autoscaleXYBtn.disabled    = true;
    elements.autoscaleXYErrBtn.disabled = true;
    elements.floorXYBtn.disabled        = true;
    elements.autoscaleXBtn.disabled     = true;
    elements.autoscaleXErrBtn.disabled  = true;
    elements.floorXBtn.disabled         = true;
    elements.autoscaleYBtn.disabled     = true;
    elements.autoscaleYErrBtn.disabled  = true;
    elements.floorYBtn.disabled         = true;
    elements.zoomModeBtn.disabled       = true;
    elements.panModeBtn.disabled        = true;
    elements.zoomInBtn.disabled         = true;
    elements.zoomOutBtn.disabled        = true;
    elements.saveImageBtn.disabled      = true;
    elements.crosshairToggle.disabled   = true;
    elements.crosshairToggle.classList.remove('active');
    elements.crosshairToggle.setAttribute('aria-pressed', 'false');
    elements.clearCrosshairBtn.disabled = true;
    elements.crosshairReadout.textContent = 'Crosshair off';
    elements.examineToggle.disabled   = true;
    elements.examineToggle.classList.remove('active');
    elements.examineToggle.setAttribute('aria-pressed', 'false');
    elements.selectAllBtn.disabled    = true;
    elements.deselectAllBtn.disabled  = true;
    elements.examineExportBtn.disabled = true;
    elements.examineReadout.textContent = '0 selected';
  }

  function syncPlotControls(tab) {
    const hasSeries      = Boolean(tab && tab.lastSeries && tab.lastSeries.x && tab.lastSeries.x.length);
    const isHistMode     = Boolean(tab && tab.lastSeries && tab.lastSeries._histMode);
    // hasYData: y values are available for range calculations.
    // True for scatter/step (y always stored) and hist2d (stored since fix).
    // False for hist1d (count axis — rangemode:'tozero' handles it automatically).
    const hasYData       = Boolean(hasSeries && tab && tab.lastSeries.y && tab.lastSeries.y.length);
    const hasYerr        = Boolean(hasSeries && !isHistMode && tab && tab.lastSeries.yLower && tab.lastSeries.validYerr > 0);
    const hasXerr        = Boolean(hasSeries && !isHistMode && tab && tab.lastSeries.xLower);
    const crosshairActive = Boolean(tab && tab.crosshair && tab.crosshair.enabled);
    // X buttons: always work when there is any series (hist always has x data).
    // Y buttons: need y data — hist1d has none (count axis), so those stay off.
    // ±Err buttons: only when actual error columns exist (never for hist).
    elements.autoscaleXYBtn.disabled    = !(hasSeries && hasYData);
    elements.autoscaleXYErrBtn.disabled = !(hasYerr || hasXerr);
    elements.floorXYBtn.disabled        = !(hasSeries && hasYData);
    elements.autoscaleXBtn.disabled     = !hasSeries;
    elements.autoscaleXErrBtn.disabled  = !hasXerr;
    elements.floorXBtn.disabled         = !hasSeries;
    elements.autoscaleYBtn.disabled     = !hasYData;
    elements.autoscaleYErrBtn.disabled  = !hasYerr;
    elements.floorYBtn.disabled         = !hasYData;
    elements.zoomModeBtn.disabled       = !hasSeries;
    elements.panModeBtn.disabled        = !hasSeries;
    elements.zoomInBtn.disabled         = !hasSeries;
    elements.zoomOutBtn.disabled        = !hasSeries;
    elements.saveImageBtn.disabled      = !hasSeries;
    const hasCrosshairPos = Boolean(tab && tab.crosshair &&
      Number.isFinite(tab.crosshair.x) && Number.isFinite(tab.crosshair.y));
    elements.crosshairToggle.disabled   = !hasSeries;
    elements.clearCrosshairBtn.disabled = !hasCrosshairPos;
    if (hasSeries) syncDragModeButtons(crosshairActive);

    if (!tab || !tab.crosshair) { disablePlotControls(); return; }
    const active = Boolean(tab.crosshair.enabled);
    elements.crosshairToggle.classList.toggle('active', active);
    elements.crosshairToggle.setAttribute('aria-pressed', active ? 'true' : 'false');
    updateCrosshairReadout(tab);

    // Examine buttons — disabled for histogram modes (no meaningful point selection)
    const examineAvailable = hasSeries && !isHistMode;
    const nSelected        = tab.selectedIndices ? tab.selectedIndices.size : 0;
    elements.examineToggle.disabled   = !examineAvailable;
    elements.selectAllBtn.disabled    = !examineAvailable;
    elements.deselectAllBtn.disabled  = !(examineAvailable && nSelected > 0);
    elements.examineExportBtn.disabled = !(examineAvailable && nSelected > 0);
    elements.examineReadout.textContent = `${nSelected} selected`;
    const examineActive = state.examineMode && examineAvailable;
    elements.examineToggle.classList.toggle('active', examineActive);
    elements.examineToggle.setAttribute('aria-pressed', String(examineActive));
  }

  // ---------------------------------------------------------------------------
  // Custom label / title handler
  // ---------------------------------------------------------------------------

  function onCustomLabelChange() {
    const tab = getActiveTab();
    if (!tab) return;
    tab.customXLabel = elements.customXLabel.value;
    tab.customYLabel = elements.customYLabel.value;
    tab.customTitle  = elements.customTitle.value;
    plotFromSelections(tab, { useCache: false });
  }

  // ---------------------------------------------------------------------------
  // Zoom / pan mode + plot-tool buttons
  // ---------------------------------------------------------------------------

  function onZoomMode() {
    const tab = getActiveTab();
    if (tab && tab.crosshair) tab.crosshair.enabled = false;
    state.examineMode = false;
    state.dragMode = 'zoom';
    if (window.Plotly && tab) window.Plotly.relayout(elements.plot,
      { dragmode: 'zoom', clickmode: 'event' });
    if (tab) updateExamineVisuals(tab);
    syncPlotControls(tab);
  }

  function onPanMode() {
    const tab = getActiveTab();
    if (tab && tab.crosshair) tab.crosshair.enabled = false;
    state.examineMode = false;
    state.dragMode = 'pan';
    if (window.Plotly && tab) window.Plotly.relayout(elements.plot,
      { dragmode: 'pan', clickmode: 'event' });
    if (tab) updateExamineVisuals(tab);
    syncPlotControls(tab);
  }

  function syncDragModeButtons(crosshairActive) {
    const isExamine = state.examineMode && !crosshairActive;
    const isZoom    = !crosshairActive && !isExamine && state.dragMode === 'zoom';
    const isPan     = !crosshairActive && !isExamine && state.dragMode === 'pan';
    elements.zoomModeBtn.classList.toggle('active', isZoom);
    elements.zoomModeBtn.setAttribute('aria-pressed', String(isZoom));
    elements.panModeBtn.classList.toggle('active', isPan);
    elements.panModeBtn.setAttribute('aria-pressed', String(isPan));
  }

  function onZoomIn() {
    if (!window.Plotly) return;
    const fl = elements.plot && elements.plot._fullLayout;
    if (!fl || !fl.xaxis || !fl.yaxis) return;
    const xa = fl.xaxis, ya = fl.yaxis;
    const xc = (xa.range[0] + xa.range[1]) / 2;
    const yc = (ya.range[0] + ya.range[1]) / 2;
    const xh = (xa.range[1] - xa.range[0]) / 2 * 0.5;
    const yh = (ya.range[1] - ya.range[0]) / 2 * 0.5;
    window.Plotly.relayout(elements.plot, {
      'xaxis.autorange': false, 'xaxis.range': [xc - xh, xc + xh],
      'yaxis.autorange': false, 'yaxis.range': [yc - yh, yc + yh]
    });
  }

  function onZoomOut() {
    if (!window.Plotly) return;
    const fl = elements.plot && elements.plot._fullLayout;
    if (!fl || !fl.xaxis || !fl.yaxis) return;
    const xa = fl.xaxis, ya = fl.yaxis;
    const xc = (xa.range[0] + xa.range[1]) / 2;
    const yc = (ya.range[0] + ya.range[1]) / 2;
    const xh = (xa.range[1] - xa.range[0]) / 2 * 2;
    const yh = (ya.range[1] - ya.range[0]) / 2 * 2;
    window.Plotly.relayout(elements.plot, {
      'xaxis.autorange': false, 'xaxis.range': [xc - xh, xc + xh],
      'yaxis.autorange': false, 'yaxis.range': [yc - yh, yc + yh]
    });
  }

  function onSaveImage() {
    if (!window.Plotly) return;
    const tab      = getActiveTab();
    const filename = (tab ? tab.name.replace(/\.[^.]+$/, '') : 'plot') + '.png';

    // Plotly.downloadImage uses <a download href=dataURI> internally.
    // Safari blocks large data-URI downloads and may lose user-gesture context across
    // the async toImage call. Converting to a Blob object URL is more reliable.
    window.Plotly.toImage(elements.plot, { format: 'png', width: 1600, height: 800, scale: 2 })
      .then((dataUrl) => {
        // Decode data URL → Uint8Array → Blob → object URL
        const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
        const binary  = atob(base64);
        const bytes   = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob    = new Blob([bytes], { type: 'image/png' });
        const url     = URL.createObjectURL(blob);

        const a       = document.createElement('a');
        a.href        = url;
        a.download    = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Revoke after a short delay to let the browser initiate the download
        setTimeout(() => URL.revokeObjectURL(url), 500);
      })
      .catch(() => {
        if (tab) setTabStatus(tab, 'error', 'Failed to save PNG.');
      });
  }

  // ---------------------------------------------------------------------------
  // Autoscale / floor buttons
  // ---------------------------------------------------------------------------

  // XY (both axes)
  function onAutoscaleXY()    { const t = getActiveTab(); if (t) autoscaleAxes(t, false, false); }
  function onAutoscaleXYErr() { const t = getActiveTab(); if (t) autoscaleAxes(t, true,  true);  }
  function onFloorXY()        { const t = getActiveTab(); if (t) applyFloors(t, true, true);     }

  // X axis only
  function onAutoscaleX()    { const t = getActiveTab(); if (t) autoscaleXAxis(t, false); }
  function onAutoscaleXErr() { const t = getActiveTab(); if (t) autoscaleXAxis(t, true);  }
  function onFloorX()        { const t = getActiveTab(); if (t) applyXFloor(t);           }

  // Y axis only
  function onAutoscaleY()    { const t = getActiveTab(); if (t) autoscaleYAxis(t, false); }
  function onAutoscaleYErr() { const t = getActiveTab(); if (t) autoscaleYAxis(t, true);  }
  function onFloorY()        { const t = getActiveTab(); if (t) applyYFloor(t);           }

  // ---------------------------------------------------------------------------

  function autoscaleAxes(tab, includeXErr, includeYErr) {
    if (!window.Plotly || !tab || !tab.lastSeries) return;
    const xRange = computeXRange(tab.lastSeries, includeXErr, tab.xScale);
    const yRange = computeYRange(tab.lastSeries, includeYErr, tab.yScale);
    const update = {};
    if (xRange) { update['xaxis.autorange'] = false; update['xaxis.range'] = xRange; }
    if (yRange) { update['yaxis.autorange'] = false; update['yaxis.range'] = yRange; }
    if (Object.keys(update).length) window.Plotly.relayout(elements.plot, update);
  }

  function autoscaleXAxis(tab, includeError) {
    if (!window.Plotly || !tab || !tab.lastSeries) return;
    const range = computeXRange(tab.lastSeries, includeError, tab.xScale);
    if (!range) return;
    window.Plotly.relayout(elements.plot, { 'xaxis.autorange': false, 'xaxis.range': range });
  }

  function autoscaleYAxis(tab, includeError) {
    if (!window.Plotly || !tab || !tab.lastSeries) return;
    const range = computeYRange(tab.lastSeries, includeError, tab.yScale);
    if (!range) return;
    window.Plotly.relayout(elements.plot, { 'yaxis.autorange': false, 'yaxis.range': range });
  }

  function computeXRange(series, includeError, scale) {
    if (!series || !Array.isArray(series.x) || !series.x.length) return null;
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < series.x.length; i++) {
      const xv = series.x[i];
      if (!Number.isFinite(xv)) continue;
      let lo = xv, hi = xv;
      if (includeError && series.xLower && series.xUpper) {
        const l = series.xLower[i], u = series.xUpper[i];
        if (Number.isFinite(l) && Number.isFinite(u)) { lo = l; hi = u; }
      }
      if (lo > 0 || scale !== 'log10') min = Math.min(min, lo);
      max = Math.max(max, hi);
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    if (scale === 'log10') {
      // series values are raw positives; compute padding in log space so we never go ≤ 0
      if (min <= 0 || max <= 0) return null;
      const logMin = Math.log10(min);
      const logMax = Math.log10(max);
      const logPad = (logMax - logMin) * 0.05 || 0.1;
      return [logMin - logPad, logMax + logPad];
    }
    const pad = (max - min) * 0.05 || 1;
    return [min - pad, max + pad];
  }

  function computeYRange(series, includeError, scale) {
    if (!series || !Array.isArray(series.y) || !series.y.length) return null;
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < series.y.length; i++) {
      const yv = series.y[i];
      if (!Number.isFinite(yv)) continue;
      let lo = yv, hi = yv;
      if (includeError && series.yLower && series.yUpper) {
        const l = series.yLower[i], u = series.yUpper[i];
        if (Number.isFinite(l) && Number.isFinite(u)) { lo = l; hi = u; }
      }
      if (lo > 0 || scale !== 'log10') min = Math.min(min, lo);
      max = Math.max(max, hi);
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    if (scale === 'log10') {
      // series values are raw positives; compute padding in log space so we never go ≤ 0
      if (min <= 0 || max <= 0) return null;
      const logMin = Math.log10(min);
      const logMax = Math.log10(max);
      const logPad = (logMax - logMin) * 0.05 || 0.1;
      return [logMin - logPad, logMax + logPad];
    }
    const pad = (max - min) * 0.05 || 1;
    return [min - pad, max + pad];
  }

  function applyFloors(tab, doX, doY) {
    if (!window.Plotly || !tab || !tab.lastSeries) return;
    const fl     = elements.plot && elements.plot._fullLayout;
    const update = {};
    if (doX) {
      const xRange = computeXRange(tab.lastSeries, false, tab.xScale);
      if (xRange) {
        const cur  = fl && fl.xaxis && Array.isArray(fl.xaxis.range) ? fl.xaxis.range : null;
        const minX = cur ? cur[0] : xRange[0];
        const maxX = cur ? cur[1] : xRange[1];
        const flrX = computeXFloor(tab, tab.lastSeries, xRange[0]);
        if (Number.isFinite(minX) && Number.isFinite(maxX) && Number.isFinite(flrX) &&
            minX < flrX && flrX < maxX) {
          update['xaxis.autorange'] = false;
          update['xaxis.range']     = [flrX, maxX];
        }
      }
    }
    if (doY) {
      const yRange = computeYRange(tab.lastSeries, false, tab.yScale);
      if (yRange) {
        const cur  = fl && fl.yaxis && Array.isArray(fl.yaxis.range) ? fl.yaxis.range : null;
        const minY = cur ? cur[0] : yRange[0];
        const maxY = cur ? cur[1] : yRange[1];
        const flrY = computeYFloor(tab, tab.lastSeries, yRange[0]);
        if (Number.isFinite(minY) && Number.isFinite(maxY) && Number.isFinite(flrY) &&
            minY < flrY && flrY < maxY) {
          update['yaxis.autorange'] = false;
          update['yaxis.range']     = [flrY, maxY];
        }
      }
    }
    if (Object.keys(update).length) window.Plotly.relayout(elements.plot, update);
  }

  function applyXFloor(tab) {
    if (!window.Plotly || !tab || !tab.lastSeries) return;
    const range = computeXRange(tab.lastSeries, false, tab.xScale);
    if (!range) return;
    const fl           = elements.plot && elements.plot._fullLayout;
    const currentRange = fl && fl.xaxis && Array.isArray(fl.xaxis.range) ? fl.xaxis.range : null;
    const currentMin   = currentRange ? currentRange[0] : range[0];
    const currentMax   = currentRange ? currentRange[1] : range[1];
    const floor        = computeXFloor(tab, tab.lastSeries, range[0]);
    if (!Number.isFinite(currentMin) || !Number.isFinite(currentMax) || !Number.isFinite(floor)) return;
    if (currentMin >= floor || floor >= currentMax) return;
    window.Plotly.relayout(elements.plot, { 'xaxis.autorange': false, 'xaxis.range': [floor, currentMax] });
  }

  function applyYFloor(tab) {
    if (!window.Plotly || !tab || !tab.lastSeries) return;
    const range = computeYRange(tab.lastSeries, false, tab.yScale);
    if (!range) return;
    const fl           = elements.plot && elements.plot._fullLayout;
    const currentRange = fl && fl.yaxis && Array.isArray(fl.yaxis.range) ? fl.yaxis.range : null;
    const currentMin   = currentRange ? currentRange[0] : range[0];
    const currentMax   = currentRange ? currentRange[1] : range[1];
    const floor        = computeYFloor(tab, tab.lastSeries, range[0]);
    if (!Number.isFinite(currentMin) || !Number.isFinite(currentMax) || !Number.isFinite(floor)) return;
    if (currentMin >= floor || floor >= currentMax) return;
    window.Plotly.relayout(elements.plot, { 'yaxis.autorange': false, 'yaxis.range': [floor, currentMax] });
  }

  function computeXFloor(tab, series, minValue) {
    if (tab.xScale === 'log10') {
      const mp = findMinPositive(series.x, series.xLower);
      return Number.isFinite(mp) ? Math.log10(mp) : minValue;
    }
    return 0;
  }

  function computeYFloor(tab, series, minValue) {
    if (tab.yScale === 'log10') {
      const mp = findMinPositive(series.y, series.yLower);
      return Number.isFinite(mp) ? Math.log10(mp) : minValue;
    }
    return 0;
  }

  function findMinPositive(values, lowerValues) {
    let min = Infinity;
    [values, lowerValues].filter(Boolean).forEach((arr) => {
      for (let i = 0; i < arr.length; i++) {
        const v = arr[i];
        if (Number.isFinite(v) && v > 0) min = Math.min(min, v);
      }
    });
    return Number.isFinite(min) ? min : NaN;
  }

  // ---------------------------------------------------------------------------
  // Header pane
  // ---------------------------------------------------------------------------

  function onHeaderHduChange() {
    const tab = getActiveTab();
    if (!tab) return;
    const val = elements.headerHduSelect.value;
    if (!val) {
      // "None" selected — clear the table
      tab.headerHduIndex = null;
      elements.headerTableBody.innerHTML = '';
      elements.headerEmpty.textContent = 'Select an HDU above to view its headers.';
      elements.headerEmpty.classList.remove('hidden');
      return;
    }
    const idx = Number(val);
    if (Number.isNaN(idx)) return;
    tab.headerHduIndex = idx;
    renderHeaderTable(tab, idx);
  }

  function syncHeaderPane(tab) {
    if (!tab || !tab.hdus || !tab.hdus.length) { clearHeaderPane(); return; }
    if (tab.fileType === 'csv') {
      clearHeaderPane('CSV files do not have FITS-style headers.');
      return;
    }
    populateHeaderHduSelect(tab);
    if (tab.headerHduIndex === null) {
      // "None" is selected — clear the table body but keep the select enabled
      elements.headerTableBody.innerHTML = '';
      elements.headerEmpty.textContent = 'Select an HDU above to view its headers.';
      elements.headerEmpty.classList.remove('hidden');
    } else {
      renderHeaderTable(tab, tab.headerHduIndex);
    }
  }

  function populateHeaderHduSelect(tab) {
    elements.headerHduSelect.innerHTML = '';
    // "None" is the default — no header is shown until the user picks one
    elements.headerHduSelect.appendChild(new Option('None', ''));
    tab.hdus.forEach((hdu) => {
      const isPrimary = hdu.header && typeof hdu.header.isPrimary === 'function' && hdu.header.isPrimary();
      const base      = isPrimary ? 'Primary' : hdu.dataType || 'HDU';
      const parts     = [`HDU ${hdu.index}`, base];
      if (hdu.extName) parts.push(hdu.extName);
      elements.headerHduSelect.appendChild(new Option(parts.join(' - '), String(hdu.index)));
    });
    elements.headerHduSelect.disabled = false;
    const available = tab.hdus.map((h) => h.index);
    if (tab.headerHduIndex !== null && available.includes(tab.headerHduIndex)) {
      elements.headerHduSelect.value = String(tab.headerHduIndex);
    } else {
      // Default to None
      tab.headerHduIndex = null;
      elements.headerHduSelect.value = '';
    }
  }

  function renderHeaderTable(tab, hduIndex) {
    const hdu = tab.hdus.find((h) => h.index === hduIndex) || tab.hdus[0];
    if (!hdu || !hdu.header) { clearHeaderPane('No header available for this HDU.'); return; }

    const rows = extractHeaderRows(hdu.header);
    elements.headerTableBody.innerHTML = '';
    rows.forEach((row) => {
      const tr  = document.createElement('tr');
      const tds = [row.key, row.value, row.comment].map((text) => {
        const td = document.createElement('td');
        td.textContent = text;
        return td;
      });
      tr.append(...tds);
      elements.headerTableBody.appendChild(tr);
    });
    elements.headerEmpty.classList.toggle('hidden', rows.length > 0);
  }

  function extractHeaderRows(header) {
    if (!header || !header.cards) return [];
    const cards  = header.cards;
    const normal = [];
    Object.keys(cards).forEach((key) => {
      if (key === 'COMMENT' || key === 'HISTORY') return;
      const entry = cards[key];
      if (!entry || typeof entry !== 'object') return;
      normal.push({
        key,
        value:   formatHeaderValue(entry.value),
        comment: entry.comment ? String(entry.comment) : '',
        index:   Number.isFinite(entry.index) ? entry.index : 9999
      });
    });
    normal.sort((a, b) => a.index - b.index);

    const rows = [...normal];
    if (Array.isArray(cards.COMMENT)) {
      cards.COMMENT.forEach((v) => rows.push({ key: 'COMMENT', value: String(v), comment: '' }));
    }
    if (Array.isArray(cards.HISTORY)) {
      cards.HISTORY.forEach((v) => rows.push({ key: 'HISTORY', value: String(v), comment: '' }));
    }
    return rows;
  }

  function formatHeaderValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number')  return Number.isFinite(value) ? String(value) : '';
    if (typeof value === 'boolean') return value ? 'T' : 'F';
    return String(value);
  }

  function clearHeaderPane(message) {
    elements.headerHduSelect.innerHTML = '';
    elements.headerHduSelect.disabled  = true;
    elements.headerTableBody.innerHTML = '';
    elements.headerEmpty.textContent   = message || 'No header loaded.';
    elements.headerEmpty.classList.remove('hidden');
  }

  // ---------------------------------------------------------------------------
  // Data utilities
  // ---------------------------------------------------------------------------

  function getColumnValues(tab, hdu, columnName) {
    const cacheKey = `${hdu.index}:${columnName}`;
    if (tab.columnCache[cacheKey]) return Promise.resolve(tab.columnCache[cacheKey]);
    return new Promise((resolve, reject) => {
      try {
        hdu.dataUnit.getColumn(columnName, (col) => {
          tab.columnCache[cacheKey] = col;
          resolve(col);
        });
      } catch (err) { reject(err); }
    });
  }

  function getColumnMeta(hdu) {
    const columns     = hdu.columns || [];
    const descriptors = hdu.dataUnit && hdu.dataUnit.descriptors ? hdu.dataUnit.descriptors : [];
    return columns.map((name, i) => ({ name, descriptor: descriptors[i] || null }));
  }

  function isNumericDescriptor(d) {
    if (!d) return true;
    return ['B', 'I', 'J', 'K', 'E', 'D'].includes(d);
  }

  function toArray(values) {
    if (!values) return [];
    if (Array.isArray(values))          return values.slice();
    if (ArrayBuffer.isView(values))     return Array.from(values);
    if (typeof values.length === 'number') return Array.from(values);
    return [];
  }

  function makeNumericArray(values) {
    const out = new Array(values.length);
    for (let i = 0; i < values.length; i++) out[i] = toNumber(values[i]);
    return out;
  }

  function toNumber(value) {
    if (Array.isArray(value)) return toNumber(value[0]);
    if (value === null || value === undefined) return NaN;
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    const p = Number(value);
    return Number.isFinite(p) ? p : NaN;
  }

  function normalizeErrorValues(values, type) {
    const out = new Array(values.length);
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (!Number.isFinite(v)) { out[i] = NaN; continue; }
      if (type === 'variance')  { out[i] = v >= 0 ? Math.sqrt(v) : NaN; continue; }
      if (type === 'invvar')    { out[i] = v >  0 ? 1 / Math.sqrt(v) : NaN; continue; }
      out[i] = v >= 0 ? v : NaN;  // sigma
    }
    return out;
  }

  function applyScaleValue(value, scale) {
    if (!Number.isFinite(value)) return NaN;
    if (scale === 'log10') return value > 0 ? Math.log10(value) : NaN;
    if (scale === 'sinh')  return Math.sinh(value);
    if (scale === 'asinh') return Math.asinh(value);
    return value;
  }

  function applyScaleArray(values, scale) {
    const out = new Array(values.length);
    for (let i = 0; i < values.length; i++) out[i] = applyScaleValue(values[i], scale);
    return out;
  }

  function sanitizeLogValues(values) {
    const out = new Array(values.length);
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      out[i] = Number.isFinite(v) && v > 0 ? v : NaN;
    }
    return out;
  }

  function prepareAxisValues(values, scale) {
    return scale === 'log10' ? sanitizeLogValues(values) : applyScaleArray(values, scale);
  }

  function prepareBounds(values, errValues, scale) {
    const lower = values.map((v, i) => v - errValues[i]);
    const upper = values.map((v, i) => v + errValues[i]);
    if (scale === 'log10') {
      return { lower: sanitizeLogValues(lower), upper: sanitizeLogValues(upper) };
    }
    return { lower: applyScaleArray(lower, scale), upper: applyScaleArray(upper, scale) };
  }

  // Like prepareBounds but with separate lower-σ and upper-σ arrays (asymmetric errors).
  function prepareAsymBounds(values, errLowValues, errHighValues, scale) {
    const lower = values.map((v, i) => v - errLowValues[i]);
    const upper = values.map((v, i) => v + errHighValues[i]);
    if (scale === 'log10') {
      return { lower: sanitizeLogValues(lower), upper: sanitizeLogValues(upper) };
    }
    return { lower: applyScaleArray(lower, scale), upper: applyScaleArray(upper, scale) };
  }

  // ---------------------------------------------------------------------------
  // Histogram computation helpers
  // ---------------------------------------------------------------------------

  // Compute 1D histogram in transformed space.
  // Returns { xCenters, width, counts, tMin, tMax, nTotal } or null if insufficient data.
  function computeHist1d(values, scale, nBins) {
    const n = values.length;
    let tMin = Infinity, tMax = -Infinity;
    let validCount = 0;
    for (let i = 0; i < n; i++) {
      const t = applyScaleValue(values[i], scale);
      if (!Number.isFinite(t)) continue;
      if (t < tMin) tMin = t;
      if (t > tMax) tMax = t;
      validCount++;
    }
    if (validCount < 2 || tMin === tMax) return null;

    const step    = (tMax - tMin) / nBins;
    const counts  = new Array(nBins).fill(0);
    for (let i = 0; i < n; i++) {
      const t = applyScaleValue(values[i], scale);
      if (!Number.isFinite(t)) continue;
      let bin = Math.floor((t - tMin) / step);
      if (bin >= nBins) bin = nBins - 1;
      counts[bin]++;
    }

    const xCenters = Array.from({ length: nBins }, (_, i) => tMin + (i + 0.5) * step);

    // For log10 scale, back-transform bin centers/widths to raw space so Plotly's
    // native 'log' axis type can handle display (identical behaviour to scatter mode).
    const rawXCenters = scale === 'log10'
      ? xCenters.map((t) => Math.pow(10, t))
      : null;
    const rawWidths = scale === 'log10'
      ? Array.from({ length: nBins }, (_, i) =>
          Math.pow(10, tMin + (i + 1) * step) - Math.pow(10, tMin + i * step))
      : null;

    return { xCenters, width: step, counts, tMin, tMax, nTotal: validCount, rawXCenters, rawWidths };
  }

  // Compute 2D histogram in transformed space.
  // Returns { xCenters, yCenters, xStep, yStep, z, nTotal } or null.
  function computeHist2d(xValues, yValues, xScale, yScale, nBinsX, nBinsY) {
    const limit = Math.min(xValues.length, yValues.length);
    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;
    let validCount = 0;
    for (let i = 0; i < limit; i++) {
      const xt = applyScaleValue(xValues[i], xScale);
      const yt = applyScaleValue(yValues[i], yScale);
      if (!Number.isFinite(xt) || !Number.isFinite(yt)) continue;
      if (xt < xMin) xMin = xt; if (xt > xMax) xMax = xt;
      if (yt < yMin) yMin = yt; if (yt > yMax) yMax = yt;
      validCount++;
    }
    if (validCount < 4 || xMin === xMax || yMin === yMax) return null;

    const xStep = (xMax - xMin) / nBinsX;
    const yStep = (yMax - yMin) / nBinsY;

    // z[yBin][xBin] — row-major, y-axis first (Plotly heatmap convention)
    const z = Array.from({ length: nBinsY }, () => new Array(nBinsX).fill(0));
    for (let i = 0; i < limit; i++) {
      const xt = applyScaleValue(xValues[i], xScale);
      const yt = applyScaleValue(yValues[i], yScale);
      if (!Number.isFinite(xt) || !Number.isFinite(yt)) continue;
      let xBin = Math.floor((xt - xMin) / xStep);
      let yBin = Math.floor((yt - yMin) / yStep);
      if (xBin >= nBinsX) xBin = nBinsX - 1;
      if (yBin >= nBinsY) yBin = nBinsY - 1;
      z[yBin][xBin]++;
    }

    const xCenters = Array.from({ length: nBinsX }, (_, i) => xMin + (i + 0.5) * xStep);
    const yCenters = Array.from({ length: nBinsY }, (_, i) => yMin + (i + 0.5) * yStep);

    // For log10 axes, back-transform bin centers/widths to raw space so Plotly's
    // native 'log' axis type handles display (identical behaviour to scatter mode).
    const rawXCenters = xScale === 'log10' ? xCenters.map((t) => Math.pow(10, t)) : null;
    const rawYCenters = yScale === 'log10' ? yCenters.map((t) => Math.pow(10, t)) : null;
    const rawXWidths  = xScale === 'log10'
      ? Array.from({ length: nBinsX }, (_, i) =>
          Math.pow(10, xMin + (i + 1) * xStep) - Math.pow(10, xMin + i * xStep))
      : null;
    const rawYWidths  = yScale === 'log10'
      ? Array.from({ length: nBinsY }, (_, i) =>
          Math.pow(10, yMin + (i + 1) * yStep) - Math.pow(10, yMin + i * yStep))
      : null;

    return {
      xCenters, yCenters, xStep, yStep, z, xMin, xMax, yMin, yMax, nTotal: validCount,
      rawXCenters, rawYCenters, rawXWidths, rawYWidths
    };
  }

  // Resolve the axis label for histogram modes.
  // For log10 we use Plotly's native log axis (same as scatter), so no prefix is needed —
  // the axis type itself conveys the scale. sinh/asinh data is pre-transformed, so we
  // annotate those labels, matching what scatter mode does.
  function resolveHistAxisLabel(tab, axis) {
    const scale  = axis === 'x' ? (tab.xScale || 'linear') : (tab.yScale || 'linear');
    const custom = axis === 'x' ? (tab.customXLabel || '').trim() : (tab.customYLabel || '').trim();
    if (custom) return custom;
    const col = axis === 'x' ? (tab.columns.x || 'X') : (tab.columns.y || 'Y');
    if (scale === 'sinh')  return `sinh(${col})`;
    if (scale === 'asinh') return `asinh(${col})`;
    return col;   // linear and log10: axis type conveys the transformation
  }

  // Build a Plotly spec for Hist (1D)
  function buildHist1dSpec(tab, xRawValues) {
    const theme  = getThemeColors();
    const nBins  = Math.max(1, Math.min(tab.histNBins || 50, 2000));
    const scale  = tab.xScale || 'linear';
    const hist   = computeHist1d(xRawValues, scale, nBins);
    if (!hist) return null;

    const useLogX  = scale === 'log10';
    const xLabel   = resolveHistAxisLabel(tab, 'x');

    // For log10: bars must be left-aligned at the raw left edge of each bin so
    // they span [10^(tMin+i·step), 10^(tMin+(i+1)·step)] exactly (no overlap).
    // For linear/sinh/asinh: the transformed center is the arithmetic midpoint,
    // so the default centering is already exact.
    const xBarPositions = useLogX
      ? Array.from({ length: hist.xCenters.length }, (_, i) =>
          Math.pow(10, hist.tMin + i * hist.width))
      : hist.xCenters;

    const trace    = {
      x:      xBarPositions,
      y:      hist.counts,
      width:  useLogX ? hist.rawWidths : hist.width,
      offset: useLogX ? 0 : undefined,
      type: 'bar',
      marker: {
        color: theme.markerColor,
        opacity: 0.75,
        line: { color: theme.lineColor, width: 0.5 }
      },
      hovertemplate: `${xLabel}: %{x:.4g}<br>Count: %{y}<extra></extra>`
    };

    const layout = {
      uirevision: `${tab.id}-hist1d`,
      title: { text: (tab.customTitle || '').trim() || tab.name, font: { size: 20, color: theme.fontColor } },
      margin: { l: 64, r: 24, t: 52, b: 56 },
      paper_bgcolor: theme.paperBg,
      plot_bgcolor:  theme.plotBg,
      font: { size: 13, color: theme.fontColor, family: '"Space Grotesk", sans-serif' },
      bargap: 0,
      showlegend: false,
      dragmode: tab.crosshair && tab.crosshair.enabled ? false : state.dragMode,
      xaxis: {
        title: { text: xLabel, font: { size: 14 } },
        gridcolor: theme.gridColor, linecolor: theme.gridColor,
        tickcolor: theme.axisColor, color: theme.axisColor,
        tickfont: { size: 13 },
        zeroline: false, type: useLogX ? 'log' : 'linear', ...buildAxisFormat(scale)
      },
      yaxis: {
        title: { text: 'Count', font: { size: 14 } },
        gridcolor: theme.gridColor, linecolor: theme.gridColor,
        tickcolor: theme.axisColor, color: theme.axisColor,
        tickfont: { size: 13 },
        zeroline: false, type: 'linear', rangemode: 'tozero',
        ...buildAxisFormat('linear')
      },
      shapes: [], annotations: []
    };

    const config = { responsive: true, displaylogo: false, displayModeBar: false };
    return { data: [trace], layout, config };
  }

  // Build a Plotly spec for Hist (2D)
  function buildHist2dSpec(tab, xRawValues, yRawValues) {
    const theme        = getThemeColors();
    const nBinsX       = Math.max(2, Math.min(tab.histNBins  || 50, 500));
    const nBinsY       = Math.max(2, Math.min(tab.histNBinsY || 50, 500));
    const xScale       = tab.xScale || 'linear';
    const yScale       = tab.yScale || 'linear';
    const densityScale = tab.histDensityScale || 'linear';
    const showMarginal = Boolean(tab.histShowMarginal);
    const hist         = computeHist2d(xRawValues, yRawValues, xScale, yScale, nBinsX, nBinsY);
    if (!hist) return null;

    const xLabel = resolveHistAxisLabel(tab, 'x');
    const yLabel = resolveHistAxisLabel(tab, 'y');

    // Apply density scale transformation to z values
    let z = hist.z;
    if (densityScale !== 'linear') {
      z = hist.z.map((row) => row.map((v) => {
        const t = applyScaleValue(v || 0, densityScale);
        return Number.isFinite(t) ? t : null;
      }));
    }

    const colorscaleLabel = densityScale !== 'linear' ? `${densityScale}(Count)` : 'Count';
    // Fixed white→black colorscale: empty cells are white, densest cells are black.
    const colorscale = [[0, '#ffffff'], [1, '#000000']];

    const colorbar = {
      title: { text: colorscaleLabel, side: 'right', font: { size: 13, color: theme.fontColor } },
      thickness: 14,
      tickfont: { size: 12, color: theme.fontColor }
    };

    const useLogX = xScale === 'log10';
    const useLogY = yScale === 'log10';

    const heatmapTrace = {
      x: useLogX ? hist.rawXCenters : hist.xCenters,
      y: useLogY ? hist.rawYCenters : hist.yCenters,
      z,
      type: 'heatmap',
      colorscale,
      colorbar,
      hovertemplate: `${xLabel}: %{x:.4g}<br>${yLabel}: %{y:.4g}<br>Count: %{z:.0f}<extra></extra>`,
      xgap: 0, ygap: 0
    };

    const traces = [heatmapTrace];

    const layout = {
      uirevision: `${tab.id}-hist2d`,
      title: { text: (tab.customTitle || '').trim() || tab.name, font: { size: 20, color: theme.fontColor } },
      margin: { l: 64, r: 80, t: 52, b: 56 },
      paper_bgcolor: theme.paperBg,
      plot_bgcolor:  theme.plotBg,
      font: { size: 13, color: theme.fontColor, family: '"Space Grotesk", sans-serif' },
      showlegend: false,
      dragmode: tab.crosshair && tab.crosshair.enabled ? false : state.dragMode,
      xaxis: {
        title: { text: xLabel, font: { size: 14 } },
        gridcolor: theme.gridColor, linecolor: theme.gridColor,
        tickcolor: theme.axisColor, color: theme.axisColor,
        tickfont: { size: 13 },
        zeroline: false, type: useLogX ? 'log' : 'linear',
        ...buildAxisFormat(xScale)
      },
      yaxis: {
        title: { text: yLabel, font: { size: 14 } },
        gridcolor: theme.gridColor, linecolor: theme.gridColor,
        tickcolor: theme.axisColor, color: theme.axisColor,
        tickfont: { size: 13 },
        zeroline: false, type: useLogY ? 'log' : 'linear',
        ...buildAxisFormat(yScale)
      },
      shapes: [], annotations: []
    };

    if (showMarginal) {
      // X marginal: distribution of X — sum z over all y-bins
      const marginalX = new Array(nBinsX).fill(0);
      for (let xi = 0; xi < nBinsX; xi++) {
        for (let yi = 0; yi < nBinsY; yi++) marginalX[xi] += hist.z[yi][xi];
      }

      // Y marginal: distribution of Y — sum z over all x-bins
      const marginalY = new Array(nBinsY).fill(0);
      for (let yi = 0; yi < nBinsY; yi++) {
        for (let xi = 0; xi < nBinsX; xi++) marginalY[yi] += hist.z[yi][xi];
      }

      const maxXMarg = Math.max(...marginalX) || 1;
      const maxYMarg = Math.max(...marginalY) || 1;

      // For log10 axes: left/bottom edges of each bin in raw space, used as bar
      // positions with offset=0 so bars span exactly [leftEdge, rightEdge].
      // For linear/sinh/asinh: transformed centers are arithmetic midpoints, so
      // default bar centering is already exact (no offset needed).
      const xBarPos = useLogX
        ? Array.from({ length: nBinsX }, (_, i) => Math.pow(10, hist.xMin + i * hist.xStep))
        : hist.xCenters;
      const yBarPos = useLogY
        ? Array.from({ length: nBinsY }, (_, i) => Math.pow(10, hist.yMin + i * hist.yStep))
        : hist.yCenters;

      // X marginal bars — vertical, at the bottom; shares main x-axis.
      // Count scale lives on overlaid y2; range=[0, 5*max] maps y2=0 to the
      // physical bottom so the bars occupy only the bottom ~20% of the heatmap.
      traces.push({
        x:      xBarPos,
        y:      marginalX,
        width:  useLogX ? hist.rawXWidths : hist.xStep,
        offset: useLogX ? 0 : undefined,
        type: 'bar',
        xaxis: 'x', yaxis: 'y2',
        marker: { color: 'rgba(214,39,40,0.3)', line: { width: 0 } },
        showlegend: false,
        hoverinfo: 'skip'
      });

      // Y marginal bars — horizontal, at the left; shares main y-axis.
      // Count scale lives on overlaid x2; range=[0, 5*max] maps x2=0 to the
      // physical left so the bars occupy only the left ~20% of the heatmap.
      traces.push({
        x:      marginalY,
        y:      yBarPos,
        width:  useLogY ? hist.rawYWidths : hist.yStep,
        offset: useLogY ? 0 : undefined,
        type: 'bar', orientation: 'h',
        xaxis: 'x2', yaxis: 'y',
        marker: { color: 'rgba(214,39,40,0.3)', line: { width: 0 } },
        showlegend: false,
        hoverinfo: 'skip'
      });

      // Overlaid count axes — cover the exact same plot area as the primary axes.
      // No ticks, no grid, no labels; they exist only to provide an independent,
      // fixed count scale for the marginal step lines.
      //
      // Range trick: [0, 5*max] maps the zero-baseline to the physical bottom/left
      // edge of the plot, so each marginal occupies only the innermost ~20%.
      // fixedrange:true ensures the count scale never moves when the user pans or
      // zooms the primary axis — the marginals stay pinned to their edge.
      layout.yaxis2 = {
        overlaying: 'y',
        range: [0, 5 * maxXMarg],
        showticklabels: false, showgrid: false,
        zeroline: false, showline: false, fixedrange: true
      };
      layout.xaxis2 = {
        overlaying: 'x',
        range: [0, 5 * maxYMarg],
        showticklabels: false, showgrid: false,
        zeroline: false, showline: false, fixedrange: true
      };
    }

    const config = { responsive: true, displaylogo: false, displayModeBar: false };
    return { data: traces, layout, config };
  }

  // ---------------------------------------------------------------------------
  // Series builder
  //
  // FIX #9: Points are NEVER dropped because of bad uncertainty values alone.
  //   – A point is dropped only when its x or y value is non-finite.
  //   – Invalid error values are stored as null so Plotly skips the cap/whisker
  //     for that point while still rendering the data point itself.
  // ---------------------------------------------------------------------------

  function buildSeries(xValues, yValues, yLowerValues, yUpperValues, xLowerValues, xUpperValues, isScatter) {
    const limit = Math.min(xValues.length, yValues.length);

    const x          = [];
    const y          = [];
    const origIndices = [];   // maps trace-point-index → original row index
    const yLower     = yLowerValues  ? [] : null;
    const yUpper     = yUpperValues  ? [] : null;
    const yerrPlus   = (yLowerValues && yUpperValues) ? [] : null;
    const yerrMinus  = (yLowerValues && yUpperValues) ? [] : null;
    const xLower     = xLowerValues  ? [] : null;
    const xUpper     = xUpperValues  ? [] : null;
    const xerrPlus   = (xLowerValues && xUpperValues) ? [] : null;
    const xerrMinus  = (xLowerValues && xUpperValues) ? [] : null;

    let dropped      = 0;
    let droppedYerr  = 0;
    let validYerr    = 0;

    for (let i = 0; i < limit; i++) {
      const xVal = xValues[i];
      const yVal = yValues[i];

      // Only drop a point when x or y itself is non-finite.
      if (!Number.isFinite(xVal) || !Number.isFinite(yVal)) {
        dropped++;
        continue;
      }

      origIndices.push(i);
      x.push(xVal);
      y.push(yVal);

      // Y uncertainty
      if (yLower && yUpper && yerrPlus && yerrMinus) {
        const lo = yLowerValues[i];
        const hi = yUpperValues[i];
        if (Number.isFinite(lo) && Number.isFinite(hi) && hi >= lo) {
          yLower.push(lo);
          yUpper.push(hi);
          yerrPlus.push(hi - yVal);
          yerrMinus.push(yVal - lo);
          validYerr++;
        } else {
          // FIX #9: keep the point; just record null for the error cap
          yLower.push(null);
          yUpper.push(null);
          yerrPlus.push(null);
          yerrMinus.push(null);
          droppedYerr++;
        }
      }

      // X uncertainty (scatter only)
      if (xLower && xUpper && xerrPlus && xerrMinus) {
        const lo = xLowerValues[i];
        const hi = xUpperValues[i];
        if (Number.isFinite(lo) && Number.isFinite(hi) && hi >= lo) {
          xLower.push(lo);
          xUpper.push(hi);
          xerrPlus.push(hi - xVal);
          xerrMinus.push(xVal - lo);
        } else {
          xLower.push(null);
          xUpper.push(null);
          xerrPlus.push(null);
          xerrMinus.push(null);
        }
      }
    }

    return { x, y, origIndices, yLower, yUpper, yerrPlus, yerrMinus,
             xLower, xUpper, xerrPlus, xerrMinus,
             dropped, droppedYerr, validYerr };
  }

  // ---------------------------------------------------------------------------
  // Axis value formatter
  // ---------------------------------------------------------------------------

  function formatAxisValue(value) {
    if (!Number.isFinite(value)) return '';
    const abs = Math.abs(value);
    if (abs >= 100000)          return String(Math.round(value));
    if (abs >= 1000)            return String(Math.round(value));
    if (abs >= 1)               return trimTrailingZeros(value.toFixed(2));
    if (abs > 0)                return trimTrailingZeros(value.toFixed(3));
    return String(value);
  }

  function trimTrailingZeros(text) {
    return text.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
  }

  // ---------------------------------------------------------------------------
  // Bootstrap
  // ---------------------------------------------------------------------------

  document.addEventListener('DOMContentLoaded', init);
})();
