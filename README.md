# Hivemind Platform App Backend

## WebSocket Protocol

Inspiration:

* `https://github.com/mqttjs/mqtt-packet#packets`
* `http://www.jsonrpc.org/specification`

If a request contains an `id` property, an answer will be returned with the following form:

```javascript
{
  id: 1, // The `id` provided in the request (to match request with the response)
  ans: null, // Answer for the RPC call (not available on error)
  err: null, // Error if the RPC call failed (not available on success)
}
```

Set subscriptions. This replaces all previous subscriptions. Use `[]` to unsubscribe all.

```javascript
{
  cmd: 'subs',
  arg: [
    {type: 'sample', deviceId: 'dev1', topic: 'topic1'},
    {type: 'sample', deviceId: 'dev1', topic: 'topic2'},
  ],
}
```

Add a new subscription. If the subscription already exists, this has no effect.

```javascript
{
  cmd: 'sub',
  arg: {type: 'sample', deviceId: 'dev1', topic: 'topic1'},
}
```

Remove a subscription. If the subscription doesn't exists, this has no effect.

```javascript
{
  cmd: 'unsub',
  arg: {type: 'sample', deviceId: 'dev1', topic: 'topic1'},
}
```

If a new sample matches a subscription, the following message is received:

```javascript
{
  cmd: 'notify',
  arg: {
    type: 'sample',
    deviceId: 'dev1',
    topic: 'topic1',
    timestamp: '2018-03-09T10:09:38.768Z',
    data: {},
  }
}
```
