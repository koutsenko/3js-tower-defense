import './styles.css';

const app = document.querySelector<HTMLElement>('#app');

if (!app) {
  throw new Error('Application root not found');
}

app.innerHTML = `
  <section class="shell">
    <h1>Three.js Tower Defense</h1>
    <p>Core loop initialization complete.</p>
  </section>
`;
