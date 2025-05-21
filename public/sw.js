self.addEventListener('push', function(event) {
  const data = event.data.json();

  const options = {
    body: data.message,
    data: { url: '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
