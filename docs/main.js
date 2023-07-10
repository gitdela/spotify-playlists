function extractAuthorizationCode() {
  const urlParams = new URLSearchParams(window.location.search);
  const authorizationCode = urlParams.get('code');
  return authorizationCode;
}

async function exchangeCodeForToken(
  authorizationCode,
  redirectUri,
  clientId,
  clientSecret
) {
  const tokenEndPointURL = 'https://accounts.spotify.com/api/token';

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

  const tokenData = await response.json();
  console.log(tokenData);
  const accessToken = tokenData.access_token;
  localStorage.setItem('access_token_key', accessToken);
  const refreshToken = tokenData.refresh_token;
  localStorage.setItem('refresh_token_key', refreshToken);
  const accessTime = Math.floor(Date.now() / 1000);
  localStorage.setItem('access_time', JSON.stringify(accessTime));
  console.log('new access: ' + accessToken);
  return accessToken;
}

async function refreshAccessToken(refreshToken, clientId, clientSecret) {
  const tokenEndPointURL = 'https://accounts.spotify.com/api/token';
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

  const tokenData = await response.json();
  const accessToken = tokenData.access_token;
  console.log('refresh access token:', accessToken);

  // Update the access token in local storage
  localStorage.setItem('access_token_key', accessToken);

  return accessToken;
}

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
    console.log(playlistTracks);
    return playlistTracks;
  } catch (error) {
    console.error(error);
  }
}

async function fetchArtistGenres(trackArtistIds, accessToken) {
  const genrePromises = trackArtistIds.map((artistId) =>
    fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }).then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch track details');
      }
      return response.json();
    })
  );

  const artistResponses = await Promise.all(genrePromises);
  const artistGenres = artistResponses.map((response) => response.genres);
  console.log(artistGenres);
  return artistGenres;
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
  const fragment = document.createDocumentFragment();

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

  playlistContainer.appendChild(fragment);
  createPlaylistBtn.classList.remove('hidden');

  createPlaylistBtn.innerHTML = `<a href="https://open.spotify.com/playlist/${playlistId}" target="_blank">Create Playlist</a>`;
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

    const data = await response.json();
    console.log(data);
    const playlistId = data.id;
    console.log(playlistId);

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

async function main() {
  let accessToken = localStorage.getItem('access_token_key');
  const redirectUri = 'https://gitdela.github.io/spotify-playlists/main.html';
  const clientId = 'dbfef9f44c2d4cd5a0ea254e1b42a559';
  const clientSecret = '855f16e387cf4ae3b7907e6dc9375993'; //https://gitdela.github.io/spotify-playlists/main.html

  if (!accessToken) {
    const authorizationCode = extractAuthorizationCode();

    accessToken = await exchangeCodeForToken(
      authorizationCode,
      redirectUri,
      clientId,
      clientSecret
    );
  } else {
    const currentTime = Math.floor(Date.now() / 1000);
    const savedTime = localStorage.getItem('access_time');
    const timeDifference = currentTime - parseInt(savedTime);
    const refreshToken = localStorage.getItem('refresh_token_key');

    if (timeDifference > 3600) {
      console.log('Access token has expired');
      accessToken = await refreshAccessToken(
        refreshToken,
        clientId,
        clientSecret
      );
    }
  }

  const playlistId = '37i9dQZEVXbLRQDuF5jeBp';
  const playlistData = await fetchPlaylistById(playlistId, accessToken);
  console.log(playlistData);
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

  const trackArtistIds = playlistData.map((track) => track.track.artists[0].id);
  console.log(trackArtistIds);
  const artistGenres = await fetchArtistGenres(trackArtistIds, accessToken);

  for (i = 0; i < playlistData.length; i++) {
    const track = playlistData[i];
    const artistGenreArray = artistGenres[i];

    const hasMatchingGenre = artistGenreArray.some((genre) =>
      wantedGenres.includes(genre)
    );

    if (hasMatchingGenre) {
      matchedSongs.push(track);
    }
  }
  console.log(matchedSongs);

  const loadPlaylistBtn = document.querySelector('#load-pl-btn');
  loadPlaylistBtn.addEventListener('click', () => {
    createPlaylistOnUI(matchedSongs);
  });

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

// https://gitdela.github.io/spotify-playlists/main.html
