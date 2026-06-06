module.exports = {
  apps: [
    {
      name: 'pairing-service',
      script: 'pairing-service/server.js',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'bot',
      script: 'bot.js',
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
