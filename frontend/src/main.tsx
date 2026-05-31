import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from './store';
import App from './App';
import './style.css';
import 'bootstrap/dist/css/bootstrap.min.css';

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Не найден элемент #root в index.html');
}

const routerBasename =
  import.meta.env.BASE_URL === '/'
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/$/, '');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter basename={routerBasename}>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
