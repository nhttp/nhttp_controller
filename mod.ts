import {
  Handler,
  Handlers,
  multipart,
  NextFunction,
  RequestEvent,
  Router,
} from "https://deno.land/x/nhttp@1.1.5/mod.ts";

import { contentType } from "https://deno.land/x/media_types@v2.11.1/mod.ts";

type TStatus<
  Rev extends RequestEvent = RequestEvent,
> = (
  rev: Rev,
  next: NextFunction,
) => number;

// deno-lint-ignore no-explicit-any
type TObject = Record<string, any>;
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

function joinTargetMethod(target: TObject, prop: string, arr: TObject[]) {
  const obj = target["methods"] || {};
  obj[prop] = obj[prop] || {};
  obj[prop].fns = arr.concat(obj[prop].fns || []);
  return obj;
}

function addMethod(method: string, path?: string) {
  path = path || "";
  return (target: TObject, prop: string, des: PropertyDescriptor) => {
    const ori = des.value;
    des.value = function (...args: TObject[]) {
      target["requestEvent"] = args[0];
      target["next"] = args[1];
      const result = ori.apply(target, args);
      return result;
    };
    const obj = target["methods"] || {};
    obj[prop] = obj[prop] || {};
    const fns = (obj[prop].fns || []).concat([des.value]);
    obj[prop] = { path, method, fns };
    target["methods"] = obj;
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
    target["methods"] = joinTargetMethod(target, prop, [viewFn]);
    return des;
  };
}

export function Upload(options: TMultipartUpload) {
  return (target: TObject, prop: string, des: PropertyDescriptor) => {
    target["methods"] = joinTargetMethod(target, prop, [
      multipart.upload(options),
    ]);
    return des;
  };
}

export function Wares<
  Rev extends RequestEvent = RequestEvent,
>(...middlewares: Handlers<Rev>) {
  return (target: TObject, prop: string, des: PropertyDescriptor) => {
    target["methods"] = joinTargetMethod(target, prop, middlewares.flat());
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
    target["methods"] = joinTargetMethod(target, prop, [statusFn]);
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
    target["methods"] = joinTargetMethod(target, prop, [typeFn]);
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
    target["methods"] = joinTargetMethod(target, prop, [headerFn]);
    return des;
  };
}
// deno-lint-ignore no-explicit-any
export function Inject(value: any, ...args: any) {
  return function (target: TObject, prop: string) {
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
  return (target: TObject) => {
    const cRoutes = [] as TObject[];
    const obj = target.prototype["methods"];
    for (const k in obj) {
      if (path) obj[k].path = path + obj[k].path;
      if (obj[k].path.startsWith("//")) {
        obj[k].path = obj[k].path.substring(1);
      }
      if (obj[k].path !== "/" && obj[k].path.endsWith("/")) {
        obj[k].path = obj[k].path.slice(0, -1);
      }
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
  new AddControllers(controllers) as Router;

export class BaseController<
  Rev extends RequestEvent = RequestEvent,
> {
  requestEvent!: Rev;
  next!: NextFunction;
  // deno-lint-ignore no-explicit-any
  [k: string]: any
}
