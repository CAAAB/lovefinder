// Mock browser APIs for main.js
let mockLocalStorageStore = {
  // Simulate the localStorage content from Part 1
  // The exact timestamp will differ, so use a placeholder format for the key
  'testuser1&YYYY-MM-DD_HH-MM-SS-MSZ.json': JSON.stringify({
    followers: [],
    followings: [],
    dontFollowMeBack: []
  }),
  'watchlistUsernames': 'testuser1' // Though main.js doesn't directly use this for file list
};

// It's important that the key matches what main.js expects (username&timestamp.json)
// For the test, let's use a predictable key based on the previous simulation.
// If the previous simulation output was: 'testuser1&2025-06-04_10-38-34-482Z.json'
// Then use that exact key here. For a generic test, I'll make one up.
// Re-evaluating: The exact timestamp is crucial. I will use the one from the previous output for consistency.
// The previous output was: 'testuser1&2025-06-04_10-38-34-482Z.json'
mockLocalStorageStore = {
  'testuser1&2025-06-04_10-38-34-482Z.json': JSON.stringify({
    followers: [],
    followings: [],
    dontFollowMeBack: []
  }),
  'watchlistUsernames': 'testuser1'
};


global.localStorage = {
  getItem: (key) => {
    console.log(`[Mock localStorage] getItem: key=${key}`);
    return mockLocalStorageStore[key] || null;
  },
  setItem: (key, value) => { // Not strictly needed for this test part, but good to have
    console.log(`[Mock localStorage] setItem: key=${key}`);
    mockLocalStorageStore[key] = value.toString();
  },
  removeItem: (key) => {
    delete mockLocalStorageStore[key];
  },
  clear: () => {
    mockLocalStorageStore = {};
  },
  // main.js uses Object.keys(localStorage) which works on the object itself,
  // but in Node, global.localStorage needs to be the actual store or have a keys() method.
  // For simplicity, we'll make sure Object.keys(global.localStorage) works.
  // So, directly assign methods and properties to global.localStorage
  ...mockLocalStorageStore // Spread the store keys for Object.keys to work
};
// To make Object.keys(localStorage) work as expected in main.js
// we need localStorage to be the store itself, or an object that has the keys.
// The above spread only works if these are enumerable properties of global.localStorage.
// A more robust way for Node is to mock the `key(index)` and `length` property or make localStorage the store.
// Let's redefine localStorage to be the store itself for this test, as main.js uses Object.keys(localStorage)
global.localStorage = mockLocalStorageStore;


let mockFileList = {
  innerHTML: '',
  children: [],
  appendChild: function(element) {
    this.children.push(element);
    // Simulate innerHTML for basic verification
    this.innerHTML += element.outerHTML || `[${element.tagName || 'div'}]`;
  },
  style: {} // For userList.style.paddingLeft
};

global.document = {
  getElementById: (id) => {
    if (id === 'fileList') {
      console.log('[Mock document] getElementById for fileList');
      return mockFileList;
    }
    // Add other elements if needed by populateFileBrowser's deeper interactions
    return {
        addEventListener: () => {},
        style: {}, // General fallback for style properties
    };
  },
  createElement: (tagName) => {
    console.log(`[Mock document] createElement: ${tagName}`);
    const element = {
      tagName: tagName.toUpperCase(),
      classList: { add: () => {}, toggle: () => {} },
      style: {},
      dataset: {},
      children: [],
      textContent: '',
      appendChild: function(child) { this.children.push(child); },
      addEventListener: () => {},
      // Simulate outerHTML for debugging
      get outerHTML() {
        return `<${this.tagName}>${this.textContent || this.children.map(c => c.outerHTML || '').join('')}</${this.tagName}>`;
      }
    };
    if (tagName === 'span') {
        element.classList.add = function(cn) { this.className = (this.className || "") + " " + cn; };
        element.classList.toggle = function(cn, force) { /* mock */};
    }
    return element;
  },
  createTextNode: (text) => {
    return { textContent: text, nodeType: 3, outerHTML: text };
  }
};

global.URL = {
  createObjectURL: (blob) => {
    console.log('[Mock URL] createObjectURL called');
    return 'blob:mockurl/' + Date.now();
  },
  revokeObjectURL: (url) => {
    console.log(`[Mock URL] revokeObjectURL called for ${url}`);
  }
};


// --- Start of copied main.js populateFileBrowser function ---
// (and its dependencies if any, but it seems self-contained for list population)
function populateFileBrowser() {
  const fileList = document.getElementById('fileList');
  fileList.innerHTML = ''; // Clear previous content
  fileList.children = []; // Also clear mock children

  const files = Object.keys(localStorage); // localStorage here is our mock store
  console.log('[populateFileBrowser] Files from localStorage:', files);
  const userFiles = {};

  files.forEach(key => {
    if (key === 'watchlistUsernames') return; // Skip this metadata key

    const parts = key.split('&');
    if (parts.length >= 2) {
        const username = parts[0];
        // Reconstruct timestamp if it was part of the filename after username&
        const timestampAndJson = parts.slice(1).join('&');
        // Ensure .json is part of the timestamp for matching
        if (timestampAndJson.endsWith('.json')) {
            const timestamp = timestampAndJson.substring(0, timestampAndJson.length - '.json'.length);
            if (!userFiles[username]) {
                userFiles[username] = [];
            }
            userFiles[username].push({ key, timestamp });
        }
    }
  });

  console.log('[populateFileBrowser] Parsed userFiles:', userFiles);

  for (const username in userFiles) {
    userFiles[username].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  for (const username in userFiles) {
    const userContainer = document.createElement('div');
    const collapseIcon = document.createElement('span');
    collapseIcon.textContent = '>';
    collapseIcon.classList.add('collapse-icon');
    collapseIcon.style.cursor = 'pointer';
    collapseIcon.classList.add('open');

    const userHeader = document.createElement('h4');
    userHeader.textContent = username;
    userHeader.classList.add('user-header');

    const userList = document.createElement('ul');
    userList.style.paddingLeft = '20px';

    userFiles[username].forEach(({ key, timestamp }) => {
      const fileLi = document.createElement('li');
      const downloadIcon = document.createElement('span');
      downloadIcon.classList.add('download-icon');

      fileLi.appendChild(downloadIcon);
      fileLi.appendChild(document.createTextNode(timestamp)); // Just the timestamp part
      fileLi.dataset.key = key;
      fileLi.dataset.timestamp = timestamp;
      fileLi.dataset.type = 'combined';
      userList.appendChild(fileLi);
    });

    userContainer.appendChild(collapseIcon);
    userContainer.appendChild(userHeader);
    userContainer.appendChild(userList);
    fileList.appendChild(userContainer);
  }
  console.log('[populateFileBrowser] Finished. Mock fileList structure:', JSON.stringify(mockFileList.children, null, 2));
}
// --- End of copied main.js populateFileBrowser function ---

// Run the simulation
populateFileBrowser();

// For verification:
console.log("Final mockFileList.innerHTML snippet:", mockFileList.innerHTML.substring(0, 500));
const mainUserFile = mockFileList.children.find(child => child.children && child.children.find(subChild => subChild.tagName === 'H4' && subChild.textContent === 'testuser1'));
if (mainUserFile) {
    const ul = mainUserFile.children.find(child => child.tagName === 'UL');
    if (ul && ul.children.length > 0) {
        console.log(`File list item for testuser1 found. Timestamp text: ${ul.children[0].children[1].textContent}`);
    } else {
        console.log("File list for testuser1 not populated as expected or UL not found.");
    }
} else {
    console.log("User container for 'testuser1' not found in mockFileList.");
}
