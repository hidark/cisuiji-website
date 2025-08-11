// Simple script to add test words to the extension for testing learning mode
// Run this in the browser console when the extension popup is open

async function addTestWords() {
  const testWords = [
    {
      text: 'example',
      language: 'en',
      definition: '例子，示例',
      partOfSpeech: ['noun'],
      source: [{
        title: 'Test Page',
        url: 'https://test.com',
        addedAt: Date.now()
      }],
      context: {
        sentence: 'This is an example sentence.',
        position: [10, 17]
      }
    },
    {
      text: 'beautiful',
      language: 'en', 
      definition: '美丽的，漂亮的',
      partOfSpeech: ['adjective'],
      source: [{
        title: 'Test Page',
        url: 'https://test.com',
        addedAt: Date.now()
      }],
      context: {
        sentence: 'The beautiful sunset painted the sky.',
        position: [4, 13]
      }
    },
    {
      text: 'knowledge',
      language: 'en',
      definition: '知识，学问',
      partOfSpeech: ['noun'],
      source: [{
        title: 'Test Page', 
        url: 'https://test.com',
        addedAt: Date.now()
      }],
      context: {
        sentence: 'Knowledge is power.',
        position: [0, 9]
      }
    },
    {
      text: 'adventure',
      language: 'en',
      definition: '冒险，历险',
      partOfSpeech: ['noun'],
      source: [{
        title: 'Test Page',
        url: 'https://test.com', 
        addedAt: Date.now()
      }],
      context: {
        sentence: 'Life is a great adventure.',
        position: [17, 26]
      }
    },
    {
      text: 'curious',
      language: 'en',
      definition: '好奇的，求知欲强的',
      partOfSpeech: ['adjective'],
      source: [{
        title: 'Test Page',
        url: 'https://test.com',
        addedAt: Date.now()
      }],
      context: {
        sentence: 'She was curious about everything.',
        position: [8, 15]
      }
    }
  ];

  console.log('Adding test words...');
  
  for (const word of testWords) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ADD_WORD',
        data: word
      });
      console.log(`Added word: ${word.text}`, response);
    } catch (error) {
      console.error(`Failed to add word: ${word.text}`, error);
    }
  }
  
  console.log('Finished adding test words. You can now test the learning mode!');
}

// Run the function
addTestWords();