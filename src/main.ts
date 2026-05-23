import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

const browserLocation = typeof window !== 'undefined' ? window.location : null;

if (browserLocation?.hostname === '127.0.0.1') {
  const localUrl = new URL(browserLocation.href);
  localUrl.hostname = 'localhost';
  browserLocation.replace(localUrl.toString());
} else {
  bootstrapApplication(App, appConfig)
    .catch((err) => console.error(err));
}
