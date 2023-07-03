// so you set up the log in page. the user granted permission by login in to spotify
// what that means is spotify will give us an authorization code
// this is the first part of the OAuth 2.0
// this authorization code just lets us get access to the access token that is it
// it expires quickly. but the app will use it fast enough
// the access token is what we will actually use to access the user's data and modify it
// it comes in the url and we need to extract it
// so let's write the function for that

function extractAuthorizationCode() {
  const urlParams = new URLSearchParams(window.location.search);
  const authorizationCode = urlParams.get('code');
  return authorizationCode;
}
// now we immediately call the function and put it's value inside a variable called authorizationCode
const authorizationCode = extractAuthorizationCode();
// console.log(authorizationCode);

// now the function has been called with the arguments.
// it is supposed to go and fetch data from the api end point so it is an async function
// i am using the latest way of handling async functions that return a Promise
// async and await
async function exchangeCodeForToken(
  authorizationCode,
  redirectUri,
  clientId,
  clientSecret
) {
  // first let's store the token end point url inside a variable
  const tokenEndPointURL = 'https://accounts.spotify.com/api/token';

  //   according to the Spotify API documentation
  const data = {
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  };

  const response = await fetch(tokenEndPointURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(data),
  });

  const tokenData = await response.json();
  const accessToken = tokenData.access_token;
  localStorage.setItem('access_token', accessToken);
  console.log(accessToken);
}

// now we have the authorization code, we need to send it to spotify and receive the access token
// and we need these details according to the spotify API documentation
// we already have them so we can declare them and pass them to the function
// according to them, we won't redirect the url again but they still need the redirect uri
// and it must match the one you set up in the spotify dashboard and used in the authorization url
const redirectUri = 'http://127.0.0.1:5500/docs/main.html';
const clientId = 'dbfef9f44c2d4cd5a0ea254e1b42a559';
const clientSecret = '855f16e387cf4ae3b7907e6dc9375993';

// call the function directly and pass the arguments to it
exchangeCodeForToken(authorizationCode, redirectUri, clientId, clientSecret);
