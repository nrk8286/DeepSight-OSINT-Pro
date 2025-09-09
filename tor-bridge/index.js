const express = require('express');
const torRequest = require('tor-request');

const app = express();
const port = 3001;

app.get('/search', (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter "q"' });
  }

  // Make a request to a Tor search engine (e.g., Ahmia)
  torRequest.request(`https://ahmia.fi/search/?q=${query}`, (err, response, body) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to search on Tor network' });
    }

    // For now, we'll just return the body of the search results page.
    // In a real application, we would parse this HTML to extract image URLs.
    res.send(body);
  });
});

app.listen(port, () => {
  console.log(`Tor bridge server listening at http://localhost:${port}`);
});
