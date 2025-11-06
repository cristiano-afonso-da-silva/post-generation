// test-api.mjs
// Interactive test script with user input

import readline from 'readline';

const API_URL = 'http://localhost:3000';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask questions
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Helper function to display formatted output
function displayFormatted(text) {
  console.log('\n' + text);
}

// Check server health
async function checkHealth() {
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(`Server not responding: ${error.message}`);
  }
}

// Generate post ideas
async function generateIdeas(accountDescription) {
  console.log('\n🚀 Generating post ideas...\n');
  
  const response = await fetch(`${API_URL}/api/social`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'ideas',
      accountDescription: accountDescription
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    displayFormatted(result.data.formatted);
    console.log(`\n⏱️  Generation time: ${result.meta.generationTime}`);
    return result.data.ideas;
  } else {
    throw new Error(result.error || 'Failed to generate ideas');
  }
}

// Generate carousel from idea
async function generateCarousel(ideaTitle, accountDescription) {
  console.log(`\n🚀 Generating carousel for: "${ideaTitle}"\n`);
  
  const response = await fetch(`${API_URL}/api/social`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'carousel',
      ideaTitle: ideaTitle,
      accountDescription: accountDescription
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    displayFormatted(result.data.formatted);
    console.log('\n📊 STATISTICS:');
    console.log(`   Total Slides: ${result.data.stats.totalSlides}`);
    console.log(`   Hook Words: ${result.data.stats.hookWords}`);
    console.log(`   Middle Slides: ${result.data.stats.middleSlides}`);
    console.log(`   Caption Words: ${result.data.stats.captionWords}`);
    console.log(`   Generation Time: ${result.meta.generationTime}`);
    return result.data;
  } else {
    throw new Error(result.error || 'Failed to generate carousel');
  }
}

// Main interactive flow
async function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('🎨 POST GENERATION API - INTERACTIVE TEST');
  console.log('═'.repeat(80));
  
  try {
    // Check server health
    console.log('\n🏥 Checking server health...');
    const health = await checkHealth();
    console.log(`✅ Server is ${health.status} (Model: ${health.model})`);
    
    // Step 1: Get account description from user
    console.log('\n' + '─'.repeat(80));
    console.log('📝 STEP 1: Enter Your Account Description');
    console.log('─'.repeat(80));
    console.log('\n💡 Example: "productivity coach helping remote workers overcome procrastination"');
    const accountDescription = await askQuestion('\nEnter account description: ');
    
    if (!accountDescription.trim()) {
      console.log('\n❌ Account description cannot be empty!');
      rl.close();
      return;
    }
    
    // Step 2: Generate ideas
    console.log('\n' + '─'.repeat(80));
    console.log('💡 STEP 2: Generating Post Ideas...');
    console.log('─'.repeat(80));
    
    const ideas = await generateIdeas(accountDescription);
    
    // Step 3: Let user choose an idea
    console.log('\n' + '─'.repeat(80));
    console.log('🎯 STEP 3: Choose an Idea for Carousel');
    console.log('─'.repeat(80));
    console.log('\nGenerated ideas:');
    ideas.forEach((idea, index) => {
      console.log(`   ${index + 1}. ${idea}`);
    });
    
    let selectedIndex = -1;
    let selectedIdea = null;
    
    while (selectedIndex < 0 || selectedIndex >= ideas.length) {
      const choice = await askQuestion(`\nEnter number (1-${ideas.length}) to generate carousel, or 'q' to quit: `);
      
      if (choice.toLowerCase() === 'q') {
        console.log('\n👋 Goodbye!\n');
        rl.close();
        return;
      }
      
      selectedIndex = parseInt(choice) - 1;
      
      if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= ideas.length) {
        console.log(`\n❌ Invalid choice. Please enter a number between 1 and ${ideas.length}.`);
      } else {
        selectedIdea = ideas[selectedIndex];
        break;
      }
    }
    
    // Step 4: Generate carousel
    console.log('\n' + '─'.repeat(80));
    console.log('🎨 STEP 4: Generating Carousel...');
    console.log('─'.repeat(80));
    
    const carousel = await generateCarousel(selectedIdea, accountDescription);
    
    // Step 5: Ask if user wants to generate another carousel
    let generateMore = true;
    
    while (generateMore) {
      console.log('\n' + '─'.repeat(80));
      const another = await askQuestion('Generate another carousel from these ideas? (y/n): ');
      
      if (another.toLowerCase() === 'y' || another.toLowerCase() === 'yes') {
        // Show ideas again
        console.log('\nAvailable ideas:');
        ideas.forEach((idea, index) => {
          console.log(`   ${index + 1}. ${idea}`);
        });
        
        const newChoice = await askQuestion(`\nEnter number (1-${ideas.length}) to generate carousel, or 'q' to quit: `);
        
        if (newChoice.toLowerCase() === 'q') {
          generateMore = false;
          break;
        }
        
        const newIndex = parseInt(newChoice) - 1;
        if (!isNaN(newIndex) && newIndex >= 0 && newIndex < ideas.length) {
          await generateCarousel(ideas[newIndex], accountDescription);
        } else {
          console.log(`\n❌ Invalid choice. Please enter a number between 1 and ${ideas.length}.`);
        }
      } else {
        generateMore = false;
      }
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log('✅ All done!');
    console.log('═'.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Make sure the server is running: npm start\n');
  } finally {
    rl.close();
  }
}

// Run the interactive flow
main();
