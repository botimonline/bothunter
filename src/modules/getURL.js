import puppeteer from 'puppeteer';
import { cookie, userAgent } from '../../conf/conf';

const useProxy = false; // set to use proxy by the settings below.
const proxy = 'socks5://127.0.0.1:9050';

const baseurl = 'https://m.facebook.com/'; // 'https://facebookcorewwwi.onion/';

/* Resource types to block from loading, for speed up and less resources */
const blockedResourceTypes = [
  'image',
  'media',
  'font',
  'texttrack',
  'object',
  'beacon',
  'csp_report',
  'imageset',
];

const skippedResources = [
  'quantserve',
  'adzerk',
  'doubleclick',
  'adition',
  'exelator',
  'sharethrough',
  'cdn.api.twitter',
  'google-analytics',
  'googletagmanager',
  'google',
  'fontawesome',
  'analytics',
  'optimizely',
  'clicktale',
  'mixpanel',
  'zedo',
  'clicksor',
  'tiqcdn',
];


// settings


const puppeteerConf = {
  args: [
    '--ignore-certificate-errors',
    '--disable-setuid-sandbox',
    '--no-sandbox',
    '--disable-gpu',
    '--no-first-run',
    '--disable-setuid-sandbox=true',
    '--window-size=1920x1080',
    '--disable-accelerated-2d-canvas=true',
  ],
  headless: false,
};

if (useProxy) {
  puppeteerConf.args.push(
    `--proxy-server=${proxy}`,
  );
}


class getUrl {
  async init() {
    console.log('Initializing getURL');
    this.cookie = cookie;
    console.log({ cookie });
    console.log('Testing Facebook connection');
    const test = await this.loadURL('');
    if (test && typeof test === 'string' && test.indexOf('<') === 0) {
      console.log('Init connection test passed...');
    } else {
      console.log('Init Test Fail:', (test.err) ? test.err : test);
    }
  }

  setcookie(str) {
    if (str) {
      this.cookie = str;
    }
  }

  async loadURL(url) {
    const fullurl = baseurl + url;
    console.log({ fullurl });
    const browser = await puppeteer.launch(puppeteerConf);

    console.log('A');
    const page = await browser.newPage();
    console.log('B');
    await page.setRequestInterception(true);
    console.log('C');
    await page.setUserAgent(userAgent);
    console.log('D');

    try {
      // add header for the navigation requests
      page.on('request', (request) => {
        const requestUrl = request._url.split('?')[0].split('#')[0];
        console.log({ requestUrl });
        // ignore unneeded requests
        if (
          blockedResourceTypes.indexOf(request.resourceType()) !== -1
                    || skippedResources.some(resource => requestUrl.indexOf(resource) !== -1)
        ) {
          console.log({ error: 'Aborting call', requestUrl });
          request.abort();
          return;
        }

        // Do nothing in case of non-navigation requests.
        if (!request.isNavigationRequest()) {
          console.log({ event: '!request.isNavigationRequest' });
          request.continue();
          return;
        }
        // Add a new header for navigation request.
        const headers = request.headers();
        headers['Access-Control-Allow-Origin'] = '*';
        headers.Cookie = this.cookie;
        request.continue({ headers });
      });

      // navigate to the website
      const response = await page.goto(fullurl, {
        timeout: 10000,
        waitUntil: 'networkidle2',
      });

      if (response._status < 400) {
        await page.waitFor(1000);
        const html = await page.content();
        await browser.close();

        return html;
      }
    } catch (err) {
      console.error(err);
      return { err: `error loading:${err}` };
      // throw new Error('error loading:' + err);
    }
  }
}


module.exports = new getUrl();
