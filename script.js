const path = require("path");
const puppeteer = require("puppeteer");

const config = {
  //profile config
  USER_AGENT:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",

  //ubuntu chromnium path
  EXECUTABLE_PATH: "/snap/bin/chromium",

  //browser config
  headless: false, // true / false
  window_size: "1280,780",

  walletAddress: "0x9422117d03A7EBbe0974dCF34Dd0f29bA1efe19E",
  proxy: "hoangkhoi:node@160.191.51.205:33578",
};
const [proxyUsername, proxyPassword, IpAddress, port] =
  config.proxy.split(/[@:]/);
const pathToExtension = path.join(process.cwd(), "CaptchaSolver");

const argsLaunchOption = [
  `--user-agent=${config.USER_AGENT}`,
  "--enable-cookies",
  "--enable-javascript",
  `--window-size=${config.window_size}`,
  "accept=text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  `--disable-extensions-except=${pathToExtension}`,
  `--load-extension=${pathToExtension}`,
  "--enable-features=ClipboardAPI",
  `--proxy-server=${IpAddress}:${port}`,
];

function delay(seconds) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

async function autoMining(walletAddress) {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: config.EXECUTABLE_PATH,
    args: argsLaunchOption,
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: Number(config.window_size.split(",")[0]),
    height: Number(config.window_size.split(",")[1]),
  });
  await page.authenticate({ username: proxyUsername, password: proxyPassword });
  await page.goto(
    "chrome-extension://hlifkpholllijblknnmbfagnkjneagid/popup/popup.html#/",
    {
      waitUntil: "networkidle2",
    }
  );

  await page.click("#id_refresh_btn");

  // // navigate to a page containing a reCAPTCHA challenge
  // await page.goto("https://sepolia-faucet.pk910.de/", {
  //   waitUntil: "networkidle2",
  // });
  await delay(5);
  const sepoliaPage = await browser.newPage();
  await sepoliaPage.setViewport({
    width: Number(config.window_size.split(",")[0]),
    height: Number(config.window_size.split(",")[1]),
  });
  await sepoliaPage.authenticate({
    username: proxyUsername,
    password: proxyPassword,
  });
  await sepoliaPage.goto("https://sepolia-faucet.pk910.de/", {
    waitUntil: "networkidle2",
  });

  const iframeElement = await sepoliaPage.waitForSelector(
    "body > div.faucet-wrapper > div > div > div > div.faucet-body > div > div.faucet-inputs > div.faucet-captcha > div > div > div > div > div > div > iframe"
  );
  const iframe = await iframeElement?.contentFrame();
  if (iframe) {
    let isChecked = false;
    while (!isChecked) {
      isChecked = await iframe.evaluate(() => {
        const recaptcha = document.querySelector(".recaptcha-checkbox");
        return recaptcha?.getAttribute("aria-checked") === "true";
      });
    }
    console.log("reCAPTCHA checked:", isChecked);

    const walletInput = await sepoliaPage.waitForSelector(
      "body > div.faucet-wrapper > div > div > div > div.faucet-body > div > div.faucet-inputs > input"
    );
    await walletInput.type(walletAddress);
    await walletInput.dispose();

    const startButton = await sepoliaPage.waitForSelector(
      "body > div.faucet-wrapper > div > div > div > div.faucet-body > div > div.faucet-inputs > div.faucet-actions.center > button"
    );
    await startButton.click();
    await startButton.dispose();

    //Chờ nút Claim Reward
    try {
      const claimButton = await sepoliaPage.waitForSelector(
        "body > div.faucet-wrapper > div > div > div > div.faucet-body > div > div > div:nth-child(2) > div:nth-child(4) > div > div > button",
        { waitUntil: 12 * 60 * 60 * 1000 } // wait 12 tieng
      );
      if (claimButton) {
        await claimButton.click();
        await claimButton.dispose();

        await delay(5);
        await browser.close();
        await autoMining(walletAddress);
      }
    } catch (error) {}
  }
}

autoMining(config.walletAddress);
