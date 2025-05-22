import { dequal } from "dequal";
import _fs from "./fs/index.js";
import _obj from "./object/index.js";
import { Store } from "./store/index.js";

const utils = {
  dequal(foo: any, bar: any): boolean {
    return dequal(foo, bar);
  },
  store(name?: string): Store {
    return new Store(name);
  },
  fs: _fs,
  obj: _obj,
};

export default utils;
