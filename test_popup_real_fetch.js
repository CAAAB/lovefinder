// Mock browser APIs that are not available in Node.js
global.chrome = {
  tabs: {
    query: async (queryInfo) => {
      console.log('[Mock] chrome.tabs.query called');
      return [{ url: 'https://www.instagram.com/mock_user_profile' }]; // Simulate being on an Instagram page
    },
    create: (options) => {
      console.log(`[Mock] chrome.tabs.create called with URL: ${options.url}`);
    }
  },
  storage: { // Not used by the core fetch logic being tested here, but good to have mocks
    local: {
      get: (keys, callback) => callback({}),
      set: (items, callback) => { if (callback) callback(); }
    }
  }
};

let mockLocalStorageStore = {};
global.localStorage = {
  setItem: (key, value) => {
    console.log(`[Mock localStorage] setItem: key=${key}, value=${value.substring(0,100)}...`); // Log truncated value
    mockLocalStorageStore[key] = value.toString();
  },
  getItem: (key) => mockLocalStorageStore[key] || null,
  removeItem: (key) => delete mockLocalStorageStore[key],
  clear: () => mockLocalStorageStore = {}
};

global.document = {
  getElementById: (id) => {
    console.log(`[Mock document] getElementById called for: ${id}`);
    if (id === 'usernames') {
      return { value: 'instagram' }; // Use "instagram" as the test username
    }
    if (id === 'loadingSpinner') {
      return { style: { display: 'none' } };
    }
    return { addEventListener: () => {} };
  }
};

global.alert = (message) => {
  console.log(`[Mock alert] ${message}`);
  global.lastAlertMessage = message;
};

// --- Start of COPIED AND PASTED functions from actual popup.js ---
// Ensure these are identical to the ones in the actual extension's popup.js

async function fetchFollowers(username) {
  const userId = await getUserId(username);
  if (!userId) {
    console.error(`Could not get userId for ${username}`);
    throw new Error(`Could not get userId for ${username}`);
  }
  console.log(`Fetching followers for ${username} (ID: ${userId})`);
  let followers = [];
  let after = null;
  let has_next = true;
  let pageCount = 0;

  while (has_next && pageCount < 2) { // Limiting pages for testing to avoid long runs / rate limits
    console.log(`Fetching followers page ${pageCount + 1} for ${username}, after: ${after}`);
    const res = await fetchFollowersPage(userId, after);
    if (!res.ok) {
        const errorText = await res.text();
        console.error(`Error fetching followers page: ${res.status}`, errorText);
        throw new Error(`Failed to fetch followers page: ${res.status}`);
    }
    const json = await res.json();

    if (!json.data || !json.data.user || !json.data.user.edge_followed_by) {
        console.warn('Unexpected JSON structure for followers:', json);
        has_next = false; // Stop if structure is not as expected
        break;
    }

    has_next = json.data.user.edge_followed_by.page_info.has_next_page;
    after = json.data.user.edge_followed_by.page_info.end_cursor;
    const newFollowers = json.data.user.edge_followed_by.edges.map(({ node }) => ({
      username: node.username,
      full_name: node.full_name
    }));
    followers = followers.concat(newFollowers);
    console.log(`Got ${newFollowers.length} new followers. Total now: ${followers.length}`);
    pageCount++;

    const randomDelay = Math.floor(Math.random() * 401) + 100; // 100-500ms
    console.log(`Waiting for ${randomDelay}ms...`);
    await new Promise(resolve => setTimeout(resolve, randomDelay));
  }
  console.log(`Finished fetching followers for ${username}. Total: ${followers.length}`);
  return followers;
}

async function fetchFollowings(username) {
  const userId = await getUserId(username);
   if (!userId) {
    console.error(`Could not get userId for ${username}`);
    throw new Error(`Could not get userId for ${username}`);
  }
  console.log(`Fetching followings for ${username} (ID: ${userId})`);
  let followings = [];
  let after = null;
  let has_next = true;
  let pageCount = 0;

  while (has_next && pageCount < 2) { // Limiting pages for testing
    console.log(`Fetching followings page ${pageCount + 1} for ${username}, after: ${after}`);
    const res = await fetchFollowingsPage(userId, after);
     if (!res.ok) {
        const errorText = await res.text();
        console.error(`Error fetching followings page: ${res.status}`, errorText);
        throw new Error(`Failed to fetch followings page: ${res.status}`);
    }
    const json = await res.json();

    if (!json.data || !json.data.user || !json.data.user.edge_follow) {
        console.warn('Unexpected JSON structure for followings:', json);
        has_next = false; // Stop if structure is not as expected
        break;
    }

    has_next = json.data.user.edge_follow.page_info.has_next_page;
    after = json.data.user.edge_follow.page_info.end_cursor;
    const newFollowings = json.data.user.edge_follow.edges.map(({ node }) => ({
      username: node.username,
      full_name: node.full_name
    }));
    followings = followings.concat(newFollowings);
    console.log(`Got ${newFollowings.length} new followings. Total now: ${followings.length}`);
    pageCount++;

    const randomDelay = Math.floor(Math.random() * 401) + 100;
    console.log(`Waiting for ${randomDelay}ms...`);
    await new Promise(resolve => setTimeout(resolve, randomDelay));
  }
  console.log(`Finished fetching followings for ${username}. Total: ${followings.length}`);
  return followings;
}

async function getUserId(username) {
  console.log(`Getting user ID for ${username}...`);
  const url = `https://www.instagram.com/web/search/topsearch/?query=${username}`;
  console.log(`Fetching URL: ${url}`);
  const userQueryRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Instagram Test' }}); // Added User-Agent
  if (!userQueryRes.ok) {
      console.error(`Error fetching user ID: ${userQueryRes.status}`, await userQueryRes.text());
      throw new Error (`Failed to get user ID for ${username}: ${userQueryRes.status}`);
  }
  const userQueryJson = await userQueryRes.json();
  if (userQueryJson.users && userQueryJson.users.length > 0) {
    const userId = userQueryJson.users[0].user.pk;
    console.log(`User ID for ${username} is ${userId}`);
    return userId;
  } else {
    console.warn(`User ${username} not found or no users in response.`);
    return null;
  }
}

async function fetchFollowersPage(userId, after) {
  const variables = {
      id: userId,
      include_reel: true,
      fetch_mutual: true,
      first: 12, // Reduced count for testing
      after: after,
  };
  const url = `https://www.instagram.com/graphql/query/?query_hash=c76146de99bb02f6415203be841dd25a&variables=${encodeURIComponent(JSON.stringify(variables))}`;
  console.log(`Fetching followers page URL: ${url.substring(0,150)}...`);
  return fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Instagram Test' }});
}

async function fetchFollowingsPage(userId, after) {
  const variables = {
      id: userId,
      include_reel: true,
      fetch_mutual: true,
      first: 12, // Reduced count for testing
      after: after,
  };
  const url = `https://www.instagram.com/graphql/query/?query_hash=d04b0a864b4b54837c0d870b0e77e076&variables=${encodeURIComponent(JSON.stringify(variables))}`;
  console.log(`Fetching followings page URL: ${url.substring(0,150)}...`);
  return fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Instagram Test' }});
}
// --- End of COPIED AND PASTED functions ---


// --- Copied and adapted simulation logic from test_popup_logic.js ---
const testMode = false; // THIS IS THE KEY CHANGE FOR PART 3

async function simulateFetchFollowersClickReal() {
  console.log('Simulating fetchFollowersBtn click (testMode=false)...');
  const usernamesText = document.getElementById('usernames').value;
  const usernames = usernamesText.trim().split('\n').filter(username => username.trim() !== '');

  if (usernames.length === 0) {
    alert('Please enter at least one username.');
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.url.includes('instagram.com')) {
    alert('Please navigate to Instagram to start the download.');
    return;
  }

  document.getElementById('loadingSpinner').style.display = 'block';
  const fetchResults = [];

  for (const username of usernames) {
    try {
      let followers, followings;
      console.log(`Processing ${username} with testMode = ${testMode}`);
      if (testMode) { // This branch should NOT be taken
        followers = [];
        followings = [];
      } else {
        // Actual fetch calls will happen here
        followers = await fetchFollowers(username);
        followings = await fetchFollowings(username);
      }

      const dontFollowMeBack = followings.filter(following =>
        !followers.some(follower => follower.username === following.username)
      );

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace(/T/, '_');
      const filename = `${username}&${timestamp}.json`;
      const combinedData = { followers, followings, dontFollowMeBack };
      fetchResults.push({ filename, combinedData });
      localStorage.setItem(filename, JSON.stringify(combinedData));
      console.log(`Data fetched and saved for ${username}. Followers: ${followers.length}, Followings: ${followings.length}`);
    } catch (err) {
      console.error(`Error downloading data for ${username} in simulation:`, err.message);
      // Check if err.stack is available and log it for more details
      if (err.stack) {
          console.error("Stack trace:", err.stack);
      }
      alert(`Failed to download data for ${username}. See console for details.`);
    }
  }

  document.getElementById('loadingSpinner').style.display = 'none';
  localStorage.setItem('watchlistUsernames', usernamesText);
  alert('Download process finished for all selected users. Opening main page.');
  chrome.tabs.create({ url: 'main.html' });
  console.log('Simulation finished.');
  console.log('Mocked localStorage content:', mockLocalStorageStore);
}

// Run the simulation
simulateFetchFollowersClickReal();
