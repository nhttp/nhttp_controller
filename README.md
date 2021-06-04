## NHttp Controller
Micro routing controller for Deno with decorator support.
> limited to [nhttp](https://github.com/nhttp/nhttp) only.

## Installation
### deno.land
```ts
import { Get } from "https://deno.land/x/nhttp_controller@0.0.3/mod.ts";
```

### nest.land
```ts
// Well soon
// import { Get } from "https://x.nest.land/nhttp_controller@0.0.3/mod.ts";
```

## Usage
```ts
import { NHttp, RequestEvent } from "https://deno.land/x/nhttp/mod.ts";
import { 
    addControllers, 
    Controller, 
    Get,
    Post,
    Status 
} from "https://deno.land/x/nhttp_controller@0.0.3/mod.ts";

@Controller("/hello")
class HelloController {

    @Get()
    findAll() {
        return { name: 'john' };
    }

    @Get("/:id")
    findById({ params }: RequestEvent) {
        return params.id;
    }

    @Status(201)
    @Post()
    save({ body }: RequestEvent) {
        return body || 'body parser is required';
    }
}

const app = new NHttp();

app.use('/api', addControllers([HelloController]));

app.listen(3000);
```

## Decorator
### Controller
@Controller(path?: string).
```ts
...
@Controller("/hello")
class HelloController {...}
...
```

### Method
@METHOD(path?: string).
> Support => @Get, @Post, @Put, @Delete, @Patch, @Head, @Options, @Any, @Trace, @Connect.
```ts
...
@Controller("/hello")
class HelloController {

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
class HelloController {

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
class HelloController {

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
### Middlewares
@Wares(...middlewares).
```ts
...
@Controller("/hello")
class HelloController {

    @Wares((rev, next) => {
        rev.foo = "foo";
        next();
    })
    @Get()
    hello({ foo }: RequestEvent) {
        return foo;
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
class HelloController {

    @Inject(HelloService)
    private readonly service!: HelloService;

    @Get()
    findAll() {
        return this.service.findAll();
    }

    @Status(201)
    @Post()
    save({ body }: RequestEvent) {
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
app.use('/api/v1', middleware(), addControllers([HelloController, OtherController]));
...
```

## License

[MIT](LICENSE)