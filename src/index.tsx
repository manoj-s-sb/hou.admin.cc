import { createRoot } from 'react-dom/client';

import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { attachStore } from './services';
import store from './store/store';

attachStore(store);

const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);

// Dev: surface Core Web Vitals in the console. Prod: wire up a real sink (Sentry, GA, Datadog) here.
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-console
  reportWebVitals(metric => console.log('[web-vitals]', metric.name, metric.value, metric));
} else {
  reportWebVitals();
}
