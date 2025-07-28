import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// Import the StateZero config and initialization module
import { getModelClass } from '../model-registry.js';
import config from '../statezero.config.js';
import { configInstance, setAdapters } from '@statezero/core';
import { ModelAdaptor, QuerySetAdaptor, MetricAdaptor } from '@statezero/core/vue';
import { initEventHandler, syncManager } from '@statezero/core';

// Initialize StateZero configuration
configInstance.setConfig(config);
configInstance.registerModelGetter(getModelClass);
setAdapters(ModelAdaptor, QuerySetAdaptor, MetricAdaptor);

initEventHandler();
syncManager.initialize();

createApp(App).mount('#app')