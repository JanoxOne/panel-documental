'use strict';
const { loadConfig } = require('./config');
const { createApp } = require('./app');

const config = loadConfig();
const app = createApp(config);

app.listen(config.port, () => {
  console.log(`Panel Documental escuchando en http://localhost:${config.port}`);
});
