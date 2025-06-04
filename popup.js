const testMode = false; // Set this to false to enable fetching

document.getElementById('openMainPageBtn').addEventListener('click', () => {
  // Open the main page
  chrome.tabs.create({ url: 'main.html' });
});

document.getElementById('fetchFollowersBtn').addEventListener('click', async () => {
  const usernamesText = document.getElementById('usernames').value;
  const usernames = usernamesText.trim().split('\n').filter(username => username.trim() !== '');

  if (usernames.length === 0) {
    alert('Please enter at least one username.');
    return;
  }

  // Check if the user is on Instagram
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.url.includes('instagram.com')) {
    alert('Please navigate to Instagram to start the download.');
    return;
  }

  // Show loading spinner
  document.getElementById('loadingSpinner').style.display = 'block';

  const fetchResults = [];

  for (const username of usernames) {
    try {
      let followers, followings;
      if (testMode) {
        followers = [];
        followings = [];
      } else {
        followers = await fetchFollowers(username);
        followings = await fetchFollowings(username);
      }

      const dontFollowMeBack = followings.filter(following =>
        !followers.some(follower => follower.username === following.username)
      );

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace(/T/, '_');
      const filename = `${username}&${timestamp}.json`;

      const combinedData = {
        followers,
        followings,
        dontFollowMeBack
      };

      fetchResults.push({ filename, combinedData });

      // Save to local storage
      localStorage.setItem(filename, JSON.stringify(combinedData));

      console.log(`Data downloaded and saved for ${username}.`);
    } catch (err) {
      console.error(`Error downloading data for ${username}:`, err);
      alert(`Failed to download data for ${username}. See console for details.`);
    }
  }

  // Hide loading spinner
  document.getElementById('loadingSpinner').style.display = 'none';

  // Save usernames to local storage
  localStorage.setItem('watchlistUsernames', usernamesText);

  alert('Download process finished for all selected users. Opening main page.');
  // Open the main page after fetching is complete
  chrome.tabs.create({ url: 'main.html' });
});

async function fetchFollowers(username) {
  const userId = await getUserId(username);
  let followers = [];
  let after = null;
  let has_next = true;

  while (has_next) {
    const res = await fetchFollowersPage(userId, after);
    const json = await res.json();
    has_next = json.data.user.edge_followed_by.page_info.has_next_page;
    after = json.data.user.edge_followed_by.page_info.end_cursor;
    const newFollowers = json.data.user.edge_followed_by.edges.map(({ node }) => ({
      username: node.username,
      full_name: node.full_name
      //profile_pic_url: node.profile_pic_url // Add profile URL here
    }));
    followers = followers.concat(newFollowers);

    // Introduce a random delay between 100ms and 500ms
    const randomDelay = Math.floor(Math.random() * 401) + 100;
    await new Promise(resolve => setTimeout(resolve, randomDelay));
  }

  return followers;
}

async function fetchFollowings(username) {
  const userId = await getUserId(username);
  let followings = [];
  let after = null;
  let has_next = true;

  while (has_next) {
    const res = await fetchFollowingsPage(userId, after);
    const json = await res.json();
    has_next = json.data.user.edge_follow.page_info.has_next_page;
    after = json.data.user.edge_follow.page_info.end_cursor;
    const newFollowings = json.data.user.edge_follow.edges.map(({ node }) => ({
      username: node.username,
      full_name: node.full_name
      //profile_pic_url: node.profile_pic_url // Add profile URL here
    }));
    followings = followings.concat(newFollowings);

    // Introduce a random delay between 100ms and 500ms
    const randomDelay = Math.floor(Math.random() * 401) + 100;
    await new Promise(resolve => setTimeout(resolve, randomDelay));
  }

  return followings;
}

async function getUserId(username) {
  const userQueryRes = await fetch(
    `https://www.instagram.com/web/search/topsearch/?query=${username}`
  );
  const userQueryJson = await userQueryRes.json();
  return userQueryJson.users[0].user.pk;
}

async function fetchFollowersPage(userId, after) {
  return fetch(
    `https://www.instagram.com/graphql/query/?query_hash=c76146de99bb02f6415203be841dd25a&variables=` +
      encodeURIComponent(
        JSON.stringify({
          id: userId,
          include_reel: true,
          fetch_mutual: true,
          first: 100,
          after: after,
        })
      )
  );
}

async function fetchFollowingsPage(userId, after) {
  return fetch(
    `https://www.instagram.com/graphql/query/?query_hash=d04b0a864b4b54837c0d870b0e77e076&variables=` +
      encodeURIComponent(
        JSON.stringify({
          id: userId,
          include_reel: true,
          fetch_mutual: true,
          first: 100,
          after: after,
        })
      )
  );
}
