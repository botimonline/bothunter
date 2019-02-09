import puppeteer from 'puppeteer';
import logger from './log';

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
    logger.info('Initializing getURL');
    this.cookie = cookie;
    logger.debug({ cookie });
    logger.info('Testing Facebook connection');
    const test = await this.loadURL('');
    if (test && typeof test === 'string' && test.indexOf('<') === 0) {
      logger.info('Init connection test passed');
    } else {
      logger.error({ message: 'Init Test Fail', error: (test.err) ? test.err : test });
    }
  }

  setcookie(str) {
    if (str) {
      this.cookie = str;
    }
  }

  async loadURL(url) {
    const fullurl = baseurl + url;
    logger.info({ message: 'Fetching url', fullurl });
    const browser = await puppeteer.launch(puppeteerConf);

    const page = await browser.newPage();
    await page.setRequestInterception(true);
    await page.setUserAgent(userAgent);

    try {
      // add header for the navigation requests
      page.on('request', (request) => {
        const requestUrl = request._url.split('?')[0].split('#')[0];
        logger.debug({ requestUrl });
        // ignore unneeded requests
        if (
          blockedResourceTypes.indexOf(request.resourceType()) !== -1
                    || skippedResources.some(resource => requestUrl.indexOf(resource) !== -1)
        ) {
          logger.debug({ message: 'Aborting call (irrelevant resource type)', requestUrl });
          request.abort();
          return;
        }

        // Do nothing in case of non-navigation requests.
        if (!request.isNavigationRequest()) {
          logger.debug({ message: 'Ignoring non-navigation request' });
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
      logger.error(err);
      return { err: `error loading:${err}` };
    }
  }
}

module.exports = new getUrl();
