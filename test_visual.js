const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    console.log('Launching Local Browser...');
    try {
        const browser = await puppeteer.launch({
            headless: false, // VISIBLE MODE
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        console.log('Browser Launched!');

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        console.log('Navigating to game...');
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
        page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

        await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 60000 });
        console.log('Page loaded. waiting for selector...');

        // 1. Enter Name
        console.log('Entering Name...');
        const nameInputSelector = 'input[placeholder="Ex: Ahmet"]';
        await page.waitForSelector(nameInputSelector, { timeout: 10000 });
        await page.type(nameInputSelector, 'VisualTester');

        // 2. Click Create Room
        console.log('Creating Room...');
        // Use evaluate to find button by text
        await page.waitForFunction(() => {
            const btns = [...document.querySelectorAll('button')];
            return btns.some(b => b.innerText.includes('Create New Table'));
        });

        await page.evaluate(() => {
            const btns = [...document.querySelectorAll('button')];
            const btn = btns.find(b => b.innerText.includes('Create New Table'));
            if (btn) btn.click();
        });

        // Wait for Lobby transition (Room ID to appear in URL or on screen)
        console.log('Waiting for Lobby...');
        await page.waitForSelector('.bg-black\\/30', { timeout: 10000 });

        // 3. Add Bots (Click 3 times)
        console.log('Adding Bots...');
        try {
            await page.waitForFunction(() => {
                const btns = [...document.querySelectorAll('button')];
                return btns.some(b => b.innerText.includes('ADD BOT'));
            }, { timeout: 5000 });

            for (let i = 0; i < 3; i++) {
                await page.evaluate(() => {
                    const btns = [...document.querySelectorAll('button')];
                    const btn = btns.find(b => b.innerText.includes('ADD BOT'));
                    if (btn) btn.click();
                });
                console.log(`Bot ${i + 1} added`);
                await new Promise(r => setTimeout(r, 600));
            }
        } catch (e) {
            console.warn('Add Bot fail:', e.message);
        }

        // 4. Start Game
        console.log('Starting Game...');
        try {
            await page.waitForFunction(() => {
                const btns = [...document.querySelectorAll('button')];
                return btns.some(b => b.innerText.includes('START GAME'));
            }, { timeout: 5000 });

            await page.evaluate(() => {
                const btns = [...document.querySelectorAll('button')];
                const btn = btns.find(b => b.innerText.includes('START GAME'));
                if (btn) btn.click();
            });
        } catch (e) {
            console.error("Start Game button failed:", e.message);
        }

        console.log('Waiting for game to load...');
        await new Promise(r => setTimeout(r, 3000));

        // 5. Take Screenshot
        console.log('Taking Screenshot...');
        const screenshotPath = path.resolve(__dirname, 'gameplay_verification.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Screenshot saved to: ${screenshotPath}`);

        await browser.close();

    } catch (error) {
        console.error('Test Failed:', error);
        process.exit(1);
    }
})();
