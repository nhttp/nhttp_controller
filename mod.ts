import {
  Handler,
  Handlers,
  JsonResponse,
  NextFunction,
  RequestEvent,
  Router,
  multipart,
} from "https://deno.land/x/nhttp@0.2.0/mod.ts";

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
) => { [k: string]: any };

type TMultipartUpload = {
  name: string;
  maxCount?: number;
  maxSize?: number | string;
  accept?: string;
  callback?: (file: File & { filename: string }) => void;
  dest?: string;
  required?: boolean;
};

function findFns(arr: any[]): any[] {
  let ret = [] as any, i = 0, len = arr.length;
  for (; i < len; i++) {
    if (Array.isArray(arr[i])) ret = ret.concat(findFns(arr[i]));
    else if (typeof arr[i] === "function") ret.push(arr[i]);
  }
  return ret;
}

function joinTargetMethod(target: any, prop: string, arr: any[]) {
  let obj = target["methods"] || {};
  obj[prop] = obj[prop] || {};
  obj[prop].handlers = arr.concat(obj[prop].handlers || []);
  return obj;
}

function addMethod(method: string, path: string = "") {
  return (target: any, prop: string, des: PropertyDescriptor) => {
    const ori = des.value;
    des.value = function (...args: any[]) {
      let result = ori.apply(target, args);
      return result;
    };
    let obj = target["methods"] || {};
    obj[prop] = obj[prop] || {};
    let handlers = (obj[prop].handlers || []).concat([wrapFn(des.value)]);
    obj[prop] = { path, method, handlers };
    target["methods"] = obj;
    return des;
  };
}

export function Upload(options: TMultipartUpload) {
  return (target: any, prop: string, des: PropertyDescriptor) => {
    target["methods"] = joinTargetMethod(target, prop, [multipart.upload(options)]);
    return des;
  };
}

export function Wares<
  Rev extends RequestEvent = RequestEvent,
>(...middlewares: Handlers<Rev>) {
  let fns = findFns(middlewares);
  return (target: any, prop: string, des: PropertyDescriptor) => {
    target["methods"] = joinTargetMethod(target, prop, fns);
    return des;
  };
}

export function Status(status: number | TStatus) {
  return (target: any, prop: string, des: PropertyDescriptor) => {
    const statusFn: Handler = (rev, next) => {
      rev.responseInit.status = typeof status === "function"
        ? status(rev, next)
        : status;
      next();
    };
    target["methods"] = joinTargetMethod(target, prop, [statusFn]);
    return des;
  };
}

export function Header(header: { [k: string]: any } | THeaders) {
  return (target: any, prop: string, des: PropertyDescriptor) => {
    const headerFn: Handler = (rev, next) => {
      let obj = typeof header === "function" ? header(rev, next) : header;
      let headers = (rev.responseInit.headers || new Headers()) as Headers;
      for (const key in obj) headers.set(key, obj[key]);
      rev.responseInit.headers = headers;
      next();
    };
    target["methods"] = joinTargetMethod(target, prop, [headerFn]);
    return des;
  };
}

export function Inject(value: any, ...args: any) {
  return function (target: any, prop: string) {
    target[prop] = typeof value === "function" ? new value(...args) : value;
  };
}

export const Get = (path: string = "") => addMethod("GET", path);
export const Post = (path: string = "") => addMethod("POST", path);
export const Put = (path: string = "") => addMethod("PUT", path);
export const Delete = (path: string = "") => addMethod("DELETE", path);
export const Any = (path: string = "") => addMethod("ANY", path);
export const Options = (path: string = "") => addMethod("OPTIONS", path);
export const Head = (path: string = "") => addMethod("HEAD", path);
export const Trace = (path: string = "") => addMethod("TRACE", path);
export const Connect = (path: string = "") => addMethod("CONNECT", path);
export const Patch = (path: string = "") => addMethod("PATCH", path);

export function Controller(path: string = "") {
  return (target: Function) => {
    let c_routes = [] as any[];
    let obj = target.prototype["methods"];
    for (const k in obj) {
      if (path !== "") obj[k].path = path + obj[k].path;
      c_routes.push(obj[k]);
    }
    target.prototype.c_routes = c_routes;
  };
}

function retBody(body: any, rev: RequestEvent) {
  let send = (x: any) => rev.respondWith(new Response(x, rev.responseInit));
  let json = (y: any) => rev.respondWith(new JsonResponse(y, rev.responseInit));
  if (typeof body === "string") return send(body);
  if (typeof body === "object") {
    if (typeof body.then === "function") return withPromise(body, rev);
    if (
      body instanceof Uint8Array ||
      body instanceof ReadableStream ||
      typeof (body as Deno.Reader).read === "function"
    ) {
      return send(body);
    }
    return json(body);
  }
  return void 0;
}

function wrapFn(handler: Handler): Handler {
  return (rev, next) => retBody(handler(rev, next), rev);
}

async function withPromise(
  handler: Promise<Handler>,
  rev: RequestEvent,
): Promise<any> {
  let body = await handler;
  return retBody(body, rev);
}

class AddControllers extends Router {
  constructor(arr: { new (...args: any): any }[]) {
    super();
    let i = 0, len = arr.length, routes = this.c_routes;
    while (i < len) routes = routes.concat(arr[i++].prototype.c_routes);
    this.c_routes = routes;
  }
}

export const addControllers = (controllers: { new (...args: any): any }[]) =>
  new AddControllers(controllers);
