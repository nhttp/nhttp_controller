## NHttp Controller

Micro routing controller for Deno with decorator support.

> limited to [nhttp](https://github.com/nhttp/nhttp) only. requires nhttp
> version 1.1.7 or higher.

## Installation

### deno.land

```ts
import {...} from "https://deno.land/x/nhttp_controller@0.7.0/mod.ts";
```

### nest.land

```ts
import {...} from "https://x.nest.land/nhttp_controller@0.7.0/mod.ts";
```

## Usage

```ts
import { NHttp } from "https://deno.land/x/nhttp@{version}/mod.ts";
import {
  addControllers,
  BaseController,
  Controller,
  Get,
  Post,
  Status,
} from "https://deno.land/x/nhttp_controller@0.7.0/mod.ts";

@Controller("/hello")
class HelloController extends BaseController {
  @Get()
  findAll() {
    return { name: "john" };
  }

  @Get("/:id")
  findById() {
    const { params } = this.requestEvent;
    return params;
  }

  @Status(201)
  @Post()
  save() {
    const { body } = this.requestEvent;
    return body;
  }
}

class App extends NHttp {
  constructor() {
    super();
    this.use("/api", addControllers([HelloController]));
  }
}

new App().listen(3000);
```

## Decorator

### Controller

@Controller(path?: string).

```ts
...
@Controller("/hello")
class HelloController extends BaseController {...}
...
```

### Method

@METHOD(path?: string).

> Support => @Get, @Post, @Put, @Delete, @Patch, @Head, @Options, @Any, @Trace,
> @Connect.

```ts
...
@Controller("/hello")
class HelloController extends BaseController {

  @Get()
  hello() {
    return "hello";
  }
}
...
```

### Status

@Status(code: number | (rev, next) => number).

```ts
...
@Controller("/hello")
class HelloController extends BaseController {

  @Status(201)
  @Post()
  save() {
    return "Created";
  }

  @Status((rev) => {
    // logic here
    return 200;
  })
  @Put('/:id')
  update() {
    return "Updated";
  }
}
...
```

### Header

@Header(object | (rev, next) => object).

```ts
...
@Controller("/hello")
class HelloController extends BaseController {

  @Header({ "Content-Type": "text/html" })
  @Get()
  hello() {
    return "<h1>Hello</h1>";
  }

  @Header((rev) => {
    let type = rev.url.includes(".css") ? "text/css" : "text/plain";
    return { "Content-Type": type };
  })
  @Get()
  hello2() {
    return Deno.readFile('./path/to/file');
  }
}
...
```

### Type

@Type(contentType:string | (rev, next) => string).

```ts
...
@Controller("/hello")
class HelloController extends BaseController {

  @Type("html")
  @Get()
  hello() {
    return "<h1>Hello</h1>";
  }
}
...
```

### View

@View(source). requires [nhttp_view](https://github.com/nhttp/nhttp_view)

```ts
...
@Controller("/hello")
class HelloController extends BaseController {

  @View("index")
  @Get()
  hello() {

    // parameter
    return {
      name: "my_param"
    };
  }
}
...
```

### Middlewares

@Wares(...middlewares).

```ts
...
@Controller("/hello")
class HelloController extends BaseController {

  @Wares((rev, next) => {
    rev.foo = "foo";
    return next();
  })
  @Get()
  hello() {
    const { foo } = this.requestEvent;
    return foo;
  }
}
...
```

### Upload

@Upload(options).

Relation to [multipart](https://github.com/nhttp/nhttp#multipart)

```ts
...
@Controller("/hello")
class HelloController extends BaseController {

  @Upload({
    name: 'image',
    required: true,
    maxSize: '2mb'
  })
  @Post()
  hello() {
    const { body, file } = this.requestEvent;
    console.log(file)
    console.log(body)
    return 'Success upload';
  }
}
...
```

### Inject

@Inject(value: any, ...args: any).

```ts
...

class HelloService {

  async findAll() {
    const data = await db.findAll();
    return { data, status: 200 }; 
  }

  async save(body) {
    await db.save(body);
    return { message: 'success save', status: 201 }; 
  }
}

@Controller("/hello")
class HelloController extends BaseController {

  @Inject(HelloService)
  private readonly service!: HelloService;

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Status(201)
  @Post()
  save() {
    const { body } = this.requestEvent;
    return this.service.save(body);
  }
}
...
```

### addControllers

addControllers(classControllers: class[]).

```ts
...
app.use(addControllers([HelloController, OtherController]));
app.use('/api/v1', addControllers([HelloController, OtherController]));
app.use('/api/v1', middlewares, addControllers([HelloController, OtherController]));
...
```

## License

[MIT](LICENSE)
