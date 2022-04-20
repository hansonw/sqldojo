const { createServer } = require('https')
const { parse } = require('url')
const fs = require('fs');
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = 443
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/sqldojo.laserfitapp.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/sqldojo.laserfitapp.com/cert.pem'),
  ca: [fs.readFileSync('/etc/letsencrypt/live/sqldojo.laserfitapp.com/chain.pem')]
};

app.prepare().then(() => {
  createServer(options, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  }).listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on https://${hostname}:${port}`)
  })
})
