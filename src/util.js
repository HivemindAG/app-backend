module.exports = {
  deepPick,
  mapPick,
  sizeof,
};

/**
 * Pick properties from nested objects and objects within arrays.
 */
function deepPick(obj, def) {
  if (def.hasOwnProperty('@each')) {
    const _def = def['@each'];
    return obj.map((_obj) => deepPick(_obj, _def));
  }
  const newObj = {};
  if (def.hasOwnProperty('@keys')) {
    const keys = def['@keys'] === null ? Object.keys(obj) : def['@keys'];
    keys.forEach((key) => newObj[key] = obj[key]);
  }
  Object.keys(def).forEach(function(key) {
    if (key.charAt(0) == '@') return;
    newObj[key] = deepPick(obj[key], def[key]);
  });
  return newObj;
}

/**
 * Traditional `pick` function with support for a mapping function.
 */
function mapPick(obj, keys, func) {
  keys.forEach((k) => obj[k] = func(obj[k]));
}

/**
 * Roughtly calculates the size of an object.
 */
function sizeof(obj) {
  const visited = new Set();
  const stack = [obj];
  let bytes = 0;
  while (stack.length) {
    const value = stack.pop();
    const type = typeof value;
    if (type === 'boolean') {
      bytes += 4;
    } else if (type === 'string') {
      bytes += value.length * 2;
    } else if (type === 'number') {
      bytes += 8;
    } else if (type === 'object' && !visited.has(value)) {
      visited.add(value);
      for (let i in value ) {
        stack.push(value[i]);
      }
    }
  }
  return bytes;
}
