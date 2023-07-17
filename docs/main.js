// so the user is new, they have an authorization code in the url
// we need to extract it and use it to get an access token
// this is just a step in the middle of the OAuth 2.0
// it is done to prevent hackers from getting the access code easily
function extractAuthorizationCode() {
  const urlParams = new URLSearchParams(window.location.search);
  const authorizationCode = urlParams.get('code');
  return authorizationCode;
}

// now we have the auth code, we go to the Spotify server and get the tokens
// it's an async function because there're delays fetching from the server
// we brought the necessary parameters
// most of these are written to the Spotify API documentation
async function exchangeCodeForTokens(
  authorizationCode,
  redirectUri,
  clientId,
  clientSecret
) {
  // we will send the request to the token endpoint
  const tokenEndPointURL = 'https://accounts.spotify.com/api/token';

  // you'll find these requirements in the Spotify documentation
  // https://developer.spotify.com/documentation/web-api/tutorials/code-flow
  const headers = {
    Authorization: 'Basic ' + btoa(clientId + ':' + clientSecret),
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const data = new URLSearchParams();
  data.append('grant_type', 'authorization_code');
  data.append('code', authorizationCode);
  data.append('redirect_uri', redirectUri);

  const response = await fetch(tokenEndPointURL, {
    method: 'POST',
    headers: headers,
    body: data,
  });

  // after successfully getting the json data, we parse it and wait
  const tokenData = await response.json();

  // then we extract the access token and save it to local storage
  const accessToken = tokenData.access_token;
  localStorage.setItem('access_token_key', accessToken);

  // and the time we got it. we need to save that too
  // helps us calculate later to see if the token is expired or not
  const accessTime = Math.floor(Date.now() / 1000);
  localStorage.setItem('access_time', JSON.stringify(accessTime));

  // we then extract the refresh token and save it to local storage
  // when the access token expires, we use the refresh token to request for a new one
  const refreshToken = tokenData.refresh_token;
  localStorage.setItem('refresh_token_key', refreshToken);

  // don't forget to return the fresh access token for this new user though
  // he needs his playlist now
  return accessToken;
}

// so the user has been here before. say yesterday. access token has expired
// we did the check and we need to get a new access token
// using the refreshToken we got when he was here yesterday
async function refreshAccessToken(refreshToken, clientId, clientSecret) {
  const tokenEndPointURL = 'https://accounts.spotify.com/api/token';

  // don't mix up the authorization in the header for the auth code
  // the auth code's job is done
  // refresh token has taken over the role now
  // https://developer.spotify.com/documentation/web-api/tutorials/code-flow

  const headers = {
    Authorization: 'Basic ' + btoa(clientId + ':' + clientSecret),
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  const data = new URLSearchParams();
  data.append('grant_type', 'refresh_token');
  data.append('refresh_token', refreshToken);

  const response = await fetch(tokenEndPointURL, {
    method: 'POST',
    headers: headers,
    body: data,
  });

  // we parse the response to get it in js object form
  // then extract the new access token
  const tokenData = await response.json();
  const accessToken = tokenData.access_token;

  // don't forget to update the access token in local storage with the new one
  localStorage.setItem('access_token_key', accessToken);

  // and then update the access time key in local storage with this new time again
  const accessTime = Math.floor(Date.now() / 1000);
  localStorage.setItem('access_time', JSON.stringify(accessTime));

  return accessToken;
}

// we have the access token and a playlist id, we can fetch that playlist's songs
// you know why it is a async function right?
async function fetchPlaylistById(playlistId, accessToken) {
  try {
    // to fetch a playlist you need to embed the id in this url
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

    // parse the json response
    const data = await response.json();

    // get the items in the playlist
    const playlistTracks = data.items;

    // return them for use
    return playlistTracks;
  } catch (error) {
    console.error(error);
  }
}

// we have an array of artist ids and an access token, we can get the genre of artists
// don't forget trackArtistIds is an array
async function fetchArtistGenres(trackArtistIds, accessToken) {
  // we will map over the arrays and fetch the artists info
  // the resulting array will be an array of promises
  const genrePromises = trackArtistIds.map((artistId) =>
    fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }).then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch track details');
      }

      // parse the json response
      return response.json();
    })
  );

  // since the genrePromises is an array of promises, we use Promise.all to resolve it
  const artistResponses = await Promise.all(genrePromises);

  // you can now map over the response and extract the genres of the artists
  const artistGenres = artistResponses.map((response) => response.genres);

  // don't forget to return the resultant array of genres
  return artistGenres;
}

// now we have the matchedSongs array, we can display it on the UI on button click
// we are not creating on Spotify yet. just on the UI
function createPlaylistOnUI(matchedSongs) {
  const loadPlaylistBtn = document.querySelector('#load-pl-btn');

  // when the 'See Hiphop songs in Playlist' button is clicked, it needs to go
  loadPlaylistBtn.classList.add('hidden');

  // get the references
  const playlistContainer = document.querySelector('#pl-con');
  const createPlaylistBtn = document.querySelector('#cr-pl-btn');

  // since we will be going to the DOM to create elements
  // it is ineffective to go and append every time we add a playlist item
  // so we create a document fragment
  // create everything on it and when we are ready, go add it to the dom at once
  const fragment = document.createDocumentFragment();

  // so for each track, we create what's necessary and append to the fragment
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
    songSpan.textContent = `${trackName}`;
    artistSpan.textContent = `${trackArtist}`;
    songsContainer.appendChild(songSpan);
    songsContainer.appendChild(artistSpan);
    fragment.appendChild(songsContainer);
  });

  // when everything is created, we then append to the DOM element
  playlistContainer.appendChild(fragment);

  // currently the 'Create Playlist on Spotify' button is hidden
  // but the moment the playlist is on the UI, we need it to be visible
  createPlaylistBtn.classList.remove('hidden');
}

// playlist is created on the UI and the user is skimming through it
// before they decide to create a playlist on spotify, let's go get their ID
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

// we have all the parameters ready
// the user clicks the create playlist on spotify button
async function createPlaylist(
  accessToken,
  currentUserId,
  playlistName,
  trackURIs
) {
  try {
    // first we send a POST with user id and create the playlist
    // name of the playlist is in the body
    const response = await fetch(
      `https://api.spotify.com/v1/users/${currentUserId}/playlists`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

    // the response of the POST returns a data that we can parse and extract the playlist id
    // we need this id to add the songs to the playlist
    const data = await response.json();
    const playlistId = data.id;

    // then we send another POST to add the songs
    // the array of trackURIs in the body
    // once again, all these is in the Spotify documentation
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

    // after the playlist is created, we want to run another function to change the button
    // if the Create Playlist Button remains, the user might click it again
    // and another playlist will be created, we can change it to something more meaningful
    // like a View Playlist on Spotify button, let's do that
    // we will pass the playlist id into this function so it will be able to access it
    // and use it to go to that specific playlist in Spotify
    showPlaylistViewButton(playlistId);
  } catch (error) {
    console.error(error);
  }
}

// playlist created on Spotify
// but the Create Playlist on Spotify button needs to go
// and be replaced with a View Playlist on Spotify button
function showPlaylistViewButton(playlistId) {
  // make the necessary references
  const mainContentContainer = document.querySelector('#main-con');
  const createPlaylistBtn = document.querySelector('#cr-pl-btn');

  // hide the Create Playlist on Spotify button
  createPlaylistBtn.classList.add('hidden');

  // reference the playlist we've not even created yet
  let playlistViewBtn = document.querySelector('#playlist-view-btn');

  // this will always pass
  // i styled it exactly like the Create Playlist on Spotify button
  // so only the text could change
  if (!playlistViewBtn) {
    playlistViewBtn = document.createElement('button');
    playlistViewBtn.id = 'playlist-view-btn';
    playlistViewBtn.classList.add(
      'bg-green-500',
      'text-lg',
      'text-white',
      'rounded-full',
      'my-4',
      'mb-6',
      'py-3',
      'hover:bg-green-800'
    );

    // create the link element with the playlist id embedded
    const playlistViewLink = document.createElement('a');
    playlistViewLink.href = `https://open.spotify.com/playlist/${playlistId}`;
    playlistViewLink.target = '_blank';
    playlistViewLink.textContent = 'View Playlist on Spotify';
    playlistViewLink.classList.add(
      'font-bold',
      'text-white',
      'text-center',
      'text-lg'
    );

    // add the link element to the playlist button
    playlistViewBtn.appendChild(playlistViewLink);

    // add it to the UI
    mainContentContainer.appendChild(playlistViewBtn);
  } else {
    // this will never pass
    // but just in case, add the link
    const playlistViewLink = playlistViewBtn.querySelector('a');
    playlistViewLink.href = `https://open.spotify.com/playlist/${playlistId}`;
  }
}

async function main() {
  // these are reusable variables that we need to access everywhere in this function
  const redirectUri = 'https://gitdela.github.io/spotify-playlists/main.html';
  const clientId = 'dbfef9f44c2d4cd5a0ea254e1b42a559';
  const clientSecret = '855f16e387cf4ae3b7907e6dc9375993';
  // https://gitdela.github.io/spotify-playlists/main.html
  // 127.0.0.1:5500/docs/main.html

  // the access token gives us the permission to modify the user's library
  // when the user has logged in before, it should be in local storage
  // if it's a new user, only the variable will be created
  let accessToken = localStorage.getItem('access_token_key');

  // if the access token is not available, we need to go get it
  // but first we need an authorization code to get the access token
  // the authorization code is what we requested for in the log in page
  // when we constructed that long url with those sensitive parameters
  // it's been brought back, appended to the url now. go extract it
  if (!accessToken) {
    const authorizationCode = extractAuthorizationCode();

    // we then go and exchange the auth code for an access token
    // and a refresh token, because the access token expires
    // and we don't get to use the auth code twice
    // we will be going to the Spotify server this time so there might some delay
    // we use an async function and wait on the response
    accessToken = await exchangeCodeForTokens(
      authorizationCode,
      redirectUri,
      clientId,
      clientSecret
    );

    // if the user has been here before, then heir access token is saved in local storage
    // but the Spotify access token only lasts for an hour (3600s)
    // and we can't use the auth code to request for the access token again
    // the auth code can be used only once
    // so we need a way to get a new access token
    // Spotify provides a refresh token when we get the access token
    // the refresh token can be used like the auth code
    // so we saved that in local storage as well
    // but we must check first if 3600s has elapsed since we got the access token
  } else {
    const currentTime = Math.floor(Date.now() / 1000);
    const savedTime = localStorage.getItem('access_time');
    const timeDifference = currentTime - parseInt(savedTime);
    const refreshToken = localStorage.getItem('refresh_token_key');

    // if 3600s has elapsed, we need to use the refresh token like the auth code
    // and go get another access token
    // we will be going to the Spotify server this time so there might some delay
    // we use an async function and wait on the response
    if (timeDifference > 3600) {
      accessToken = await refreshAccessToken(
        refreshToken,
        clientId,
        clientSecret
      );
    }
  }

  // now we have the access token under every circumstance
  // we can start making calls to the various Spotify API endpoints to get data

  // for now we just want to extract from the RADAR: Top 100 Global Songs
  // so i'm going to hard code the playlist ID
  // when we add more playlists later, then i can include the logic
  const playlistId = '3IsxzDS04BvejFJcQ0iVyW';

  // with the access token and playlist id, we can go fetch the playlist data
  // the data is just going to be a bunch of songs in the playlist
  // once again, it's over the network so -- an async function that we need to wait on
  const playlistData = await fetchPlaylistById(playlistId, accessToken);

  // now we have the playlist data but...
  // unfortunately, Spotify does not include the genre in the the playlist data

  // so we need a way to go get the genres
  // we can generally get it from the artists themselves
  // so let's get the artists' ids which are inside the playlist data
  const trackArtistIds = playlistData.map((track) => track.track.artists[0].id);

  // now that we have the artists ids in an array, we can go get their genres
  // we would have to fetch them from the Spotify servers again so -- async
  // yes we can pass an array as a argument to a function
  const artistGenres = await fetchArtistGenres(trackArtistIds, accessToken);

  // now we have the artistGenres
  // but don't forget we're only interested in hiphop
  // when you look at Spotify, they have so many variations of the name
  // pains, but there is a way. i hardcoded all the names i saw
  // if in the future, i see any name variation, i will add it to this array
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

  // let's declare an empty array of tracks with artists that match the genre -- hiphop
  // declaring it here so we can access it inside code blocks
  let matchedSongs = [];

  // now since we have the artist genre for every track in the playlist data
  // it means we can match the index in the playlist array to the index in the genre array
  // let's loop over the playlist data
  // most artists on Spotify has multiple genres associated with them
  // these genres are in an array
  // so there is the big artistGenres array with an array for the artists in it
  for (i = 0; i < playlistData.length; i++) {
    const track = playlistData[i];
    const artistGenre = artistGenres[i];

    // even if it is a single genre, Spotify puts it in an array for uniformity
    // so artistGenre is an array for one artist but might include 1-4 genres
    // here we are using the .includes() method on the wantedGenres array
    // which is a callback inside the .some() method
    // if it has at least 1 matching song, hasMatchingGenre = true and vice versa
    // we pick one genre from the artistGenre mini array and ask if it's inside wantedGenres
    // .includes returns some members. .some() detects members and answer with a boolean
    const hasMatchingGenre = artistGenre.some((genre) =>
      wantedGenres.includes(genre)
    );

    // we can do this because hasMatchingGenre is a boolean due to .some()
    // if true, add the respective track to the matchedSongs array we created
    // don't forget the track has been declared in this if block
    if (hasMatchingGenre) {
      matchedSongs.push(track);
    }
  }

  // so now we have an array of the songs we are interested in
  // we are ready for out UI to show them
  // the button 'See Hiphop Songs in Playlist' need to display the songs on click
  const loadPlaylistBtn = document.querySelector('#load-pl-btn');
  loadPlaylistBtn.addEventListener('click', () => {
    createPlaylistOnUI(matchedSongs);
  });

  // now after creating the playlist on the UI, the user gets the list of songs on UI
  // and a Create Playlist on Spotify button beneath the songs
  // if they click that, we are required to go create a playlist on their profile
  // we need to be armed with the tools
  // we already have the access token, but we need to get the current user id
  // which we can get with the access token. LOL
  // so let's get the id whiles they skim through the songs
  // and be ready. when they click the button, we don't want to be found wanting LOL
  const currentUserId = await getUserId(accessToken);

  // now we have the user id and everything we need to create the playlist
  // but one more thing... what will we call it?
  // the name is required
  const playlistName = 'Steelo Pro: Current Global Hiphop';

  // also we will use the track URI rather to create the playlist
  // it is much more reliable than the track ids
  // we can get that from the track easily when we map through it
  const trackURIs = matchedSongs.map((track) => track.track.uri);

  // grab the button and create a reference to it
  const createPlaylistBtn = document.querySelector('#cr-pl-btn');

  // we are ready to go
  // notice how we put an async in the callback
  createPlaylistBtn.addEventListener('click', async () => {
    await createPlaylist(accessToken, currentUserId, playlistName, trackURIs);
  });
}

// this is the only statement in the global scope
// i tried as much as possible not to pollute the global scope with variables etc
// the main function gets called as soon as the redirect URI page (this page) loads
main();

// https://gitdela.github.io/spotify-playlists/main.html
