# Hivemind Platform App Backend

[Endpoint documentation](https://github.com/HivemindAG/app-backend/wiki/Endpoints) and additional information can be found in the [wiki](https://github.com/HivemindAG/app-backend/wiki).

We host a [shared instance](https://github.com/HivemindAG/app-backend/wiki/Shared-Instance) for prototyping and evaluation.

## Quickstart


```bash
git checkout git@github.com:HivemindAG/app-backend.git
cd app-backend
npm install
npm start -- --key <your-api-key>
# API is now available at http://localhost:8080
```

## Caching

The app backend caches most requests to improve response time and reduce the load on the Hivemind Platform API.

Changes made to any entities might not be visible for up to 4 minutes (e.g. changing a device name or adding a new device). For long entity lists only the first 1000 entries will be returned.

The first time samples for a device are requested, the backend will load and cache the last 4000 samples from up to 100 days ago. After this, it will check for new data at least every 20 seconds. While this massively improves the response time for sample queries, only recent samples will be available.

Some caching parameters can be adjusted using the `app configuration object`. However, keep in mind that caching too many samples might have negative impact on performance and memory requirements.

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
* `$APP_CONFIG`
  * App configuration object (JSON)

## App Configuration Object Properties

* `auth.session.apiKey`
  * Hivemind Platform API key (String)
* `auth.session.apiURL`
  * Hivemind Platform API URL (String)
  * Default: `"https://api.hivemind.ch"`
* `dataService.sampleCacheRange`
  * Sample caching duration [ms]
  * Default: `1296000000` (15 days)
* `dataService.sampleCacheLimit`
  * Maximum number of cached samples per device
  * Default: `4000`
* `dataService.sampleCacheTimeout`
  * Look for new samples after… [ms]
  * Default: `20000` (20 seconds)
* `dataService.staticCacheTimeout`
  * Cache entities for… [ms]
  * Default: `240000` (4 minutes)
