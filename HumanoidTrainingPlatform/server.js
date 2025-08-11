const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Serve static files from the web-build directory (will be created by expo build:web)
app.use(express.static(path.join(__dirname, 'web-build')));

// For React Router (if using client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'web-build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('Humanoid Training Platform is ready!');
});