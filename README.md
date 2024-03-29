<img src="https://github.com/NesCafe62/pozitron/assets/1944556/619901fd-f904-4f94-a508-635c7e0f4b59" width="140" height="140">

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

### `signal(initialValue, ?options: {?set: Function, ?name: String} = {})`
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

New value is compared by value (by reference for objects and arrays).
```js
let [a, setA] = signal({x: 1});
setA({x: 1}); // this will trigger dependencies update

let obj = {x: 1};
let [b, setB] = signal(obj);
setB(obj); // but this will not
```

Second arguemnt `options` has `set` parameter. Each time signal gets a new value, it is passed through that function
```js
let [a, setA] = signal(1, { set: (val) => val * 2 });
setA(2);
console.log(a()); // 4
```

Getter can be called with function as argument. This function is called immediately, signal's value is passed through that function.

It is useful for transforming the value
```js
let [a, setA] = signal({x: 1});
console.log(a(a => a.x)); // 1
```

Or when value is used multiple times useful for removing the cost of multiple function calls
```
let [selectedOption, setSelectedOption] = signal(undefined);
const value = () => (
    selectedOption((option) => option ? option.value : undefined)
);
/* same as doing:
const value = () => {
    let option = selectedOption();
    return option ? option.value : undefined;
}; */

console.log(value()); // undefined

setSelectedOption({value: 1});
console.log(value()); // 1
```



### `voidSignal(?name: String)`
Signal without a cached value. It notifies dependencies each time when gets triggered (in compare - signal notifies only when new value is not the same as previous). Other than that acts like a normal signal.

```js
let [s, notifyS] = voidSignal();

s(); // returns undefined, used to make reactive scope start tracking this signal
notifyS(); // trigger dependencies update
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



### `effect(callback, ?options: {?name: String} = {})`
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



### `subscribe(sources, callback, ?options: {?defer: Boolean, ?once: Boolean, ?name: String} = {})`

* `sources` - a single getter function or array of getters
* `defer` - skip running callback immediately
* `once` - remove subscription after first run (only applies when `defer` option is set)

Calls a function when source or sources are changed. More lightweight version of `effect` - dependencies created as static and not update on each run.

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
