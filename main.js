document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('fileUpload').addEventListener('change', () => {
    const files = document.getElementById('fileUpload').files;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = function(event) {
        try {
          const data = JSON.parse(event.target.result);
          const key = file.name;
          localStorage.setItem(key, JSON.stringify(data));
          console.log(`Uploaded and saved: ${key}`);
          populateFileBrowser();
        } catch (error) {
          console.error('Error parsing file:', error);
          alert('Error uploading file. Please ensure it is a valid JSON file.');
        }
      };
      reader.readAsText(file);
    });

    populateFileBrowser();
  });

  function populateFileBrowser() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';

    const files = Object.keys(localStorage);
    const userFiles = {};

    files.forEach(key => {
      const [username, timestamp] = key.split('&');
      if (username && timestamp) {
        if (!userFiles[username]) {
          userFiles[username] = [];
        }
        userFiles[username].push({ key, timestamp });
      }
    });

    // Sort files by date for each user
    for (const username in userFiles) {
      userFiles[username].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }

    // Create file browser structure
    for (const username in userFiles) {
      const userContainer = document.createElement('div');
      const collapseIcon = document.createElement('span');
      collapseIcon.textContent = '>';
      collapseIcon.classList.add('collapse-icon');
      collapseIcon.style.cursor = 'pointer';
      collapseIcon.classList.add('open'); // Default to open
      collapseIcon.addEventListener('click', () => {
        userList.style.display = userList.style.display === 'none' ? 'block' : 'none';
        collapseIcon.classList.toggle('open', userList.style.display === 'block');
      });

      const userHeader = document.createElement('h4');
      userHeader.textContent = username;
      userHeader.classList.add('user-header');
      userHeader.addEventListener('click', () => {
        console.log(`Selected user: ${username}`);
        selectUser(username);
      });

      const userList = document.createElement('ul');
      userList.style.paddingLeft = '20px';

      userFiles[username].forEach(({ key, timestamp }) => {
        const fileLi = document.createElement('li');

        // Create download icon
        const downloadIcon = document.createElement('span');
        downloadIcon.classList.add('download-icon');
        downloadIcon.addEventListener('click', () => {
          const data = localStorage.getItem(key);
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = key;
          a.click();
          URL.revokeObjectURL(url);
        });

        fileLi.appendChild(downloadIcon);
        fileLi.appendChild(document.createTextNode(timestamp));
        fileLi.dataset.key = key;
        fileLi.dataset.timestamp = timestamp; // Store timestamp for comparison
        fileLi.dataset.type = 'combined';
        fileLi.addEventListener('click', () => {
          const selectedFiles = document.querySelectorAll('.file-browser li.selected');
          if (selectedFiles.length >= 2 && !fileLi.classList.contains('selected')) {
            // Find the oldest selected file and unselect it
            let oldestSelected = selectedFiles[0];
            selectedFiles.forEach(selectedFile => {
              if (selectedFile.dataset.timestamp < oldestSelected.dataset.timestamp) {
                oldestSelected = selectedFile;
              }
            });
            oldestSelected.classList.remove('selected');
          }
          fileLi.classList.toggle('selected');
          checkAndCompareFiles();
        });
        userList.appendChild(fileLi);
      });

      userContainer.appendChild(collapseIcon);
      userContainer.appendChild(userHeader);
      userContainer.appendChild(userList);
      fileList.appendChild(userContainer);
    }
  }

  function selectUser(username) {
    // Remove selection from all users
    const allUserHeaders = document.querySelectorAll('.user-header');
    allUserHeaders.forEach(header => {
      header.classList.remove('selected');
    });

    // Add selection to the clicked user
    const selectedUserHeader = Array.from(allUserHeaders).find(header => header.textContent === username);
    if (selectedUserHeader) {
      selectedUserHeader.classList.add('selected');
    }
  }

  function checkAndCompareFiles() {
    const selectedFiles = document.querySelectorAll('.file-browser li.selected');
    if (selectedFiles.length === 2) {
      compareFiles(selectedFiles);
    } else {
      document.getElementById('comparisonResults').innerHTML = '';
    }
  }

  function compareFiles(selectedFiles) {
    const file1Key = selectedFiles[0].dataset.key;
    const file2Key = selectedFiles[1].dataset.key;

    const file1Username = file1Key.split('&')[0];
    const file2Username = file2Key.split('&')[0];

    if (file1Username !== file2Username) {
      // Different usernames, find common people
      const file1Data = JSON.parse(localStorage.getItem(file1Key));
      const file2Data = JSON.parse(localStorage.getItem(file2Key));

      const commonFollowers = findCommonPeople(file1Data.followers, file2Data.followers);
      const commonFollowings = findCommonPeople(file1Data.followings, file2Data.followings);

      displayCommonPeople(commonFollowers, commonFollowings);
    } else {
      const file1Timestamp = file1Key.split('&')[1];
      const file2Timestamp = file2Key.split('&')[1];

      let oldData, newData;
      if (file1Timestamp < file2Timestamp) {
        oldData = JSON.parse(localStorage.getItem(file1Key));
        newData = JSON.parse(localStorage.getItem(file2Key));
      } else {
        oldData = JSON.parse(localStorage.getItem(file2Key));
        newData = JSON.parse(localStorage.getItem(file1Key));
      }

      const dataTypes = ['followers', 'followings'];
      const comparisonResults = {};

      dataTypes.forEach(dataType => {
        comparisonResults[dataType] = compareData(oldData, newData, dataType);
      });

      displayComparisonResults(comparisonResults);
    }
  }

  function findCommonPeople(list1, list2) {
    return list1.filter(user1 =>
      list2.some(user2 => user2.username === user1.username)
    );
  }

  function createCollapsibleList(title, users, color) {
    const container = document.createElement('div');
    const header = document.createElement('h4');
    header.textContent = title;
    header.style.cursor = 'pointer';
    header.style.color = color;

    const collapseIcon = document.createElement('span');
    collapseIcon.classList.add('collapse-icon');
    collapseIcon.textContent = '>';
    header.prepend(collapseIcon);

    header.addEventListener('click', () => {
      list.style.display = list.style.display === 'none' ? 'block' : 'none';
      collapseIcon.classList.toggle('open', list.style.display === 'block');
    });

    const list = document.createElement('ul');
    list.style.paddingLeft = '20px';

    users.forEach(user => {
      const li = document.createElement('li');
      li.appendChild(document.createTextNode(`${user.username} - ${user.full_name}`));
      li.style.color = color;
      li.style.cursor = 'pointer';

      // Add event listener to open Instagram profile in a new window
      li.addEventListener('click', () => {
        window.open(`https://www.instagram.com/${user.username}`, '_blank');
      });

      list.appendChild(li);
    });

    container.appendChild(header);
    container.appendChild(list);
    return container;
  }

  function displayCommonPeople(commonFollowers, commonFollowings) {
    const resultsDiv = document.getElementById('comparisonResults');
    resultsDiv.innerHTML = '';

    // Display common followers
    const commonFollowersTitle = `Common Followers (${commonFollowers.length})`;
    const commonFollowersList = createCollapsibleList(commonFollowersTitle, commonFollowers, 'blue');
    resultsDiv.appendChild(commonFollowersList);

    // Display common followings
    const commonFollowingsTitle = `Common Followings (${commonFollowings.length})`;
    const commonFollowingsList = createCollapsibleList(commonFollowingsTitle, commonFollowings, 'blue');
    resultsDiv.appendChild(commonFollowingsList);
  }

  function displayComparisonResults(comparisonResults) {
    const resultsDiv = document.getElementById('comparisonResults');
    resultsDiv.innerHTML = '';

    // Display new followers
    const newFollowersTitle = `New followers (${comparisonResults.followers.newUsers.length})`;
    const newFollowersList = createCollapsibleList(newFollowersTitle, comparisonResults.followers.newUsers, 'green');
    resultsDiv.appendChild(newFollowersList);

    // Display new followings
    const newFollowingsTitle = `Newly following (${comparisonResults.followings.newUsers.length})`;
    const newFollowingsList = createCollapsibleList(newFollowingsTitle, comparisonResults.followings.newUsers, 'green');
    resultsDiv.appendChild(newFollowingsList);

    // Display lost followers
    const lostFollowersTitle = `No longer followed by (${comparisonResults.followers.lostUsers.length})`;
    const lostFollowersList = createCollapsibleList(lostFollowersTitle, comparisonResults.followers.lostUsers, 'red');
    resultsDiv.appendChild(lostFollowersList);

    // Display lost followings
    const lostFollowingsTitle = `No longer following (${comparisonResults.followings.lostUsers.length})`;
    const lostFollowingsList = createCollapsibleList(lostFollowingsTitle, comparisonResults.followings.lostUsers, 'red');
    resultsDiv.appendChild(lostFollowingsList);
  }

  function compareData(oldData, newData, dataType) {
    const newUsers = newData[dataType].filter(user =>
      !oldData[dataType].some(oldUser => oldUser.username === user.username)
    );

    const lostUsers = oldData[dataType].filter(user =>
      !newData[dataType].some(newUser => newUser.username === user.username)
    );

    return {
      newUsers,
      lostUsers
    };
  }

  // Initial population of the file browser
  populateFileBrowser();
});
