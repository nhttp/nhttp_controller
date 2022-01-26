import {
  Handler,
  Handlers,
  multipart,
  NextFunction,
  RequestEvent,
  Router,
} from "https://deno.land/x/nhttp@1.1.9/mod.ts";
import { concatRegexp } from "https://deno.land/x/nhttp@1.1.9/src/utils.ts";
import { contentType } from "https://deno.land/x/media_types@v2.11.1/mod.ts";
import { TObject, TRet } from "https://deno.land/x/nhttp@1.1.9/src/types.ts";

declare global {
  interface Window {
    NHttpMetadata: TRet;
  }
}

type TStatus<
  Rev extends RequestEvent = RequestEvent,
> = (
  rev: Rev,
  next: NextFunction,
) => number;

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
  dest: string;
  required?: boolean;
};

export function addRoute(
  className: string,
  prop: string,
  handler: Handler,
  opts: { path?: string | RegExp; method: string },
) {
  window.NHttpMetadata = window.NHttpMetadata || {};
  const metadata = window.NHttpMetadata;
  metadata[className] = metadata[className] || {};
  const obj = metadata[className]["route"] || {};
  obj[prop] = obj[prop] || {};
  const fns = (obj[prop].fns || []).concat([handler]);
  obj[prop] = { path: opts.path, method: opts.method, fns };
  metadata[className]["route"] = obj;
}

export function joinHandlers<Rev extends RequestEvent = RequestEvent>(
  className: TRet,
  prop: string,
  arr: Handler<Rev>[],
) {
  window.NHttpMetadata = window.NHttpMetadata || {};
  const metadata = window.NHttpMetadata;
  metadata[className] = metadata[className] || {};
  const obj = metadata[className]["route"] || {};
  obj[prop] = obj[prop] || {};
  obj[prop].fns = arr.concat(obj[prop].fns || []);
  metadata[className]["route"] = obj;
}

export function addMethod(method: string, path?: string | RegExp) {
  return (target: TObject, prop: string, des: PropertyDescriptor) => {
    const ori = des.value;
    des.value = function (...args: TObject[]) {
      target["requestEvent"] = args[0];
      target["next"] = args[1];
      const result = ori.apply(target, args);
      return result;
    };
    const className = target.constructor.name;
    addRoute(className, prop, des.value, { path, method });
    return des;
  };
}

export function View(name: string | TString) {
  return (target: TObject, prop: string, des: PropertyDescriptor) => {
    const viewFn: Handler = (rev, next) => {
      const index = typeof name === "function" ? name(rev, next) : name;
      const fns = target["methods"][prop]["fns"];
      const body = fns[fns.length - 1](rev, next);
      return rev.response.view(index, typeof body === "object" ? body : {});
    };
    const className = target.constructor.name;
    joinHandlers(className, prop, [viewFn]);
    return des;
  };
}

export function Upload(options: TMultipartUpload) {
  return (target: TObject, prop: string, des: PropertyDescriptor) => {
    const className = target.constructor.name;
    joinHandlers(className, prop, [multipart.upload(options)]);
    return des;
  };
}

export function Wares<
  Rev extends RequestEvent = RequestEvent,
>(...middlewares: Handlers<Rev>) {
  return (target: TObject, prop: string, des: PropertyDescriptor) => {
    const className = target.constructor.name;
    joinHandlers(className, prop, middlewares.flat());
    return des;
  };
}

export function Status(status: number | TStatus) {
  return (target: TObject, prop: string, des: PropertyDescriptor) => {
    const statusFn: Handler = (rev, next) => {
      rev.response.status(
        typeof status === "function" ? status(rev, next) : status,
      );
      return next();
    };
    const className = target.constructor.name;
    joinHandlers(className, prop, [statusFn]);
    return des;
  };
}

export function Type(name: string | TString) {
  return (target: TObject, prop: string, des: PropertyDescriptor) => {
    const typeFn: Handler = (rev, next) => {
      const value = typeof name === "function" ? name(rev, next) : name;
      rev.response.type(
        contentType(value) || value,
      );
      return next();
    };
    const className = target.constructor.name;
    joinHandlers(className, prop, [typeFn]);
    return des;
  };
}

export function Header(header: TObject | THeaders) {
  return (target: TObject, prop: string, des: PropertyDescriptor) => {
    const headerFn: Handler = (rev, next) => {
      rev.response.header(
        typeof header === "function" ? header(rev, next) : header,
      );
      return next();
    };
    const className = target.constructor.name;
    joinHandlers(className, prop, [headerFn]);
    return des;
  };
}

export function Inject(value: TRet, ...args: TRet) {
  return function (target: TObject, prop: string) {
    target[prop] = typeof value === "function" ? new value(...args) : value;
  };
}

export const Get = (path?: string | RegExp) => addMethod("GET", path || "");
export const Post = (path?: string | RegExp) => addMethod("POST", path || "");
export const Put = (path?: string | RegExp) => addMethod("PUT", path || "");
export const Delete = (path?: string | RegExp) =>
  addMethod("DELETE", path || "");
export const Any = (path?: string | RegExp) => addMethod("ANY", path || "");
export const Options = (path?: string | RegExp) =>
  addMethod("OPTIONS", path || "");
export const Head = (path?: string | RegExp) => addMethod("HEAD", path || "");
export const Trace = (path?: string | RegExp) => addMethod("TRACE", path || "");
export const Connect = (path?: string | RegExp) =>
  addMethod("CONNECT", path || "");
export const Patch = (path?: string | RegExp) => addMethod("PATCH", path || "");

export function Controller(path?: string) {
  return (target: TObject) => {
    const cRoutes = [] as TObject[];
    const className = target.name;
    const obj = window.NHttpMetadata[className]["route"];
    for (const k in obj) {
      if (obj[k].path instanceof RegExp) {
        obj[k].path = concatRegexp(path || "", obj[k].path);
      } else {
        if (path) obj[k].path = path + obj[k].path;
        if (obj[k].path.startsWith("//")) {
          obj[k].path = obj[k].path.substring(1);
        }
        if (obj[k].path !== "/" && obj[k].path.endsWith("/")) {
          obj[k].path = obj[k].path.slice(0, -1);
        }
      }
      cRoutes.push(obj[k]);
    }
    target.prototype.c_routes = cRoutes;
  };
}

class AddControllers extends Router {
  constructor(arr: { new (...args: TRet): TRet }[]) {
    super();
    let i = 0, routes = this.c_routes;
    const len = arr.length;
    while (i < len) routes = routes.concat(arr[i++].prototype.c_routes);
    this.c_routes = routes;
  }
}
export const addControllers: TRet = (
  controllers: { new (...args: TRet): TRet }[],
) => new AddControllers(controllers);

export class BaseController<
  Rev extends RequestEvent = RequestEvent,
> {
  requestEvent!: Rev;
  next!: NextFunction;
  [k: string]: TRet
}
