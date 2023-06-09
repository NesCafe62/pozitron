# Pozitron
JavaScript lightweight reactivity lib inspired by Vue, $mol, SolidJS, Quarx.

No more virual DOM required. Fine-grained reactivity rocks.

[CodeSandbox demo](https://codesandbox.io/p/sandbox/pozitron-jsx-app-demo-7hfx7g)

Example Pozitron app built with vite and jxs - [Pozitron starter App](https://github.com/NesCafe62/vite-pozitron-starter)

## Features
* lazyness - calculate value only when it's accessed (supported by `memo`)
* caching - if none of sources were changed getter return cached value (supported by `memo`)
* autowiring - dependencies are re-collected with each calculation func run. means they can change. (allows if-s, branching) (supported by `memo`, `effect`)
* batch transactions - collect (stash) non-lazy updates during function call and update dependencies only once after batch finished (all dependencies that created with `effect`, `subscribe`)

## Usage

### `signal(initialValue, ?name: String)`
A source of changes propagation. State contains a single value.

Reactive state that can have multiple dependencies (subscribers).

```js
let [userName, setUserName] = signal('John');

setUserName('Alice'); // set userName
console.log(userName()); // get userName
```

When set to same value it does not trigger update of dependencies.
```js
let [x, setX] = signal(1);
setX(1); // dependencies will not be notified
```

New value is comparted by value (by reference for objects and arrays).
```js
let [a, setA] = signal({x: 1});
setA({x: 1}); // this will trigger dependencies update

let obj = {x: 1};
let [b, setB] = signal(obj);
setB(obj); // but this will not
```



### `memo(calcCallback, ?name: String)`
Reactive state that value depends on one or multiple reactive sources. Is similar to `signal` but calculated based on other reactive sources.

Also a source of changes propagation. State contains a single value.

Getter returns cached value, while dependencies stay unchanged since last calculation call.

`Autowiring`: yes

`Lazy`: yes. calculation callback will run only after getter function is accessed

```js
let [a, setA] = signal(1);
let [b, setB] = signal(2);

let c = memo(() => a() + b());
console.log(c()); // 3
```



### `effect(callback, ?options: {?once: Boolean, ?name: String} = {})`
Calls a function when any of sources changed.

Runs function single time when created to collect dependencies.

`Autowiring`: yes

`Lazy`: no
```js
let [a, setA] = signal(1);
let [b, setB] = signal(3);
effect(() => {
    console.log(`a = ${a()}, b = ${b()}`);
});
// will output: "a = 1, b = 3"

setA(2); // will output: "a = 2, b = 3"
setB(4); // will output: "a = 2, b = 4"
```



### `subscribe(sources, callback, ?options: {?once: Boolean, ?name: String} = {})`

* `sources` - a single getter function or array of getters

Calls a function when source changed. More lightweight version of `effect` but for single source.

`Autowiring`: no. use only if result depends on a single reactive source

`Lazy`: no
```js
let [a, setA] = signal(1);
subscribe(a, (value) => {
    console.log(`a = ${value}`);
});

setA(2); // will output: "a = 2"
```

Subscribe to multiple sources:
```js
let [a, setA] = signal(1);
let [b, setB] = signal(2);
subscribe([a, b], (valueA, valueB) => {
    console.log(`a = ${valueA}, b = ${valueB}`);
});
```



### `batch(callback)`
Calls a function. During the call collecting active (non-lazy) dependencies, instead of update dependencies immediately. After batch function finished it runs all collected updates.

This allow to avoid unnecessary calculations or multiple runs of effect (subscriber) when multiple sources are changed.
```js
let [a, setA] = signal(1);
let [b, setB] = signal(3);
let calls = 0;

let c = memo(() => {
    calls++;
    return a() + b();
});

effect(() => {
    console.log(`c = ${c()}`);
});

batch(() => {
    setA(2);
    setB(4);
});
// effect will be called only once at the end of batch and will output: "c = 6"
console.log(calls); // will output: "1"
```
