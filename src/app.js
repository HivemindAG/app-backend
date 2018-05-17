const factory = require('./app-factory');
const setup = require('./setup');
const args = require('minimist')(process.argv.slice(2));

factory.init();

if (args.config) {
  setup.load(JSON.parse(args.config))
}

if (args.key) {
  setup.config.auth.session.apiKey = args.key;
}

factory.run(args.port || 8080);
