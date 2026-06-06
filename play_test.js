import puppeteer from 'puppeteer';

async function run() {
  console.log('Launching browser for comprehensive automated play-test...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Log browser console logs
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

  console.log('Navigating to http://localhost:3001/...');
  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });

  // Helper to wait and click by button text
  const clickButtonByText = async (text) => {
    console.log(`Clicking button: "${text}"`);
    await page.evaluate((btnText) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const target = buttons.find(b => b.textContent.includes(btnText));
      if (target) {
        target.click();
      } else {
        throw new Error(`Button with text "${btnText}" not found!`);
      }
    }, text);
    await new Promise(r => setTimeout(r, 1000));
  };

  // Helper to click skill toggles
  const clickSkillToggle = async (skillName) => {
    console.log(`Toggling skill: "${skillName}"`);
    await page.evaluate((name) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const target = buttons.find(b => b.textContent.trim() === name);
      if (target) {
        target.click();
      } else {
        throw new Error(`Skill button "${name}" not found!`);
      }
    }, skillName);
    await new Promise(r => setTimeout(r, 200));
  };

  // Helper to submit text inputs in the player command area
  const submitPlayerCommand = async (commandText, waitTime = 5000) => {
    console.log(`Submitting player command: "${commandText}"`);
    await page.waitForSelector('form input[type="text"]');
    await page.type('form input[type="text"]', commandText);
    await new Promise(r => setTimeout(r, 200));
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, waitTime)); // wait for action response
  };

  try {
    // --- 1. CHARACTER CREATION FLOW ---
    console.log('\n--- STARTING CHARACTER CREATION FLOW ---');
    await clickButtonByText('Nord');
    await clickButtonByText('Warrior');
    await clickButtonByText('Skyrim');

    console.log('Name Input...');
    await page.waitForSelector('input[aria-label="Character Name"]');
    await page.type('input[aria-label="Character Name"]', 'Aldor');
    await clickButtonByText('Set Name');

    console.log('Backstory Input...');
    await page.waitForSelector('textarea[aria-label="Character Backstory"]');
    await page.type('textarea[aria-label="Character Backstory"]', 'A former Imperial soldier returning home to Skyrim.');
    await clickButtonByText('Set Backstory');

    console.log('Attributes Assignment...');
    await page.waitForSelector('button[aria-label="Increase Strength"]');
    for (let i = 0; i < 13; i++) {
      await page.click('button[aria-label="Increase Strength"]');
      await new Promise(r => setTimeout(r, 50));
    }
    await clickButtonByText('Confirm Attributes');

    console.log('Major Skills Selection...');
    await clickSkillToggle('One-Handed');
    await clickSkillToggle('Block');
    await clickSkillToggle('Heavy Armor');
    await clickSkillToggle('Smithing');
    await clickButtonByText('Confirm Major Skills');

    console.log('Minor Skills Selection...');
    await clickSkillToggle('Two-Handed');
    await clickSkillToggle('Archery');
    await clickSkillToggle('Speech');
    await clickSkillToggle('Light Armor');
    await clickSkillToggle('Restoration');
    await clickSkillToggle('Alchemy');
    await clickButtonByText('Confirm Minor Skills');

    console.log('Age Group Selection...');
    await clickButtonByText('Young Adult');

    console.log('Hair Color...');
    await page.waitForSelector('input[aria-label="Character Hair Color"]');
    await page.type('input[aria-label="Character Hair Color"]', 'Dark Brown');
    await clickButtonByText('Set Hair Color');

    console.log('Features Input...');
    await page.waitForSelector('input[aria-label="Distinguishing Features or Vibe"]');
    await page.type('input[aria-label="Distinguishing Features or Vibe"]', 'A scarred lip');
    await clickButtonByText('Set Features/Vibe');

    console.log('Presentation Selection...');
    await clickButtonByText('Masculine');

    console.log('Final Character Confirmation...');
    await clickButtonByText('Confirm & Begin Adventure!');

    console.log('Waiting for Storyteller introduction (15 seconds)...');
    await new Promise(r => setTimeout(r, 15000));
    await page.screenshot({ path: 'public/test_1_intro.png' });

    // --- 2. GAMEPLAY TURN ---
    console.log('\n--- STARTING GAMEPLAY TURN ---');
    await submitPlayerCommand('look around to see my surroundings.', 10000);
    await page.screenshot({ path: 'public/test_2_gameplay.png' });

    // --- MAP VERIFICATION STEP ---
    console.log('\n--- TESTING MAP INTERACTION ---');
    await clickButtonByText('map');
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'public/test_map_panel.png' });

    console.log('Opening Map Modal...');
    await page.click('[aria-label="Click to view larger map"]');
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'public/test_map_modal.png' });

    console.log('Closing Map Modal...');
    await page.click('[aria-label="Close map"]');
    await new Promise(r => setTimeout(r, 500));
    await clickButtonByText('inve');

    // --- SAVE SLOT SYSTEM TESTING PART 1 ---
    console.log('\n--- TESTING SAVE/LOAD MANAGER (PART 1) ---');
    await clickButtonByText('Saves');
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'public/test_save_modal_open.png' });

    console.log('Saving to Slot 1...');
    await page.click('#save-btn-slot_1');
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'public/test_save_slot_1_done.png' });

    console.log('Closing saves modal...');
    await page.click('#close-save-load-modal-btn');
    await new Promise(r => setTimeout(r, 500));

    // --- 3. DEBUG SYSTEM & SURVIVAL MECHANICS ---
    console.log('\n--- TESTING SYSTEM MECHANICS (DEBUG MODE) ---');
    await submitPlayerCommand('DM: debug mode on', 1000);
    
    // Add Septims
    console.log('Testing adding septims...');
    await submitPlayerCommand('DM: debug addseptims 100', 1000);
    
    // Skillup
    console.log('Testing skill increase...');
    await submitPlayerCommand('DM: debug skillup Block 5', 2000);

    // Set Hunger
    console.log('Setting hunger and spawning sweetroll...');
    await submitPlayerCommand('DM: debug sethunger 80', 1000);
    await submitPlayerCommand('DM: debug additem {"name":"Sweetroll","description":"A delicious frosted sweetroll.","quantity":2,"isFood":true,"isConsumable":true,"hungerReduction":35}', 2000);

    // Eat Sweetroll
    console.log('Interacting with carried inventory...');
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('#inventory_panel_carried li'));
      const sweetroll = items.find(el => el.innerText.includes('Sweetroll'));
      if (sweetroll) {
        sweetroll.click();
      } else {
        throw new Error('Sweetroll not found in inventory!');
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log('Clicking Eat button...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('#inventory_panel_carried button'));
      const eatBtn = buttons.find(b => b.textContent.trim() === 'Eat');
      if (eatBtn) {
        eatBtn.click();
      } else {
        throw new Error('Eat button not found!');
      }
    });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: 'public/test_3_after_eating.png' });

    // --- 4. WEATHER & COMFORT ---
    console.log('\n--- TESTING WEATHER & COMFORT ENGINE ---');
    await submitPlayerCommand('DM: debug setweather BLIZZARD', 3000);
    await page.screenshot({ path: 'public/test_4_weather.png' });

    // --- 5. NAP MECHANICS ---
    console.log('\n--- TESTING NAP MECHANICS ---');
    await submitPlayerCommand('nap', 5000);
    await page.screenshot({ path: 'public/test_5_nap.png' });

    // --- 6. LEVEL UP PANEL ---
    console.log('\n--- TESTING LEVEL UP SYSTEM ---');
    await submitPlayerCommand('DM: debug levelup', 3000);
    
    // Allocate 7 points to Strength
    console.log('Allocating attribute points...');
    await page.waitForSelector('button[aria-label="Increase Strength"]');
    for (let i = 0; i < 7; i++) {
      await page.click('button[aria-label="Increase Strength"]');
      await new Promise(r => setTimeout(r, 100));
    }
    
    console.log('Confirming level up...');
    await clickButtonByText('Confirm Attribute Increases');
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: 'public/test_6_after_levelup.png' });

    // --- SAVE SLOT SYSTEM TESTING PART 2 ---
    console.log('\n--- TESTING SAVE/LOAD MANAGER (PART 2) ---');
    await clickButtonByText('Saves');
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'public/test_save_modal_open_lvl2.png' });

    console.log('Saving to Slot 2...');
    await page.click('#save-btn-slot_2');
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'public/test_save_slot_2_done.png' });

    console.log('Testing Overwrite Slot 1...');
    await page.click('#save-btn-slot_1'); // triggers overwrite confirm
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'public/test_overwrite_confirm.png' });
    await page.click('#confirm-save-btn-slot_1'); // confirm overwrite
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'public/test_overwrite_done.png' });

    console.log('Testing Delete Slot 1...');
    await page.click('#delete-btn-slot_1'); // triggers delete confirm
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'public/test_delete_confirm.png' });
    await page.click('#confirm-delete-btn-slot_1'); // confirm delete
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'public/test_delete_done.png' });

    console.log('Testing Load Slot 2...');
    await page.click('#load-btn-slot_2');
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'public/test_load_slot_2_done.png' });

    // --- 7. BEDTIME FLOW (END OF DAY SUMMARY & REST) ---
    console.log('\n--- TESTING BEDTIME FLOW ---');
    await submitPlayerCommand('bedtime', 2000);
    
    console.log('Confirming Bedtime Intent...');
    await submitPlayerCommand('yes', 15000);
    await page.screenshot({ path: 'public/test_7_eod_summary.png' });

    console.log('Accepting EOD Summary...');
    await submitPlayerCommand('yes', 15000);
    await page.screenshot({ path: 'public/test_8_new_day.png' });

    // Dump final narrative log
    const finalLog = await page.evaluate(() => {
      const entries = Array.from(document.querySelectorAll('.prose'));
      return entries.map(e => e.innerText);
    });

    console.log('\n--- FINAL STORY NARRATIVE LOG ---');
    finalLog.forEach((entry, idx) => {
      console.log(`[Entry ${idx + 1}]:\n${entry}\n`);
    });

    console.log('\nPLAY-TEST COMPLETED SUCCESSFULLY!');

  } catch (error) {
    console.error('Play-test failed with error:', error);
    await page.screenshot({ path: 'public/test_error.png' });
    console.log('Error screenshot saved to public/test_error.png.');
  }

  await browser.close();
  console.log('Browser closed.');
}

run();
