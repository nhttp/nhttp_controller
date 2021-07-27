import {
  Handler,
  Handlers,
  multipart,
  NextFunction,
  RequestEvent,
  Router,
} from "https://deno.land/x/nhttp@0.8.0/mod.ts";

import { contentType } from "https://deno.land/x/media_types@v2.7.1/mod.ts";

type TStatus<
  Rev extends RequestEvent = RequestEvent,
> = (
  rev: Rev,
  next: NextFunction,
) => number;

// deno-lint-ignore no-explicit-any
type TObject = { [k: string]: any };
type THeaders<
  Rev extends RequestEvent = RequestEvent,
> = (
  rev: Rev,
  next: NextFunction,
) => TObject;

type TString<
  Rev extends RequestEvent = RequestEvent,
> = (
  rev: Rev,
  next: NextFunction,
) => string;

type TMultipartUpload = {
  name: string;
  maxCount?: number;
  maxSize?: number | string;
  accept?: string;
  callback?: (file: File & { filename: string }) => void;
  dest?: string;
  required?: boolean;
};
// deno-lint-ignore no-explicit-any
function findFns(arr: any[]): any[] {
  // deno-lint-ignore no-explicit-any
  let ret = [] as any, i = 0;
  const len = arr.length;
  for (; i < len; i++) {
    if (Array.isArray(arr[i])) ret = ret.concat(findFns(arr[i]));
    else if (typeof arr[i] === "function") ret.push(arr[i]);
  }
  return ret;
}

// deno-lint-ignore no-explicit-any
function joinTargetMethod(target: any, prop: string, arr: any[]) {
  const obj = target["methods"] || {};
  obj[prop] = obj[prop] || {};
  obj[prop].handlers = arr.concat(obj[prop].handlers || []);
  return obj;
}

function addMethod(method: string, path?: string) {
  path = path || "";
  // deno-lint-ignore no-explicit-any
  return (target: any, prop: string, des: PropertyDescriptor) => {
    const ori = des.value;
    // deno-lint-ignore no-explicit-any
    des.value = function (...args: any[]) {
      target["rev"] = args[0];
      target["next"] = args[1];
      const result = ori.apply(target, args);
      return result;
    };
    const obj = target["methods"] || {};
    obj[prop] = obj[prop] || {};
    const handlers = (obj[prop].handlers || []).concat([des.value]);
    obj[prop] = { path, method, handlers };
    target["methods"] = obj;
    return des;
  };
}

export function View(name: string | TString) {
  // deno-lint-ignore no-explicit-any
  return (target: any, prop: string, des: PropertyDescriptor) => {
    const viewFn: Handler = (rev, next) => {
      rev.___view = typeof name === "function" ? name(rev, next) : name;
      next();
    };
    target["methods"] = joinTargetMethod(target, prop, [viewFn]);
    return des;
  };
}

export function Upload(options: TMultipartUpload) {
  // deno-lint-ignore no-explicit-any
  return (target: any, prop: string, des: PropertyDescriptor) => {
    target["methods"] = joinTargetMethod(target, prop, [
      multipart.upload(options),
    ]);
    return des;
  };
}

export function Wares<
  Rev extends RequestEvent = RequestEvent,
>(...middlewares: Handlers<Rev>) {
  const fns = findFns(middlewares);
  // deno-lint-ignore no-explicit-any
  return (target: any, prop: string, des: PropertyDescriptor) => {
    target["methods"] = joinTargetMethod(target, prop, fns);
    return des;
  };
}

export function Status(status: number | TStatus) {
  // deno-lint-ignore no-explicit-any
  return (target: any, prop: string, des: PropertyDescriptor) => {
    const statusFn: Handler = (rev, next) => {
      rev.response.status(
        typeof status === "function" ? status(rev, next) : status,
      );
      next();
    };
    target["methods"] = joinTargetMethod(target, prop, [statusFn]);
    return des;
  };
}

export function Type(name: string | TString) {
  // deno-lint-ignore no-explicit-any
  return (target: any, prop: string, des: PropertyDescriptor) => {
    const typeFn: Handler = (rev, next) => {
      const value = typeof name === "function" ? name(rev, next) : name;
      rev.response.type(
        contentType(value) || value,
      );
      next();
    };
    target["methods"] = joinTargetMethod(target, prop, [typeFn]);
    return des;
  };
}

export function Header(header: TObject | THeaders) {
  // deno-lint-ignore no-explicit-any
  return (target: any, prop: string, des: PropertyDescriptor) => {
    const headerFn: Handler = (rev, next) => {
      rev.response.header(
        typeof header === "function" ? header(rev, next) : header,
      );
      next();
    };
    target["methods"] = joinTargetMethod(target, prop, [headerFn]);
    return des;
  };
}
// deno-lint-ignore no-explicit-any
export function Inject(value: any, ...args: any) {
  // deno-lint-ignore no-explicit-any
  return function (target: any, prop: string) {
    target[prop] = typeof value === "function" ? new value(...args) : value;
  };
}

export const Get = (path?: string) => addMethod("GET", path || "");
export const Post = (path?: string) => addMethod("POST", path || "");
export const Put = (path?: string) => addMethod("PUT", path || "");
export const Delete = (path?: string) => addMethod("DELETE", path || "");
export const Any = (path?: string) => addMethod("ANY", path || "");
export const Options = (path?: string) => addMethod("OPTIONS", path || "");
export const Head = (path?: string) => addMethod("HEAD", path || "");
export const Trace = (path?: string) => addMethod("TRACE", path || "");
export const Connect = (path?: string) => addMethod("CONNECT", path || "");
export const Patch = (path?: string) => addMethod("PATCH", path || "");

export function Controller(path?: string) {
  // deno-lint-ignore no-explicit-any
  return (target: any) => {
    // deno-lint-ignore no-explicit-any
    const cRoutes = [] as any[];
    const obj = target.prototype["methods"];
    for (const k in obj) {
      if (path) obj[k].path = path + obj[k].path;
      cRoutes.push(obj[k]);
    }
    target.prototype.c_routes = cRoutes;
  };
}

class AddControllers extends Router {
  // deno-lint-ignore no-explicit-any
  constructor(arr: { new (...args: any): any }[]) {
    super();
    let i = 0, routes = this.c_routes;
    const len = arr.length;
    while (i < len) routes = routes.concat(arr[i++].prototype.c_routes);
    this.c_routes = routes;
  }
}
// deno-lint-ignore no-explicit-any
export const addControllers = (controllers: { new (...args: any): any }[]) =>
  new AddControllers(controllers);

export class BaseController<
  Rev extends RequestEvent = RequestEvent,
> {
  rev!: Rev;
  next!: NextFunction;
  // deno-lint-ignore no-explicit-any
  [k: string]: any
}
