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

The first time samples for a device are requested, the backend will load and cache the last 4000 samples. After this, it will check for new data at least every 20 seconds. While this massively improves the response time for sample queries, only recent samples will be available.

The cache expects samples to be added *in sequence*. Since the cache will only load samples with a timestamp newer than the most recent sample already cached, samples might be skipped if they are created with an "old" timestamp.

Some caching parameters can be adjusted using the `app configuration object`. However, keep in mind that caching too many samples might have negative impact on performance and memory requirements.

### Per Topic Caching

When accessing samples using [sample endpoints](https://github.com/HivemindAG/app-backend/wiki/Endpoints#sample-endpoints) or the [WebSocket protocol](https://github.com/HivemindAG/app-backend/wiki/WebSocket-Protocol), you can use virtual "single topic devices" by adding the topic name to the device id: `{deviceId}:{topic}`. A query request would then look like `GET /devices/a4e8bde9c82932b6:daily/query`.

Virtual topic devices have their own separate cache, which has some advantages:

* Separate cache sample limit (you can fetch 4000 daily aggregations, even if a device has 1000 samples a day)
* Separate sequence constraint (you can backdate daily aggregations to the beginning of the day without missing them)  

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
  * Ignore samples older than [ms]
  * `null` means unlimited
  * Default: `null`
* `dataService.sampleCacheLimit`
  * Maximum number of cached samples per device
  * Can be adjusted per device by providing a `cacheLimit` property
  * Default: `4000`
* `dataService.sampleCacheTimeout`
  * Look for new samples after… [ms]
  * Default: `20000` (20 seconds)
* `dataService.staticCacheTimeout`
  * Cache entities for… [ms]
  * Default: `240000` (4 minutes)
* `request.concurrent`
  * Limit the number of concurrent Platform API requests
  * `0` for unlimited
  * Default: `8`
