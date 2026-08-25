import './styles.css';
import { createBrowserApplication } from './app/createApplication';

const app = document.querySelector<HTMLElement>('#app');

if (!app) {
  throw new Error('Application root not found');
}

const application = createBrowserApplication(app);
application.start();

if (import.meta.hot) {
  import.meta.hot.dispose(() => application.dispose());
}
