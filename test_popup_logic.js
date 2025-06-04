// Mock browser APIs that are not available in Node.js
global.chrome = {
  tabs: {
    query: async (queryInfo) => {
      console.log('[Mock] chrome.tabs.query called');
      return [{ url: 'https://www.instagram.com/mock_user_profile' }];
    },
    create: (options) => {
      console.log(`[Mock] chrome.tabs.create called with URL: ${options.url}`);
    }
  },
  storage: {
    local: {
      get: (keys, callback) => {
        console.log('[Mock] chrome.storage.local.get called');
        callback({}); // Simulate no stored uniqueCode
      },
      set: (items, callback) => {
        console.log('[Mock] chrome.storage.local.set called');
        if (callback) callback();
      }
    }
  }
};

let mockLocalStorageStore = {};
global.localStorage = {
  setItem: (key, value) => {
    console.log(`[Mock localStorage] setItem: key=${key}`);
    mockLocalStorageStore[key] = value.toString();
  },
  getItem: (key) => {
    console.log(`[Mock localStorage] getItem: key=${key}`);
    return mockLocalStorageStore[key] || null;
  },
  removeItem: (key) => {
    console.log(`[Mock localStorage] removeItem: key=${key}`);
    delete mockLocalStorageStore[key];
  },
  clear: () => {
    console.log('[Mock localStorage] clear');
    mockLocalStorageStore = {};
  }
};

global.document = {
  getElementById: (id) => {
    console.log(`[Mock document] getElementById called for: ${id}`);
    if (id === 'usernames') {
      return { value: 'testuser1' }; // Simulate textarea input
    }
    if (id === 'loadingSpinner') {
      return { style: { display: 'none' } };
    }
    // Add other elements if needed by the script logic being tested
    return {
        addEventListener: (event, func) => {
            console.log(`[Mock document] addEventListener for ${id} and event ${event}`);
        }
    };
  }
};

global.alert = (message) => {
  console.log(`[Mock alert] ${message}`);
  global.lastAlertMessage = message; // Store last alert for verification
};

// --- Start of copied and adapted popup.js logic ---
const testMode = true; // Ensure this is true for Part 1

async function simulateFetchFollowersClick() {
  console.log('Simulating fetchFollowersBtn click...');
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
      if (testMode) {
        console.log(`Processing ${username} in testMode`);
        followers = [];
        followings = [];
      } else {
        // This part would normally call fetchFollowers/fetchFollowings
        // which make actual network requests. For Node.js test,
        // we'd need to mock these or ensure testMode = true.
        console.log(`Processing ${username} not in testMode (requires network mocks if run)`);
        // For this test, we assume testMode is true, so this branch isn't critical
        followers = [{username: 'dummy', full_name: 'Dummy User'}]; // Placeholder if somehow testMode was false
        followings = [];
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
      localStorage.setItem(filename, JSON.stringify(combinedData));
      console.log(`Data generated and saved for ${username}.`);
    } catch (err) {
      console.error(`Error processing data for ${username}:`, err);
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
simulateFetchFollowersClick();

// --- End of copied and adapted popup.js logic ---
