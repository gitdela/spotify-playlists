// THE FRONT PAGE OF THE WEBSITE
// by now you been to the spotify developer dashboard and registered an app
// got the client id and client secret and set up the redirect URI
// the main goal of this page is to make the user authenticate
// they get redirected to Spotify to log in
// when they successfully log in, they get redirected again to your redirect URI
// they are telling Spotify to give the app permission
// Spotify will return with an authorization code in the URL at the redirect URI

const spLogin = document.querySelector('#sp-login');

function constrLink() {
  let clientId = 'dbfef9f44c2d4cd5a0ea254e1b42a559';
  let redirectUri = 'https://gitdela.github.io/spotify-playlists/main.html';
  // the scopes are the things you want to be able to modify on behalf of the user
  let scopes =
    'playlist-modify-private playlist-modify-public user-top-read user-library-modify user-library-read';
  // Spotify requires some random values set to state
  // they're like a password that helps prevent link interception
  // chatGPT helped me here. i need to read more on this constructor
  // but i get the idea that it is used to generate random stings dynamically
  let array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  let state = array[0].toString();

  // directing the user to the authorization page, you need a url
  // this link must contain these specific parameters
  // the redirectURI is also a url so it must be encoded inside the url
  // the scope has spaces in it so it must be encoded as well
  // notice the & after every/between every parameter to separate them in the link
  // the show dialogue = true makes the user agree every time even when they authorize once
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

  // now we can set the href to the url
  window.location.href = authorizationUrl;
}

// the page waits for the user to click the log in button first
// then everything inside the function executes
spLogin.addEventListener('click', constrLink);

// https://127.0.0.1:5500/docs/main.html
// https://gitdela.github.io/spotify-playlists/main.html
