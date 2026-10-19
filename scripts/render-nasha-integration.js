'use strict';
const fs = require('node:fs');
const evidence = JSON.parse(fs.readFileSync('content/nasha-integration-evidence.json', 'utf8'));
fs.writeFileSync('assets/js/nasha-integration-evidence.js',
  '/* Generated from recorded local synthetic Python execution. No live service. */\nwindow.NashaIntegrationEvidence = ' + JSON.stringify(evidence) + ';\n');
