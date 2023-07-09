const spLogin = document.querySelector('#sp-login');

function constrLink() {
  let clientId = 'dbfef9f44c2d4cd5a0ea254e1b42a559';
  let redirectUri = 'http://127.0.0.1:5500/docs/main.html';
  let scopes =
    'playlist-modify-private playlist-modify-public user-top-read user-library-modify user-library-read';
  let array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  let state = array[0].toString();

  let authorizationUrl =
    'https://accounts.spotify.com/authorize?' +
    'client_id=' +
    clientId +
    '&response_type=code' +
    '&redirect_uri=' +
    encodeURIComponent(redirectUri) +
    '&state=' +
    state +
    '&scope=' +
    encodeURIComponent(scopes) +
    '&show_dialog=true';

  console.log(authorizationUrl);

  window.location.href = authorizationUrl;
}
spLogin.addEventListener('click', constrLink);

// http://127.0.0.1:5500/docs/main.html
