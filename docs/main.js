// so you set up the log in page and the user granted permission by login in to spotify
// what that means is spotify will give you an authorization code
// this is the first code of the OAuth 2.0
// this authorization code just lets us get access to the access token, that is it
// it expires quickly. but the app will use it fast enough
// the access token is what we will actually use to access the user's data and modify it
// it comes in the url and we need to extract it
// so let's write the function for that

function extractAuthorizationCode() {
  const urlParams = new URLSearchParams(window.location.search);
  const authorizationCode = urlParams.get('code');
  return authorizationCode;
}

// after getting the authorization code, we need to exchange it for the access token
// according to spotify, we need the arguments you see in the function here
// we just got the auth code, the rest you already have
// it is supposed to go and fetch data from the network so it is an async function
async function exchangeCodeForToken(
  authorizationCode,
  redirectUri,
  clientId,
  clientSecret
) {
  // first let's store the token end point url inside a variable
  const tokenEndPointURL = 'https://accounts.spotify.com/api/token';

  // according to the Spotify API documentation
  // these details must be in the body of the qualifying object
  // i need to read more about this
  const data = {
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  };

  // when we fetch, we need to use the url end point
  // the second parameter is the data object we built
  // this object contains the method, headers, body
  // these are requirements from Spotify to know exactly what we are fetching and in what way
  // also our authentication code is in there
  // notice that because it is a fetch, a promise object will be returned hence we await on it
  // this is where the async nature of this function is going to start

  const response = await fetch(tokenEndPointURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(data),
  });

  // the promise returned by the fetch() has finally been received and put inside of response
  // but inside response, the data we need isn't in js object format yet so we need to parse it
  // we use .json() method and it also returns a promise so we wait on it
  // finally we put the resultant js object inside tokenData
  const tokenData = await response.json();
  // with the tokenData js object that contains the access_token key, we can extract the needed access token
  const accessToken = tokenData.access_token;
  // this is not safe, storing the access token in local storage but i don't have any other way for now
  localStorage.setItem('access_token_key', accessToken);
  console.log('new access: ' + accessToken);
  return accessToken;
}

// after getting the access token, from the  spotify endpoint,
// we can use it now to access the user data based on the scopes the app specified
// in this app, we are going to add a specific playlist ID and search Spotify with it
// again, we are fetching so this is an async function. declare it as such
async function fetchPlaylistById(playlistId, accessToken) {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch playlist');
    }

    const data = await response.json();
    const playlistTracks = data.items;
    return playlistTracks;
  } catch (error) {
    console.error(error);
  }
}

async function fetchArtistGenre(trackArtistId, accessToken) {
  const response = await fetch(
    `https://api.spotify.com/v1/artists/${trackArtistId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch track details');
  }

  const data = await response.json();
  const artistGenre = data.genres;
  return artistGenre;
}

async function getUserId(accessToken) {
  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user ID');
    }

    const data = await response.json();
    const userId = data.id;
    return userId;
  } catch (error) {
    console.error(error);
  }
}

function createPlaylistOnUI(matchedSongs) {
  const loadPlaylistBtn = document.querySelector('#load-pl-btn');
  loadPlaylistBtn.classList.add('hidden');
  console.log(matchedSongs);
  const playlistContainer = document.querySelector('#pl-con');
  const createPlaylistBtn = document.querySelector('#cr-pl-btn');
  matchedSongs.forEach((track) => {
    const trackName = track.track.name;
    const trackArtist = track.track.artists[0].name;
    const songsContainer = document.createElement('div');
    songsContainer.classList.add(
      'w-full',
      'flex',
      'flex-col',
      'justify-around',
      'pl-2',
      'my-2'
    );
    const songSpan = document.createElement('span');
    songSpan.classList.add('text-md');
    const artistSpan = document.createElement('span');
    artistSpan.classList.add('text-xs');
    songSpan.innerHTML = `${trackName}`;
    artistSpan.innerHTML = `${trackArtist}`;
    songsContainer.appendChild(songSpan);
    songsContainer.appendChild(artistSpan);
    playlistContainer.appendChild(songsContainer);
  });
  createPlaylistBtn.classList.remove('hidden');
}

async function createPlaylist(
  accessToken,
  currentUserId,
  playlistName,
  trackURIs
) {
  try {
    // create a new playlist keke
    const response = await fetch(
      `https://api.spotify.com/v1/users/${currentUserId}/playlists`,
      {
        method: 'POST',
        headers: {
          'content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: playlistName,
          public: true,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to create playlist');
    }

    // after creating the playlist name, we need to add songs
    // grab that playlist and get its id

    const data = await response.json();
    console.log(data);
    const playlistId = data.id;
    console.log(playlistId);

    // now let's add songs to the playlist via it's id

    await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        uris: trackURIs,
      }),
    });
    console.log('Playlist created successfully!');
  } catch (error) {
    console.error(error);
  }
}

// now we have the array of matchedSongs, let's create the playlist

// this is the main controller function
// it is the only one called globally after the app loads
// when it is called, it checks if there is an existing access token in the localStorage
// if there is, it puts it in a variable and because the if statement did not pass, it bypass it
// directly to get the playlist id and go call the playlistData() to get the data and display
// if it checks and there is no access token in localStorage, the if statement passes
// it needs to get the authorization code then the access token
// before going ahead to go get the playlistData()
// we might be waiting on the accessToken before going to get the playlistData so this is an async function
async function main() {
  // when the page loads, we want to get an old access token we saved in local storage
  let accessToken = localStorage.getItem('access_token_key');

  // if that access token is not there, we need to get it
  if (!accessToken) {
    // if there is no old access token, get the auth code to help us get it
    const authorizationCode = extractAuthorizationCode();
    // now we have the authorization code, we need to send it to spotify and receive the access token
    // according to them, we won't redirect the url again but they still need the redirect uri
    // to exchange the auth code for the access token, we will fetch from the token endpoint
    // that means it is going to be an async function hence we await it to resolve
    const redirectUri = 'https://gitdela.github.io/spotify-playlists/main.html';
    const clientId = 'dbfef9f44c2d4cd5a0ea254e1b42a559';
    const clientSecret = '855f16e387cf4ae3b7907e6dc9375993';
    // when the exchangeCodeForToken is executed, it will return the value to the accessToken variable here
    accessToken = await exchangeCodeForToken(
      authorizationCode,
      redirectUri,
      clientId,
      clientSecret
    );
  }

  const playlistId = '37i9dQZEVXbLRQDuF5jeBp';
  // notice that when the user comes in initially, accessToken declared for the localStorage was not used
  // but it was still declared
  // so even when the exchangeCode() returned the value to the prev if block, it still updated the localStorage accessToken
  // it is not a separate/new variable
  // that is how come we were able to pass its value to the fetchPlaylist() here even though it's not in the if block
  // we will be fetching here too so do not forget to await it
  const playlistData = await fetchPlaylistById(playlistId, accessToken);
  // console.log(playlistData);
  const wantedGenres = [
    'hiphop',
    'hip hop',
    'rap',
    'atl hip hop',
    'melodic rap',
    'chicago drill',
    'drill',
    'trap',
    'canadian hip hop',
    'conscious hip hop',
  ];
  let matchedSongs = [];
  const playlistContainer = document.querySelector('#pl-con');
  // i was using forEach to iterate over the playlistData
  // but to get the genre of the artist, i needed to fetch the track details again
  // weird that Spotify does not include the track details in their playlists
  // fetch is asynchronous but forEach does not support asynchronous behavior
  // when you use the await keyword on forEach, you will get an error
  // it does not wait for the promise to resolve
  // for of loop does and that is why it is in use here. REMEMBER THAT
  for (const track of playlistData) {
    // const trackId = track.track.id;
    const trackArtistID = track.track.artists[0].id;
    const artistGenre = await fetchArtistGenre(trackArtistID, accessToken);
    // console.log(artistGenre);

    const matchedGenres = artistGenre.filter((genre) =>
      wantedGenres.includes(genre)
    );

    if (matchedGenres.length > 0) {
      matchedSongs.push(track);
      // const trackElement = document.createElement('p');
      // trackElement.textContent = `${trackName} - ${trackArtist}`;
      // playlistContainer.appendChild(trackElement);
    }
  }
  const loadPlaylistBtn = document.querySelector('#load-pl-btn');
  loadPlaylistBtn.addEventListener('click', () => {
    createPlaylistOnUI(matchedSongs);
  });

  // now we have the songs that we need
  // we need to grab the current user's id and do things to him lol
  // we have to fetch again. this time to the /me end point

  const currentUserId = await getUserId(accessToken);
  // console.log(currentUserId);

  // now to create the playlist on spotify, we need the accessToken, currentUserId, playlistName, trackURIs
  // we have everything now apart from the trackURIs and a name for the playlist

  const playlistName = 'Steelo Pro: Current Global Hiphop';
  const trackURIs = matchedSongs.map((track) => track.track.uri);

  const createPlaylistBtn = document.querySelector('#cr-pl-btn');

  createPlaylistBtn.addEventListener('click', async () => {
    await createPlaylist(accessToken, currentUserId, playlistName, trackURIs);
  });
}

main();
