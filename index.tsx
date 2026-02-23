import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/globals.css';
import AppWrapper from './AppWrapper';
import ErrorBoundary from './components/ui/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppWrapper />
    </ErrorBoundary>
  </React.StrictMode>
);
