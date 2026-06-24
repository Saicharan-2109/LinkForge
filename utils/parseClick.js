const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');
const crypto = require('crypto'); // Built-in Node tool

const parseClick = (req) => {
    // 1. WHAT are they using? (Reads the "User-Agent" header)
    const parser = new UAParser(req.headers['user-agent']);
    const result = parser.getResult();

    // 2. WHERE are they? (Reads their IP address)
    // Note: If you test on localhost, your IP is '::1', which breaks the map. 
    // We give it a fake USA IP address just for local testing!
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const testIp = ip === '::1' ? '207.97.227.239' : ip; 
    const geo = geoip.lookup(testIp);

    // 3. WHO is this? (We scramble the IP address so we don't save their real one)
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');

    // 4. Return all the answers in a neat little package
    return {
        country: geo ? geo.country : 'Unknown',
        city: geo ? geo.city : 'Unknown',
        device: result.device.type || 'Desktop', // If empty, assume it's a computer
        browser: result.browser.name || 'Unknown',
        os: result.os.name || 'Unknown',
        referrer: req.headers.referer || 'Direct',
        ipHash: ipHash
    };
};

module.exports = parseClick;