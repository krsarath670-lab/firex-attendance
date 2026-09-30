async function checkRender() {
  const url = 'https://firex-attendance-cr1x.onrender.com';
  console.log('Testing URL:', url);
  try {
    const htmlRes = await fetch(url);
    console.log('Root HTML Status:', htmlRes.status);
    const html = await htmlRes.text();

    const jsMatch = html.match(/\/assets\/[a-zA-Z0-9_-]+\.js/g);
    const cssMatch = html.match(/\/assets\/[a-zA-Z0-9_-]+\.css/g);

    console.log('JS assets found:', jsMatch);
    console.log('CSS assets found:', cssMatch);

    if (jsMatch) {
      for (const js of jsMatch) {
        const res = await fetch(url + js);
        console.log(`JS ${js} -> Status ${res.status} (${res.headers.get('content-type')})`);
      }
    }
  } catch (err) {
    console.error('Error testing render:', err);
  }
}
checkRender();
