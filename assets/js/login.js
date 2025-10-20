import { enforceMobileViewport, navigateTo } from './utils.js';

enforceMobileViewport();

document.getElementById('google-signin').addEventListener('click', () => {
  navigateTo('./login-google.html');
});
