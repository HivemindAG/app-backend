# Hivemind Platform App Backend

[Endpoint documentation](https://github.com/HivemindAG/app-backend/wiki/Endpoints) and additional information can be found in the [wiki](https://github.com/HivemindAG/app-backend/wiki).

We host a [shared instance](https://github.com/HivemindAG/app-backend/wiki/Shared-Instance) for prototyping and evaluation.

## Quickstart


```bash
git clone git@github.com:HivemindAG/app-backend.git
cd app-backend
npm install
npm start -- --key <your-api-key>
# API is now available at http://localhost:8080
```

## Caching

The app backend caches most requests to improve response time and reduce the load on the Hivemind Platform API.

Changes made to any entities might not be visible for up to 4 minutes (e.g. changing a device name or adding a new device). For long entity lists only the first 1000 entries will be returned.

Only the most recent 4000 samples can be accessed for every topic. New samples are pushed by the platform and will be available immediately.

## Command Line Options

* `--key`
  * Hivemind Platform API key
* `--port`
  * Server port; default: `8080`
* `--config`
  * App configuration object (JSON)

## Environment Variables

* `$PORT`
  * Server port; default: `8080`
* `$CONFIG`
  * App configuration object (JSON)
  * Use key-paths to overwrite single values within objects (e.g. `{"platform.concurrentRequests": 4}`)
* `$DEBUG`
  * Sets the `debug` configuration property
  * Casted to a boolean, so an empty string is `false`

## App Configuration Object Properties

* `debug`
  * More verbose console output (Boolean)
  * Default: `false`
* `apiKey`
  * Hivemind Platform API key (String)
* `apiURL`
  * Hivemind Platform API URL (String)
  * Default: `"https://api.hivemind.ch"`
* `sampleCacheLimit`
  * Maximum number of cached samples per device
  * Can be adjusted per device by providing a `cacheLimit` property
  * Default: `4000`
* `sampleCacheLimitMax`
  * Maximum allowed number for `sampleCacheLimit`
  * Default: `8000`
* `platform.entityCacheTimeout`
  * Cache entities for… [ms]
  * Default: `240000` (4 minutes)
* `platform.concurrentRequests`
  * Limit the number of concurrent Platform API requests
  * `0` for unlimited
  * Default: `8`
