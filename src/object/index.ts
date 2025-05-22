const _obj = {
  /**
   * Add nextKey and previousKey to each document in the given object.
   *
   * This is a utility function used by the Store class to add nextKey and
   * previousKey to each document in the store.
   *
   * @param docs - The object containing the documents to be modified.
   * @returns - The modified object.
   */
  addNextPrevious(docs: Record<string, any>) {
    const keys = Object.keys(docs);
    const result: Record<string, any> = {};
    for (let i = 0, len = keys.length; i < len; i++) {
      const key = keys[i];
      result[key] = {
        ...docs[key],
        nextKey: keys[i + 1] || undefined,
        previousKey: i > 0 ? keys[i - 1] : undefined,
      };
    }
    return result;
  },
  /**
   * Maps an object to another object using the provided function.
   *
   * The provided function will be called with three arguments:
   *  - value: the value of each property in the object
   *  - key: the key of each property in the object
   *  - object: the object being mapped
   *
   * The return value of the function will be used as the value of the
   * corresponding property in the new object.
   *
   * @example
   * _obj.mapObject({a: 1, b: 2}, (value) => value * 2)
   * // {a: 2, b: 4}
   * @param object the object to be mapped
   * @param fn the function to be called with each property
   * @returns the new object
   */
  mapObject(
    object: Record<string, any>,
    fn: (value: any, key: string, object: Record<string, any>) => any
  ) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(object)) {
      result[key] = fn(value, key, object);
    }
    return result;
  },
  /**
   * Maps the values of an object using the provided function, returning an
   * array of key-value pairs where each value is transformed by the function.
   *
   * This function is useful for transforming object values while retaining
   * their keys, effectively creating a new object with the same keys but
   * potentially different values.
   *
   * @example
   * _obj.mapValues({a: 1, b: 2}, (value) => value * 2)
   * // [['a', 2], ['b', 4]]
   *
   * @param object - The object whose values are to be mapped.
   * @param fn - The function to be applied to each value of the object,
   *             which receives the value, key, and object as arguments.
   * @returns An array of key-value pairs with transformed values.
   */

  mapValues(
    object: Record<string, any>,
    fn: (value: any, key: string, object: Record<string, any>) => any
  ) {
    return _obj.mapObject(object, (value, key, object) => [
      key,
      fn(value, key, object),
    ]);
  },
};

export default _obj;
